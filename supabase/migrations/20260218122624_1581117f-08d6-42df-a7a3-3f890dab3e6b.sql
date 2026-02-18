
-- Announcements table for admin signal broadcaster
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_role text DEFAULT 'all', -- 'all', 'farmer', 'customer'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view active announcements"
ON public.announcements FOR SELECT
USING (is_active = true);
