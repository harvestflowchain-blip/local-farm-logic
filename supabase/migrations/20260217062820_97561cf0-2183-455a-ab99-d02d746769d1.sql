-- Allow farmers to view profiles of customers who have placed orders with them
CREATE POLICY "Farmers can view customer profiles for their orders"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.customer_id = profiles.user_id
      AND orders.farmer_id = auth.uid()
  )
);
