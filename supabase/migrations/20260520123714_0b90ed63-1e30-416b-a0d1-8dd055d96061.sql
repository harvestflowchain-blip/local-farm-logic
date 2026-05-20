
CREATE OR REPLACE FUNCTION public.admin_weekly_gmv()
RETURNS TABLE(week_index int, week_start timestamptz, gmv numeric, order_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  WITH weeks AS (
    SELECT gs AS week_index,
           date_trunc('day', now()) - ((gs + 1) * INTERVAL '7 day') AS w_start,
           date_trunc('day', now()) - (gs * INTERVAL '7 day') AS w_end
    FROM generate_series(0, 7) AS gs
  )
  SELECT (7 - w.week_index)::int,
         w.w_start,
         COALESCE(SUM(o.total), 0)::numeric,
         COUNT(o.id)::bigint
  FROM weeks w
  LEFT JOIN public.orders o
    ON o.created_at >= w.w_start
   AND o.created_at <  w.w_end
   AND o.status <> 'cancelled'
  GROUP BY w.week_index, w.w_start
  ORDER BY w.week_index DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_weekly_gmv() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_weekly_gmv() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_buyer_cohorts()
RETURNS TABLE(new_this_week bigint, returning_this_week bigint, at_risk bigint, retention_rate numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new bigint;
  v_ret bigint;
  v_risk bigint;
  v_rate numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH cust AS (
    SELECT customer_id,
           MIN(created_at) AS first_order,
           MAX(created_at) AS last_order,
           COUNT(*) AS total_orders
    FROM public.orders
    WHERE status <> 'cancelled'
    GROUP BY customer_id
  )
  SELECT
    COUNT(*) FILTER (WHERE first_order >= now() - INTERVAL '7 day'),
    COUNT(*) FILTER (WHERE total_orders > 1 AND last_order >= now() - INTERVAL '7 day'),
    COUNT(*) FILTER (WHERE total_orders >= 2 AND last_order < now() - INTERVAL '21 day')
  INTO v_new, v_ret, v_risk
  FROM cust;

  v_rate := CASE WHEN (v_new + v_ret) > 0 THEN (v_ret::numeric / (v_new + v_ret)) * 100 ELSE 0 END;
  RETURN QUERY SELECT v_new, v_ret, v_risk, v_rate;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_buyer_cohorts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_buyer_cohorts() TO authenticated;
