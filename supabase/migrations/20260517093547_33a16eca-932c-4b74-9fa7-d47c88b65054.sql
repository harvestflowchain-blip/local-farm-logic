-- Revoke EXECUTE on SECURITY DEFINER functions from anon/public; keep authenticated where used
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.switch_my_role(app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_signup_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_farmer_customers(uuid) FROM PUBLIC, anon;

-- Trigger-only functions: no caller should invoke directly
REVOKE EXECUTE ON FUNCTION public.assign_default_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_farmer_order_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Ensure authenticated retains EXECUTE on the ones used in RLS / app code
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_my_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_signup_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_farmer_customers(uuid) TO authenticated;