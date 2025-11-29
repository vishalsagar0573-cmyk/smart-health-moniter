
-- Fix missing symptom count columns
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS fever_cases integer DEFAULT 0;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS diarrhea_cases integer DEFAULT 0;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS vomiting_cases integer DEFAULT 0;

-- Just to be safe, ensure all other columns are there too
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS village_name text;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS water_ph decimal;
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS water_turbidity decimal;

-- Refresh the schema cache by notifying PostgREST (usually automatic, but good to know)
NOTIFY pgrst, 'reload schema';
