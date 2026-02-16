
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;

-- Unique constraint for cart upsert
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_product_unique UNIQUE (user_id, product_id);
