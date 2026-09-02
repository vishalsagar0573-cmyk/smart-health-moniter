
-- Run this in Supabase SQL Editor to fix the missing columns error

-- 1. Add missing columns to health_reports
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS alert_level text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS alert_message text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS symptoms text[];
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS people_affected integer DEFAULT 0;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS predicted_disease text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS disease_risk_level text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS disease_advice text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS possible_organism text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS health_advice text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS water_image_url text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS latitude float;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS longitude float;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS location_timestamp timestamp with time zone;

-- 2. Ensure RLS policies exist (just in case)
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Villagers can insert their own reports"
ON public.health_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Villagers can view their own reports"
ON public.health_reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
