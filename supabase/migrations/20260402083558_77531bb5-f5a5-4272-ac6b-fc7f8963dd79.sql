
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
