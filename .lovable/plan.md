

# Phase 2 + 3: Checkout, Delivery, Payments & Farmer Dashboard

## Phase 2: Checkout with Delivery Calculator and Payments

### 2A. Checkout Page (`src/pages/Checkout.tsx`)
- Fetch cart items with product details (including farmer suburb from profiles)
- **Delivery address section**: Suburb dropdown (from `HELDERBERG_SUBURBS`) + optional manual address text field
- **Distance calculation**: Use `SUBURB_COORDS` from `constants.ts` to compute straight-line distance between customer's selected suburb and each farmer's suburb. Apply fee tiers: 0-5km = R35, 5-15km = R50, >15km = "Unavailable"
- **Order summary**: Product subtotal, delivery fee breakdown per farmer, grand total
- **Payment method selector**: Choose between PayFast or Yoco
- On "Pay Now", create order(s) in the database grouped by farmer, then redirect to payment gateway

### 2B. Payment Edge Functions
- **`supabase/functions/payfast-payment/index.ts`**: Creates a PayFast payment form redirect with order details, amount, return/cancel/notify URLs
- **`supabase/functions/yoco-payment/index.ts`**: Creates a Yoco checkout session via their API and returns the redirect URL
- **`supabase/functions/payment-webhook/index.ts`**: Receives payment confirmations from either gateway, validates signature, updates order status to "confirmed", clears cart items
- Secrets needed: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `YOCO_SECRET_KEY`

### 2C. Database Changes
- Add `payment_method` column to `orders` table (text, nullable)
- Add `payment_reference` column to `orders` table (text, nullable)
- Add unique constraint on `cart_items(user_id, product_id)` to support upsert in addToCart

### 2D. Cart Page Update
- Update Cart page to show delivery suburb selector inline if profile suburb not set
- Pass delivery info to checkout

---

## Phase 3: Farmer Dashboard

### 3A. Product Management (`src/pages/FarmerDashboard.tsx`)
Full rewrite with tabbed layout:
- **Products tab**: List farmer's own products (active + inactive) with edit/delete. "Add Product" button opens a form
- **Orders tab**: Incoming orders with customer details, items, and status toggle

### 3B. Product Upload Form (`src/components/farmer/ProductForm.tsx`)
- Fields: Name, Description, Price (ZAR), Category (dropdown from `PRODUCT_CATEGORIES`), Stock Quantity, Weight (kg), Photo upload
- Photo uploads to `product-images` storage bucket
- Creates/updates product in `products` table with `farmer_id` set to current user

### 3C. Order Management (`src/components/farmer/OrderList.tsx`)
- Fetches orders where `farmer_id = current user`
- Shows customer name (from profiles join), delivery suburb, items with quantities
- Status toggle buttons: Placed -> Harvested -> Ready for Pickup
- Updates `orders.status` via Supabase client

### 3D. Supporting Components
- `src/components/farmer/ProductList.tsx` - grid of farmer's products with edit/delete actions
- `src/components/farmer/OrderCard.tsx` - individual order card with status controls

---

## Technical Details

### New files to create:
1. `supabase/functions/payfast-payment/index.ts`
2. `supabase/functions/yoco-payment/index.ts`
3. `supabase/functions/payment-webhook/index.ts`
4. `src/components/farmer/ProductForm.tsx`
5. `src/components/farmer/ProductList.tsx`
6. `src/components/farmer/OrderList.tsx`
7. `src/components/farmer/OrderCard.tsx`
8. `src/components/checkout/DeliveryCalculator.tsx`
9. `src/components/checkout/OrderSummary.tsx`
10. `src/components/checkout/PaymentSelector.tsx`
11. `src/lib/delivery.ts` - distance calculation helper

### Files to modify:
1. `src/pages/Checkout.tsx` - full rebuild
2. `src/pages/FarmerDashboard.tsx` - full rebuild
3. `supabase/config.toml` - add edge function configs with `verify_jwt = false`

### Database migration:
```sql
ALTER TABLE orders ADD COLUMN payment_method text;
ALTER TABLE orders ADD COLUMN payment_reference text;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_product_unique UNIQUE (user_id, product_id);
```

### Secrets required (will prompt before proceeding):
- `PAYFAST_MERCHANT_ID` - from PayFast merchant dashboard
- `PAYFAST_MERCHANT_KEY` - from PayFast merchant dashboard
- `PAYFAST_PASSPHRASE` - from PayFast settings
- `YOCO_SECRET_KEY` - from Yoco developer portal

### Delivery calculation logic (`src/lib/delivery.ts`):
- Haversine formula to compute distance between two suburb coordinates
- Returns fee tier based on distance thresholds from `DELIVERY_FEES` constant
- Groups cart items by farmer and calculates per-farmer delivery fee

### Order creation flow:
1. Customer selects delivery suburb + enters address
2. System calculates delivery fees per farmer
3. Customer selects payment method (PayFast or Yoco)
4. On "Pay Now": creates order records per farmer with status "placed"
5. Redirects to payment gateway
6. Webhook confirms payment, updates status to "confirmed"
7. Cart items cleared

### Farmer order status flow:
Placed -> Harvested -> Ready for Pickup (farmer toggles each step)

