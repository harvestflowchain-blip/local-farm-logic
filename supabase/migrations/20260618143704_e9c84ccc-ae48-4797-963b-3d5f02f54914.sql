
-- 1) Admin audit log
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.admin_actions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert audit log"
  ON public.admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND actor_id = auth.uid());

CREATE INDEX idx_admin_actions_actor ON public.admin_actions(actor_id, created_at DESC);
CREATE INDEX idx_admin_actions_action ON public.admin_actions(action, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) TO authenticated;

-- 2) Atomic multi-farmer order placement
CREATE OR REPLACE FUNCTION public.place_orders_atomic(
  _delivery_suburb text,
  _delivery_address text,
  _payment_method text,
  _groups jsonb  -- [{farmer_id, delivery_fee, items:[{product_id, quantity, price_at_purchase}]}]
) RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group jsonb;
  v_item jsonb;
  v_order_id uuid;
  v_subtotal numeric;
  v_total numeric;
  v_fee numeric;
  v_order_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _groups IS NULL OR jsonb_array_length(_groups) = 0 THEN
    RAISE EXCEPTION 'No order groups provided';
  END IF;

  FOR v_group IN SELECT * FROM jsonb_array_elements(_groups) LOOP
    v_fee := COALESCE((v_group->>'delivery_fee')::numeric, 0);
    v_subtotal := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'items') LOOP
      v_subtotal := v_subtotal + ((v_item->>'quantity')::numeric * (v_item->>'price_at_purchase')::numeric);
    END LOOP;
    v_total := v_subtotal + v_fee;

    INSERT INTO public.orders (
      customer_id, farmer_id, delivery_suburb, delivery_address,
      delivery_fee, total, payment_method, status
    ) VALUES (
      v_uid,
      (v_group->>'farmer_id')::uuid,
      _delivery_suburb,
      NULLIF(_delivery_address,''),
      v_fee,
      v_total,
      _payment_method,
      'placed'
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_group->'items') LOOP
      INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
      VALUES (
        v_order_id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::int,
        (v_item->>'price_at_purchase')::numeric
      );
    END LOOP;

    v_order_ids := array_append(v_order_ids, v_order_id);
  END LOOP;

  DELETE FROM public.cart_items WHERE user_id = v_uid;
  RETURN v_order_ids;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.place_orders_atomic(text, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_orders_atomic(text, text, text, jsonb) TO authenticated;

-- 3) Enable realtime on orders so consumers see status changes
ALTER TABLE public.orders REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='orders';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;
END $$;
