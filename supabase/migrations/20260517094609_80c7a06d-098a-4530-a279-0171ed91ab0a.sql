-- 1. Lock down set_signup_role: caller must be self, no admin role
CREATE OR REPLACE FUNCTION public.set_signup_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _role NOT IN ('customer'::app_role, 'farmer'::app_role) THEN
    RAISE EXCEPTION 'Invalid role for signup';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id)
  DO UPDATE SET role = _role;
END;
$function$;

-- 2. Lock down get_farmer_customers: caller must be the farmer or admin
CREATE OR REPLACE FUNCTION public.get_farmer_customers(_farmer_id uuid)
RETURNS TABLE(user_id uuid, full_name text, suburb text, order_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _farmer_id AND NOT has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT
      p.user_id,
      p.full_name,
      p.suburb,
      (SELECT count(*) FROM public.orders o WHERE o.customer_id = p.user_id AND o.farmer_id = _farmer_id)
    FROM public.profiles p
    WHERE EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.customer_id = p.user_id AND o.farmer_id = _farmer_id
    );
END;
$function$;

-- 3. Pending subscription orders: server-side mapping of PayPal orderId -> plan/period
CREATE TABLE IF NOT EXISTS public.pending_subscription_orders (
  paypal_order_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  plan text NOT NULL,
  period text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_subscription_orders ENABLE ROW LEVEL SECURITY;

-- No client access; only service role (via edge functions) reads/writes
CREATE POLICY "Admins can view pending orders"
ON public.pending_subscription_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));