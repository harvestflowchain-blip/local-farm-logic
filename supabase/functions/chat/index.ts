import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active products for context
    const { data: products } = await adminClient
      .from("products")
      .select("id, name, category, price, description, stock_quantity")
      .eq("is_active", true);

    // Fetch recent orders count
    const { count: orderCount } = await adminClient
      .from("orders")
      .select("*", { count: "exact", head: true });

    // Fetch stats
    const { count: userCount } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const catalog = (products || [])
      .map(p => `- ${p.name} (${p.category || "uncategorized"}) — R${p.price}, stock: ${p.stock_quantity}${p.description ? ": " + p.description : ""}`)
      .join("\n");

    const lastUpdated = new Date().toISOString();

    const systemPrompt = `You are a friendly assistant for HarvestFlow, a fresh produce marketplace connecting customers with local farms in the Helderberg area (Somerset West, Strand, Gordon's Bay, Stellenbosch).

Your role:
- Help customers find fresh produce and answer questions about farming, seasonal availability, and recipes
- Be warm, knowledgeable, and concise
- When recommending products, mention them by name and price
- Keep responses short (2-4 sentences usually)
- IMPORTANT: Only answer based on the data provided below. Do NOT hallucinate or make up data.
- If you don't have data to answer a question, say: "I don't have fresh data on that right now. Last updated: ${lastUpdated}"

Platform stats (last updated: ${lastUpdated}):
- Total users: ${userCount || 0}
- Total orders: ${orderCount || 0}
- Active products: ${(products || []).length}

Current product catalog:
${catalog || "No products currently listed."}

If asked about delivery, mention we deliver to Helderberg suburbs with fees of R35-R50 depending on distance, max 15km radius.
If asked about "network health" or platform status, report the stats above and say the platform is operational.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm a bit busy right now. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
