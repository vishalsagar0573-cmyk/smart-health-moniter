-- Add location fields to health_reports table
ALTER TABLE public.health_reports 
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC,
ADD COLUMN location_timestamp TIMESTAMP WITH TIME ZONE;

-- Create index for location-based queries
CREATE INDEX idx_health_reports_location ON public.health_reports(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;