import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Server-side price table in USD
const PRICES: Record<string, Record<string, number>> = {
  plus:   { monthly: 2.99, quarterly: 7.99, yearly: 27.99 },
  family: { monthly: 5.99, quarterly: 15.99, yearly: 56.99 },
  growth: { monthly: 8.99, quarterly: 23.99, yearly: 84.99 },
  pro:    { monthly: 20.99, quarterly: 56.99, yearly: 199.99 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan, period } = await req.json();

    const planPrices = PRICES[plan];
    if (!planPrices || !planPrices[period]) {
      return new Response(JSON.stringify({ error: "Invalid plan or period" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = planPrices[period];
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
    const tokenText = await tokenResp.text();
    if (!tokenResp.ok) {
      console.error("PayPal auth failed:", tokenResp.status, tokenText);
      return new Response(JSON.stringify({ error: "PayPal auth failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tokenData = JSON.parse(tokenText);
    const accessToken = tokenData.access_token;

    const orderResp = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: amount.toFixed(2) },
          description: `HarvestFlow ${plan} plan - ${period}`,
        }],
      }),
    });

    if (!orderResp.ok) {
      const t = await orderResp.text();
      console.error("PayPal create order error:", orderResp.status, t);
      return new Response(JSON.stringify({ error: "Failed to create PayPal order" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderData = await orderResp.json();

    // Record server-side mapping so capture cannot be tricked into wrong plan/period
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error: insertError } = await adminClient
      .from("pending_subscription_orders")
      .insert({
        paypal_order_id: orderData.id,
        user_id: user.id,
        plan,
        period,
        amount,
      });
    if (insertError) {
      console.error("Failed to record pending order:", insertError);
      return new Response(JSON.stringify({ error: "Failed to record order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: orderData.id, amount, plan, period }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paypal-create-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
