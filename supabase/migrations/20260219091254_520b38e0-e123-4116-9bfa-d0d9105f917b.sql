
-- Add onboarding and role-specific fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS farm_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pickup_enabled boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS operating_days text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_radius_km numeric DEFAULT 15;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS produce_preferences text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_preference text DEFAULT 'delivery';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"orders": true, "promotions": true, "delivery": true}'::jsonb;
