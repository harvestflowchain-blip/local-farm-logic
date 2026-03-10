
CREATE TABLE public.harvest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL,
  crop_name text NOT NULL,
  estimated_ready_date date NOT NULL,
  projected_yield_kg numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.harvest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own harvest entries"
  ON public.harvest_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert own harvest entries"
  ON public.harvest_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = farmer_id AND has_role(auth.uid(), 'farmer'::app_role));

CREATE POLICY "Farmers can update own harvest entries"
  ON public.harvest_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = farmer_id AND has_role(auth.uid(), 'farmer'::app_role));

CREATE POLICY "Farmers can delete own harvest entries"
  ON public.harvest_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = farmer_id AND has_role(auth.uid(), 'farmer'::app_role));

CREATE INDEX idx_harvest_entries_farmer_id ON public.harvest_entries(farmer_id);
CREATE INDEX idx_harvest_entries_ready_date ON public.harvest_entries(estimated_ready_date);
