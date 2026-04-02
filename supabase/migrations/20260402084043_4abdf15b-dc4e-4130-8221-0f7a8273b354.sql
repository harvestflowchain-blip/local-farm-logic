
CREATE OR REPLACE FUNCTION public.switch_my_role(_new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF _new_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot self-promote to admin';
  END IF;
  UPDATE public.user_roles
    SET role = _new_role
    WHERE user_id = auth.uid();
END;
$$;
