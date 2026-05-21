
-- Tighten orders INSERT: customer is self AND farmer_id is a real farmer
DROP POLICY IF EXISTS "Customers can insert orders" ON public.orders;
CREATE POLICY "Customers can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.uid() = customer_id
  AND public.has_role(farmer_id, 'farmer'::app_role)
);

-- Tighten orders UPDATE: require farmer role
DROP POLICY IF EXISTS "Farmers can update order status" ON public.orders;
CREATE POLICY "Farmers can update order status"
ON public.orders
FOR UPDATE
USING (auth.uid() = farmer_id AND public.has_role(auth.uid(), 'farmer'::app_role))
WITH CHECK (auth.uid() = farmer_id AND public.has_role(auth.uid(), 'farmer'::app_role));

-- Remove redundant storage UPDATE policy without role check
DROP POLICY IF EXISTS "Farmers can update own product images" ON storage.objects;
