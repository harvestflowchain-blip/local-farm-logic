import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DELIVERY_KM = 15.0;

// Somerset West baseline
const DEFAULT_ORIGIN = { lat: -34.0826, lng: 18.8431 };

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authentication to prevent cache poisoning and Nominatim abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { suburb, farmerSuburb } = await req.json();
    if (!suburb || typeof suburb !== "string" || suburb.length > 100) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid suburb" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lookup coords from geocode_cache
    const suburbs = [suburb, farmerSuburb || "Somerset West"];
    const { data: coords } = await adminClient
      .from("geocode_cache")
      .select("query, lat, lon")
      .in("query", suburbs);

    const coordMap: Record<string, { lat: number; lon: number }> = {};
    (coords || []).forEach((c: any) => { coordMap[c.query] = { lat: c.lat, lon: c.lon }; });

    const customerCoord = coordMap[suburb];
    const farmerCoord = coordMap[farmerSuburb || "Somerset West"] || { lat: DEFAULT_ORIGIN.lat, lon: DEFAULT_ORIGIN.lng };

    if (!customerCoord) {
      // Try Nominatim as fallback
      try {
        const nomResp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(suburb + ", Western Cape, South Africa")}&format=json&limit=1`,
          { headers: { "User-Agent": "HarvestFlowChain/1.0" } }
        );
        const nomData = await nomResp.json();
        if (nomData && nomData.length > 0) {
          const lat = parseFloat(nomData[0].lat);
          const lon = parseFloat(nomData[0].lon);
          // Cache it
          await adminClient.from("geocode_cache").upsert({ query: suburb, lat, lon, updated_at: new Date().toISOString() });
          const dist = haversine(lat, lon, farmerCoord.lat, farmerCoord.lon);
          return new Response(JSON.stringify({
            valid: dist <= MAX_DELIVERY_KM,
            distanceKm: Math.round(dist * 10) / 10,
            maxKm: MAX_DELIVERY_KM,
            error: dist > MAX_DELIVERY_KM ? "Delivery unavailable beyond 15km" : null,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.error("Nominatim fallback error:", e);
      }

      return new Response(JSON.stringify({ valid: false, error: "Unable to validate suburb" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dist = haversine(customerCoord.lat, customerCoord.lon, farmerCoord.lat, farmerCoord.lon);

    return new Response(JSON.stringify({
      valid: dist <= MAX_DELIVERY_KM,
      distanceKm: Math.round(dist * 10) / 10,
      maxKm: MAX_DELIVERY_KM,
      fee: dist <= 5 ? 35 : dist <= 15 ? 50 : null,
      error: dist > MAX_DELIVERY_KM ? "Delivery unavailable beyond 15km" : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("validate-delivery error:", e);
    return new Response(JSON.stringify({ valid: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
