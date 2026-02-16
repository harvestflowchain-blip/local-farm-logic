

# Phase 2 + 3 Implementation (Skipping Payment Secrets)

## What We're Building

### Phase 2: Checkout with Delivery Calculator
- Full checkout page with delivery suburb selection and address input
- Haversine distance calculator to determine delivery fees per farmer
- Order summary with subtotal, per-farmer delivery fees, and grand total
- Payment method selector (PayFast / Yoco) -- UI only, with a "Coming Soon" state since keys aren't configured yet
- Order creation in database on "Place Order" (without live payment redirect for now)
- Cart clearing after successful order placement

### Phase 3: Farmer Dashboard
- Tabbed layout: **Products** | **Orders**
- Product upload form with image upload to storage, all fields (name, description, price, category, stock, weight)
- Product list with edit and delete functionality
- Incoming orders list with customer details
- Status toggle: Placed -> Harvested -> Ready for Pickup

---

## Technical Details

### New Files

1. **`src/lib/delivery.ts`** -- Haversine distance function + fee calculator. Takes customer suburb and farmer suburb, returns distance in km and applicable fee (R35 / R50 / unavailable).

2. **`src/components/checkout/DeliveryCalculator.tsx`** -- Suburb dropdown + address input. Displays per-farmer delivery fees. Shows "Delivery unavailable" if >15km.

3. **`src/components/checkout/OrderSummary.tsx`** -- Itemized breakdown: products grouped by farmer, subtotals, delivery fees, grand total.

4. **`src/components/checkout/PaymentSelector.tsx`** -- Radio buttons for PayFast / Yoco. Both show as selectable but payment redirect is deferred (order placed with status "placed", payment marked as "pending").

5. **`src/components/farmer/ProductForm.tsx`** -- Dialog/sheet form for creating and editing products. Image upload to `product-images` bucket. Fields: name, description, price, category (dropdown), stock quantity, weight (kg).

6. **`src/components/farmer/ProductList.tsx`** -- Grid of farmer's own products. Edit button opens ProductForm pre-filled. Delete button with confirmation. Toggle active/inactive.

7. **`src/components/farmer/OrderCard.tsx`** -- Single order card showing customer name, suburb, items, total, and status badge with "Next Status" button.

8. **`src/components/farmer/OrderList.tsx`** -- Fetches and displays all orders for the current farmer. Groups by status.

### Modified Files

1. **`src/pages/Checkout.tsx`** -- Full rebuild. Fetches cart items with product + farmer profile data. Composes DeliveryCalculator, OrderSummary, and PaymentSelector. Creates orders grouped by farmer on submit.

2. **`src/pages/FarmerDashboard.tsx`** -- Full rebuild with Tabs component. Products tab shows ProductList + "Add Product" button. Orders tab shows OrderList.

### Order Creation Flow (without live payment)
1. Customer selects delivery suburb and enters address
2. System calculates per-farmer delivery fees using Haversine formula
3. Customer selects payment method (recorded but not charged)
4. "Place Order" creates one order per farmer in the `orders` table with status "placed"
5. Order items inserted into `order_items` table
6. Cart items deleted
7. User redirected to a confirmation message

### Farmer Status Flow
- Each order card shows current status and a button to advance:
  - "placed" -> button: "Mark Harvested"
  - "harvested" -> button: "Mark Ready for Pickup"
  - "ready" -> no further action (awaiting delivery/collection)

### Storage Integration
- Product images uploaded to `product-images` bucket
- Public URLs generated for display
- Old image deleted on replacement during edit
