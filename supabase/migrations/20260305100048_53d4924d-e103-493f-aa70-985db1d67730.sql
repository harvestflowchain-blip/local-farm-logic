-- Allow users to update their own role (consumer <-> farmer only, not admin)
CREATE POLICY "Users can update own role"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('farmer', 'customer')
  AND NOT has_role(auth.uid(), 'admin')
);