import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    // Fetch user's recent interactions
    const { data: interactions } = await supabase
      .from("interactions")
      .select("product_id, interaction_type, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch all active products
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: products } = await adminClient
      .from("products")
      .select("id, name, category, price, description")
      .eq("is_active", true);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ product_ids: [], reasons: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no interactions, return random products
    if (!interactions || interactions.length === 0) {
      const shuffled = products.sort(() => 0.5 - Math.random()).slice(0, 4);
      return new Response(JSON.stringify({
        product_ids: shuffled.map(p => p.id),
        reasons: shuffled.map(p => `Fresh ${p.category || "produce"} from local farms`),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get viewed product names
    const viewedIds = [...new Set(interactions.map(i => i.product_id).filter(Boolean))];
    const viewedProducts = products.filter(p => viewedIds.includes(p.id));
    const viewedNames = viewedProducts.map(p => `${p.name} (${p.category || "uncategorized"})`).join(", ");

    const catalog = products.map(p => `- ID: ${p.id} | ${p.name} | ${p.category || "uncategorized"} | R${p.price}`).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a product recommendation engine for HarvestFlow, a farm produce marketplace in the Helderberg area. Recommend products the user would enjoy based on their browsing history."
          },
          {
            role: "user",
            content: `The user recently viewed: ${viewedNames}\n\nFull product catalog:\n${catalog}\n\nRecommend 4-6 products they might like (prefer products they haven't viewed yet, but can include viewed ones if highly relevant).`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_products",
            description: "Return recommended product IDs with short reasons",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      product_id: { type: "string" },
                      reason: { type: "string" }
                    },
                    required: ["product_id", "reason"],
                    additionalProperties: false
                  }
                }
              },
              required: ["recommendations"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "recommend_products" } }
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      // Fallback to random
      const shuffled = products.sort(() => 0.5 - Math.random()).slice(0, 4);
      return new Response(JSON.stringify({
        product_ids: shuffled.map(p => p.id),
        reasons: shuffled.map(p => `Fresh ${p.category || "produce"} from local farms`),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const recs = parsed.recommendations || [];
      // Filter to valid product IDs
      const validIds = new Set(products.map(p => p.id));
      const filtered = recs.filter((r: any) => validIds.has(r.product_id));
      return new Response(JSON.stringify({
        product_ids: filtered.map((r: any) => r.product_id),
        reasons: filtered.map((r: any) => r.reason),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fallback
    const shuffled = products.sort(() => 0.5 - Math.random()).slice(0, 4);
    return new Response(JSON.stringify({
      product_ids: shuffled.map(p => p.id),
      reasons: shuffled.map(p => `Fresh ${p.category || "produce"} from local farms`),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("recommend error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
