

# AI-Powered Recommendations and Chatbot

## What We're Building

### 1. AI Product Recommendations
A "Recommended for You" section on the home page that uses the customer's browsing history (stored in the `interactions` table) to suggest relevant products. An edge function queries the user's recent views and asks the AI to pick the best matches from available products.

### 2. AI Chatbot
A floating chat bubble on all pages where customers can ask questions about produce, get help finding products, or learn about farming practices. The chatbot has context about the product catalog and can link users to specific products.

---

## Technical Details

### New Files

1. **`supabase/functions/recommend-products/index.ts`**
   - Receives user ID, fetches their recent interactions (last 20 views) and all active products
   - Sends product catalog + browsing history to Lovable AI (google/gemini-3-flash-preview)
   - Uses tool calling to return structured output: array of product IDs with reasoning
   - Returns top 4-6 recommended product IDs with explanations

2. **`supabase/functions/chat/index.ts`**
   - Streaming chat endpoint using Lovable AI
   - System prompt includes: HarvestFlow context (Helderberg farm marketplace), product categories, and instructions to help customers find produce
   - Fetches current active products to include as context so the AI can reference real items
   - Streams responses back via SSE

3. **`src/components/RecommendedProducts.tsx`**
   - Displayed on the home page below the product grid
   - Calls `recommend-products` edge function on mount (only for logged-in users)
   - Shows a horizontal scrollable row of ProductCard components
   - Loading skeleton state while AI processes
   - Hidden if user has no browsing history or is not logged in

4. **`src/components/ChatBot.tsx`**
   - Floating chat button (bottom-right, above the bottom nav)
   - Expandable chat panel with message history
   - Text input with send button
   - Streams AI responses token-by-token
   - Pre-filled welcome message: "Hi! I can help you find fresh produce from local Helderberg farms. What are you looking for?"
   - Links to products when the AI mentions them

5. **`src/hooks/useChat.ts`**
   - Manages chat state: messages array, loading state, streaming logic
   - SSE parsing and token-by-token rendering
   - Sends full conversation history with each request

### Modified Files

1. **`src/pages/Index.tsx`**
   - Add `RecommendedProducts` component between header and main product grid

2. **`src/App.tsx`**
   - Add `ChatBot` component alongside `BottomNav` so it appears on all pages

3. **`supabase/config.toml`**
   - Add function entries for `recommend-products` and `chat` with `verify_jwt = false`

### Edge Function: recommend-products

- Fetches user's interactions (type='view') from last 7 days
- Fetches all active products with their categories
- Constructs a prompt: "Given this user viewed [product names/categories], recommend the best products from this catalog"
- Uses tool calling to extract structured `{ product_ids: string[], reasons: string[] }`
- Falls back to popular/recent products if user has no history

### Edge Function: chat

- Streaming SSE endpoint
- System prompt includes HarvestFlow marketplace context, product categories, suburb list, and instructions to be helpful about farm produce
- Fetches active products on each request to include current catalog as context
- Handles 429/402 rate limit errors with friendly messages

### Chatbot UI Details

- Floating button: fixed position, bottom-right corner, 16px above the bottom nav bar
- Chat panel: slides up, max height 70vh, with message list and input
- Messages styled differently for user (right-aligned, primary color) vs assistant (left-aligned, muted)
- Close button to collapse back to the floating button
- Responsive: full-width on mobile, max-width 400px on larger screens

### Recommendation Display

- Section title: "Picked for You" with a sparkle icon
- Horizontal scroll row of 4-6 product cards (reusing existing ProductCard component)
- Skeleton loading state with 4 placeholder cards
- Only shown when user is logged in and has browsing history
- Gracefully hidden on error or empty results
