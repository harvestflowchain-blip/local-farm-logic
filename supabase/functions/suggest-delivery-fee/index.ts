import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { distanceKm, currentFee, orderTotal, minFee = 25, maxFee = 75 } = await req.json();

    if (!distanceKm || distanceKm <= 0) {
      return new Response(JSON.stringify({ error: "Invalid distance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard 15km limit enforcement (server-side)
    if (distanceKm > 15) {
      return new Response(JSON.stringify({ 
        error: "Delivery unavailable beyond 15km",
        unavailable: true,
        distanceKm 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rule-based baseline
    const baseFee = 20;
    const perKm = 3;
    let suggestedFee = baseFee + perKm * distanceKm;

    // Time-based adjustment
    const hour = new Date().getHours();
    const isPeakHour = hour >= 16 && hour <= 19;
    if (isPeakHour) {
      suggestedFee *= 1.1; // 10% peak surcharge
    }

    // Order size adjustment: small orders get slightly higher fee
    if (orderTotal && orderTotal < 100) {
      suggestedFee += 5;
    }

    // Bound the fee
    suggestedFee = Math.max(minFee, Math.min(maxFee, Math.round(suggestedFee)));

    let reason = `Based on ${distanceKm.toFixed(1)}km distance`;
    if (isPeakHour) reason += " + peak hour adjustment";
    if (orderTotal && orderTotal < 100) reason += " + small order surcharge";

    return new Response(JSON.stringify({ fee: suggestedFee, reason, distanceKm }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to calculate fee" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
