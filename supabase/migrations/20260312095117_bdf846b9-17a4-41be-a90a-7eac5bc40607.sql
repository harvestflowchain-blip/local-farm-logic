
-- Add a get_my_role() function for convenient role lookup
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Add default role assignment trigger as fallback
-- Uses ON CONFLICT to avoid duplicates if signUp already inserted the role
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_assign_role'
  ) THEN
    CREATE TRIGGER on_auth_user_created_assign_role
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_default_role();
  END IF;
END;
$$;
