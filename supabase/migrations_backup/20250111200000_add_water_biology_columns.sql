-- Add water biology analysis columns to health_reports table
ALTER TABLE public.health_reports 
ADD COLUMN possible_organism TEXT,
ADD COLUMN health_advice TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.health_reports.possible_organism IS 'Possible biological organisms detected based on pH and turbidity analysis (e.g., E. coli, Protozoa, Algae)';
COMMENT ON COLUMN public.health_reports.health_advice IS 'Health advice generated based on water biology analysis and quality parameters';

