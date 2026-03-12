
ALTER TABLE public.harvest_entries 
  ADD COLUMN IF NOT EXISTS planting_date date,
  ADD COLUMN IF NOT EXISTS harvest_date date;

-- Backfill: set harvest_date from estimated_ready_date for existing rows
UPDATE public.harvest_entries 
SET harvest_date = estimated_ready_date 
WHERE harvest_date IS NULL AND estimated_ready_date IS NOT NULL;
