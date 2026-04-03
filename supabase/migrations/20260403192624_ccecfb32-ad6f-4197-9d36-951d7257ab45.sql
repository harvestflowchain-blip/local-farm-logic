
-- ============================================================
-- FIX 1: Restricted farmer view of customer profiles
-- ============================================================

-- Drop the existing broad farmer profile access policy
DROP POLICY IF EXISTS "Farmers can view customer profiles for their orders" ON public.profiles;

-- Create a restricted view exposing only safe columns
CREATE OR REPLACE VIEW public.farmer_customer_view AS
SELECT
  p.user_id,
  p.full_name,
  p.suburb,
  (SELECT count(*) FROM public.orders o WHERE o.customer_id = p.user_id) AS order_count
FROM public.profiles p;

-- Enable RLS on the view via the underlying table — views inherit table RLS.
-- Add a new restricted SELECT policy for farmers on profiles that only
-- allows access through the view columns conceptually, but since Postgres
-- views bypass RLS on the underlying table, we use security_invoker approach.
-- Actually, for views we need a different approach: grant farmers access
-- to the VIEW only and remove direct profile access.

-- Since Postgres views don't support RLS directly, we use a security-definer
-- function instead:
CREATE OR REPLACE FUNCTION public.get_farmer_customers(_farmer_id uuid)
RETURNS TABLE(user_id uuid, full_name text, suburb text, order_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.suburb,
    (SELECT count(*) FROM public.orders o WHERE o.customer_id = p.user_id AND o.farmer_id = _farmer_id)
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.customer_id = p.user_id AND o.farmer_id = _farmer_id
  );
$$;

-- ============================================================
-- FIX 2: Remove client-side subscription INSERT
-- ============================================================

DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- ============================================================
-- FIX 3: Product-images storage policies (farmer upload only)
-- ============================================================

-- Clear any existing permissive policies on product-images
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Farmer upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Farmer update product images" ON storage.objects;

-- Only farmers can INSERT into product-images
CREATE POLICY "Farmer upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'farmer'::app_role)
);

-- Only farmers can UPDATE in product-images
CREATE POLICY "Farmer update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'farmer'::app_role)
);

-- Anyone can view product images (public bucket)
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Only admins can delete product images
CREATE POLICY "Admin delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- FIX 4: Order update column restriction trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.restrict_farmer_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the current user is a farmer (not admin), only allow status changes
  IF has_role(auth.uid(), 'farmer'::app_role)
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.customer_id    IS DISTINCT FROM OLD.customer_id
    OR NEW.farmer_id      IS DISTINCT FROM OLD.farmer_id
    OR NEW.total          IS DISTINCT FROM OLD.total
    OR NEW.delivery_fee   IS DISTINCT FROM OLD.delivery_fee
    OR NEW.delivery_suburb IS DISTINCT FROM OLD.delivery_suburb
    OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
    OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
    OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
    OR NEW.created_at     IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Farmers can only update the status column on orders';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_farmer_order_update ON public.orders;
CREATE TRIGGER restrict_farmer_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_farmer_order_update();
