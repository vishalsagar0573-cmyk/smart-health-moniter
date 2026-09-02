-- Add symptom tracking columns to health_reports
ALTER TABLE public.health_reports 
ADD COLUMN symptoms text[] DEFAULT '{}',
ADD COLUMN people_affected integer DEFAULT 1,
ADD COLUMN predicted_disease text,
ADD COLUMN disease_risk_level text,
ADD COLUMN disease_advice text;

-- Add comment for documentation
COMMENT ON COLUMN public.health_reports.symptoms IS 'Array of selected symptoms from the detailed symptom form';
COMMENT ON COLUMN public.health_reports.people_affected IS 'Number of people affected by the symptoms';
COMMENT ON COLUMN public.health_reports.predicted_disease IS 'ML-predicted disease based on symptoms';
COMMENT ON COLUMN public.health_reports.disease_risk_level IS 'Risk level: Low, Moderate, High';
COMMENT ON COLUMN public.health_reports.disease_advice IS 'Advice for the predicted disease';