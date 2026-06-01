
-- 1. Drop the broad listing policy on product-images.
-- Files remain reachable via public CDN URLs (bucket is public), but filenames can no longer be enumerated.
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

-- 2. Tighten EXECUTE on SECURITY DEFINER functions.
-- Revoke from PUBLIC and anon; grant only to authenticated (each function still checks role internally).
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_farmer_customers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_farmer_customers(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_weekly_gmv() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_weekly_gmv() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_buyer_cohorts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_buyer_cohorts() TO authenticated, service_role;
