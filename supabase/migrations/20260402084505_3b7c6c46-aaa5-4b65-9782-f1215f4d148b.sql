
-- Drop the permissive insert policy
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;

-- Replace with a restricted version that prevents admin self-assignment
CREATE POLICY "Users can insert own role on signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('customer'::app_role, 'farmer'::app_role)
  );
