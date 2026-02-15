

# HarvestFlow Chain — Full Implementation Plan

## Overview
A mobile-first marketplace connecting Helderberg-area farmers directly with customers. Fine Art Minimalist aesthetic (white backgrounds, black typography, gallery-style masonry grid). Built with Lovable Cloud (Supabase) for auth, database, storage, edge functions, and AI.

---

## Phase 1: Foundation & Aesthetic

### Authentication & Roles
- Sign up / Sign in with email (Farmer or Customer role selection)
- Profiles table with name, location fields, phone number
- Roles table (farmer/customer) with RLS policies
- Location captured via suburb dropdown (Helderberg areas: Somerset West, Strand, Gordon's Bay, etc.) + optional manual address

### Product Database & Home Page
- Products table: name, description, price (ZAR), stock quantity, image URL, farmer ID, category
- Supabase Storage bucket for product images
- **Home page**: Masonry grid layout displaying products like an art gallery — edge-to-edge cards, clean white space, high-contrast black/white buttons
- Product detail page with farmer info

### Interaction Logging (AI Foundation)
- Log anonymous user interactions (product views, cart adds) to an `interactions` table
- This data feeds recommendations in later phases

### App Shell & Navigation
- Scaffold all routes: Home, Cart, Checkout, Farmer Dashboard, Admin Dashboard, Analytics
- Bottom navigation bar (mobile-first)
- Role-based route protection

---

## Phase 2: Cart, Checkout & Delivery

### Shopping Cart
- Add/remove products, quantity selection
- Persistent cart (database-backed for logged-in users)

### Distance-Based Delivery Calculator
- Pre-defined Helderberg suburb coordinates lookup
- Fee tiers: 0–5km = R35, 5–15km = R50, >15km = "Unavailable"
- Checkout summary: Product Total + Delivery Fee = Grand Total

### Payment Integration
- PayFast and Yoco integration via edge functions
- Order creation on successful payment
- Order status tracking (Placed → Confirmed → Ready → Delivered)

### AI Enhancement: Smart Delivery Insights
- Edge function analyzes completed orders to surface delivery zone stats
- Dashboard widget showing delivery fee distribution and zone suggestions

---

## Phase 3: Farmer Portal

### Farmer Dashboard (Farmer-only)
- Product upload form with photo upload, price, description, category
- My Products list with edit/delete
- Incoming orders list with customer name, address, items
- Status toggle: Pending → Harvested → Ready for Pickup

### AI: Stock & Upload Intelligence
- Edge function using Lovable AI to predict low-stock alerts based on order velocity
- Track form abandonment; surface AI suggestions (e.g., "simplify your description") in dashboard notification panel
- Farmers can approve/dismiss suggestions

---

## Phase 4: Logistics & Receipts

### Courier Booking
- Admin view of paid orders needing delivery
- "Book Courier" button deep-links to Uber app / Google Maps with pre-filled pickup (farmer) and dropoff (customer) coordinates
- Order status updates

### PDF Receipts
- Auto-generate printable PDF receipt for each completed order
- Include items, quantities, prices, delivery fee, total, farmer & customer details

### AI: Route Optimization Suggestions
- Analyze logistics data via Lovable AI to suggest batching nearby deliveries
- Surface fee reduction suggestions for efficient routes in admin dashboard

---

## Phase 5: Analytics & AI Autonomy

### Admin Analytics Dashboard
- Total kilograms moved (parsed from product descriptions/weights)
- Farmer payouts vs. platform revenue chart (using Recharts)
- Map view with pins for farmers and customers in Helderberg area
- Order volume trends over time

### AI: Trend Prediction & Recommendations
- Lovable AI-powered edge function analyzes all platform data to:
  - Generate trending product recommendations on the home page
  - Predict seasonal demand trends
  - Suggest platform improvements (displayed as actionable cards in admin dashboard)
- AI-generated weekly summary reports

---

## Design System
- **Background**: Pure white (#FFFFFF)
- **Typography**: Black sans-serif, clean hierarchy
- **Cards**: Edge-to-edge masonry grid, minimal borders, subtle shadows
- **Buttons**: High-contrast black/white with sharp corners
- **Mobile-first**: All layouts optimized for phone screens, responsive to desktop

