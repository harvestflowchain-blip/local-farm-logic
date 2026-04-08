-- Restrict announcements to authenticated users with role filtering
DROP POLICY IF EXISTS "Users can view active announcements" ON public.announcements;
CREATE POLICY "Authenticated users can view targeted announcements" ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      target_role = 'all'
      OR target_role IS NULL
      OR target_role = (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
    )
  );
