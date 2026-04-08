
-- 1. Drop the overly broad storage INSERT policy
DROP POLICY IF EXISTS "Farmers can upload product images" ON storage.objects;

-- 2. Add WITH CHECK to farmer order update policy for defense-in-depth
DROP POLICY IF EXISTS "Farmers can update order status" ON public.orders;
CREATE POLICY "Farmers can update order status" ON public.orders
  FOR UPDATE
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);

-- 3. Fix storage upload ownership: drop and recreate with path check
DROP POLICY IF EXISTS "Farmer upload product images" ON storage.objects;
CREATE POLICY "Farmer upload product images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND has_role(auth.uid(), 'farmer'::app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Farmer update product images" ON storage.objects;
CREATE POLICY "Farmer update product images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND has_role(auth.uid(), 'farmer'::app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
