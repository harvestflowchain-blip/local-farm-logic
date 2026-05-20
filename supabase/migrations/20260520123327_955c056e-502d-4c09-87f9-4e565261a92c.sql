
DROP POLICY IF EXISTS "Farmers can delete own product images" ON storage.objects;

CREATE POLICY "Users can view own pending subscription orders"
ON public.pending_subscription_orders
FOR SELECT
USING (auth.uid() = user_id);
