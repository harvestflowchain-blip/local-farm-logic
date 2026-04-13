CREATE POLICY "Admins can view all order items"
  ON public.order_items
  FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));