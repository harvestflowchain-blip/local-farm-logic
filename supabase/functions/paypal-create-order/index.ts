import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Server-side price table — NEVER trust client
const PRICES: Record<string, Record<string, number>> = {
  // Consumer plans (ZAR)
  plus:   { monthly: 49, quarterly: 132, yearly: 470 },
  family: { monthly: 99, quarterly: 267, yearly: 950 },
  // Farmer plans (ZAR)
  growth: { monthly: 149, quarterly: 402, yearly: 1430 },
  pro:    { monthly: 349, quarterly: 942, yearly: 3350 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // Get access token
    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenResp = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    // Create order
    const orderResp = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "ZAR", value: amount.toFixed(2) },
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
