
-- Deduplicate user_roles
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id AND a.id > b.id;

-- Replace composite unique with user_id-only unique
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Admin can update any product
CREATE POLICY "Admins can update any product"
  ON public.products FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any product
CREATE POLICY "Admins can delete any product"
  ON public.products FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete any harvest entry
CREATE POLICY "Admins can delete any harvest entry"
  ON public.harvest_entries FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can read all harvest entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'harvest_entries' AND policyname = 'Admins can view all harvest entries'
  ) THEN
    CREATE POLICY "Admins can view all harvest entries"
      ON public.harvest_entries FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END;
$$;

-- Update trigger function to conflict on user_id alone
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
