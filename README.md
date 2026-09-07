# Harvest AI

Phase 1: Foundation, Aesthetic & AI Core (Fine Art + Self-Learning Base)

Prompt 1:
"Build a mobile-first marketplace app called 'HarvestFlow Chain' using Supabase for backend auth, database, and basic AI extensions. Aesthetic: Fine Art Minimalist—clean white background, black sans-serif typography, edge-to-edge product cards in masonry grid like an art gallery, high-contrast black/white buttons.
User Roles: Signup as 'Farmer' (Vendor) or 'Customer' (Buyer), with location fields.
Database: 'Products' table (name, description, price_ZAR, stock_quantity, image_url, farmer_id). Display on home in grid.
AI Core: Add a 'Learning Module' in Supabase to log user interactions (e.g., views, carts) anonymously. It self-teaches by analyzing patterns (e.g., popular products) to auto-suggest improvements like personalized recommendations on home page."

Phase 2: Logistics & AI-Optimized Delivery (R0-Protected Calc + Compounding Efficiency)

Prompt 2:
"Add Cart/Checkout with distance-based delivery calc using Farmer/Customer locations. Fees: 0-5km = R35; 5-15km = R50; >15km = 'Unavailable'. Show Product Total, Delivery Fee, Grand Total.
Enhance AI: Module now learns from completed orders (e.g., average distances) to compound improvements—auto-adjust fees quarterly based on data (e.g., if >50% orders >15km, suggest expanding zones in dashboard). Ensure margin of safety with min fee floor."

Phase 3: Farmer Portal & AI Self-Improvement (Upload + Adaptive Orders)

Prompt 3:
"Add Farmer Dashboard (Farmer-role only): Product upload form (photo, price, desc); Order list (Customer name/address/items); Status toggle (Pending → Harvested → Ready).
AI Upgrade: Module teaches itself from order data to improve app—e.g., predict stock shortages and alert farmers; auto-refine UI (suggest simpler forms if upload abandonment >20%). Display AI suggestions in dashboard for quick approval."

Phase 4: Uber Integration & AI-Enhanced Receipts (Deep Link + Smart Records)

Prompt 4:
"Add Admin Logistics view: For paid orders, 'Book Courier' button deep-links to Uber/Maps with pre-filled Pickup (Farmer coords) and Drop-off (Customer coords). Generate printable PDF receipt.
AI Evolution: Learning module analyzes logistics data to self-improve—e.g., optimize routes over time (batch similar drops); compound value by suggesting fee reductions for efficient paths, building long-term moat."

Phase 5: Grant-Proof Analytics & Full AI Autonomy (Impact Dash + Continuous Growth)

Prompt 5:
"Add Admin Analytics tab: Total Kg Moved (from descs); Graph of Farmer Payouts vs. Platform Revenue; Map pins for Farmers/Customers in Helderberg.
AI Completion: Module now fully autonomous—teaches itself from all data to improve app holistically (e.g., A/B test UI changes, predict trends); auto-generates update prompts for Lovable.dev integration, ensuring exponential scaling with safety checks."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://local-farm-logic.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f249aaab-73c9-4708-a4b1-2aee56e67caf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
