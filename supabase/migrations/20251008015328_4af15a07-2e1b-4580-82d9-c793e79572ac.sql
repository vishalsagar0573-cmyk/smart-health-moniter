-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create advice table for storing safety suggestions
CREATE TABLE public.village_advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  auto_advice TEXT[] NOT NULL DEFAULT '{}',
  custom_advice TEXT,
  worker_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.village_advice ENABLE ROW LEVEL SECURITY;

-- Policy: Health workers can insert and update advice
CREATE POLICY "Health workers can manage advice"
ON public.village_advice
FOR ALL
USING (has_role(auth.uid(), 'health_worker'::app_role))
WITH CHECK (has_role(auth.uid(), 'health_worker'::app_role));

-- Policy: Villagers can view advice for their villages
CREATE POLICY "Villagers can view advice"
ON public.village_advice
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_village_advice_village_name ON public.village_advice(village_name);
CREATE INDEX idx_village_advice_risk_level ON public.village_advice(risk_level);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_village_advice_updated_at
BEFORE UPDATE ON public.village_advice
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();