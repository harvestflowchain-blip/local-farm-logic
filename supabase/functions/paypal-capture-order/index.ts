import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERIOD_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SECURITY: read plan/period/amount from server-side pending order,
    // never trust client-supplied values
    const { data: pending, error: pendingError } = await adminClient
      .from("pending_subscription_orders")
      .select("user_id, plan, period, amount")
      .eq("paypal_order_id", orderId)
      .maybeSingle();
    if (pendingError || !pending) {
      console.error("Pending order lookup failed:", pendingError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pending.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const plan = pending.plan;
    const period = pending.period;
    const expectedAmount = Number(pending.amount);

    // Capture PayPal order
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "PayPal not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenResp = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenResp.json();

    const captureResp = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!captureResp.ok) {
      const t = await captureResp.text();
      console.error("PayPal capture error:", captureResp.status, t);
      return new Response(JSON.stringify({ error: "Payment capture failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const captureData = await captureResp.json();
    if (captureData.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify captured amount matches expected price for this plan/period
    const capturedAmountStr =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ??
      captureData?.purchase_units?.[0]?.amount?.value;
    const capturedAmount = Number(capturedAmountStr);
    if (!Number.isFinite(capturedAmount) || Math.abs(capturedAmount - expectedAmount) > 0.01) {
      console.error("Amount mismatch", { capturedAmount, expectedAmount, plan, period });
      return new Response(JSON.stringify({ error: "Payment amount mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const days = PERIOD_DAYS[period] || 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await adminClient.from("subscriptions").delete().eq("user_id", userId);
    const { error: subError } = await adminClient.from("subscriptions").insert({
      user_id: userId,
      plan,
      status: "active",
      payment_provider: "paypal",
      payment_reference: orderId,
      expires_at: expiresAt,
    });

    if (subError) {
      console.error("Subscription upsert error:", subError);
      return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cleanup pending mapping
    await adminClient.from("pending_subscription_orders").delete().eq("paypal_order_id", orderId);

    return new Response(JSON.stringify({ success: true, plan, period, expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paypal-capture-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
