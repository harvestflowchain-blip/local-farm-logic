-- Fix nullable user_id on interactions table
ALTER TABLE public.interactions ALTER COLUMN user_id SET NOT NULL;

-- Update INSERT policy to be explicit about non-null user_id
DROP POLICY IF EXISTS "Authenticated users can insert interactions" ON public.interactions;
CREATE POLICY "Authenticated users can insert interactions" ON public.interactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);
