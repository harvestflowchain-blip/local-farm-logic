import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function randomFallback(products: any[]) {
  const shuffled = [...products].sort(() => 0.5 - Math.random()).slice(0, 4);
  return {
    product_ids: shuffled.map((p) => p.id),
    reasons: shuffled.map((p) => `Fresh ${p.category || "produce"} from local farms`),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const hasBearer = !!authHeader && authHeader.startsWith("Bearer ");
    console.log(`[recommend-products] auth header present: ${hasBearer}`);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let userId: string | null = null;

    if (hasBearer) {
      const token = authHeader!.replace("Bearer ", "");
      const verifyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: claimsData, error: claimsError } = await verifyClient.auth.getClaims(token);

      if (claimsError || !claimsData?.claims?.sub) {
        console.error("[recommend-products] getClaims failed:", claimsError?.message ?? "no sub");
        return new Response(
          JSON.stringify({ error: "Invalid or expired token. Please sign in again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      userId = claimsData.claims.sub as string;
      console.log(`[recommend-products] authenticated sub: ${userId}`);
    } else {
      console.log("[recommend-products] anonymous request — returning non-personalized recs");
    }

    // Fetch active products (service role: works for both auth + anon paths)
    const { data: products } = await adminClient
      .from("products")
      .select("id, name, category, price, description")
      .eq("is_active", true);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ product_ids: [], reasons: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anonymous path → random non-personalized recommendations
    if (!userId) {
      return new Response(JSON.stringify(randomFallback(products)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated path — fetch recent interactions via user-scoped client (RLS)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: interactions, error: interactionsError } = await userClient
      .from("interactions")
      .select("product_id, interaction_type, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (interactionsError) {
      console.error("[recommend-products] interactions query error:", interactionsError.message);
    }
    console.log(`[recommend-products] interactions fetched: ${interactions?.length ?? 0}`);

    if (!interactions || interactions.length === 0) {
      return new Response(JSON.stringify(randomFallback(products)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const viewedIds = [...new Set(interactions.map((i) => i.product_id).filter(Boolean))];
    const viewedProducts = products.filter((p) => viewedIds.includes(p.id));
    const viewedNames = viewedProducts
      .map((p) => `${p.name} (${p.category || "uncategorized"})`)
      .join(", ");

    const catalog = products
      .map((p) => `- ID: ${p.id} | ${p.name} | ${p.category || "uncategorized"} | R${p.price}`)
      .join("\n");

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
            content:
              "You are a product recommendation engine for HarvestFlow, a farm produce marketplace in the Helderberg area. Recommend products the user would enjoy based on their browsing history.",
          },
          {
            role: "user",
            content: `The user recently viewed: ${viewedNames}\n\nFull product catalog:\n${catalog}\n\nRecommend 4-6 products they might like (prefer products they haven't viewed yet, but can include viewed ones if highly relevant).`,
          },
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
                      reason: { type: "string" },
                    },
                    required: ["product_id", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recommend_products" } },
      }),
    });

    if (!response.ok) {
      console.error("[recommend-products] AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify(randomFallback(products)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const recs = parsed.recommendations || [];
      const validIds = new Set(products.map((p) => p.id));
      const filtered = recs.filter((r: any) => validIds.has(r.product_id));
      console.log(`[recommend-products] AI returned ${filtered.length} valid recs`);
      return new Response(
        JSON.stringify({
          product_ids: filtered.map((r: any) => r.product_id),
          reasons: filtered.map((r: any) => r.reason),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(randomFallback(products)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[recommend-products] uncaught error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
