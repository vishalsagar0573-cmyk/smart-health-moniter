-- Create storage bucket for water sample images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('water-samples', 'water-samples', true);

-- Storage policies for water samples
CREATE POLICY "Anyone can view water sample images"
ON storage.objects FOR SELECT
USING (bucket_id = 'water-samples');

CREATE POLICY "Villagers can upload water samples"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'water-samples' AND
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'villager'::app_role)
);

-- Add image URL column to health_reports
ALTER TABLE health_reports
ADD COLUMN water_image_url text;

-- Add extracted image features columns
ALTER TABLE health_reports
ADD COLUMN image_avg_r numeric,
ADD COLUMN image_avg_g numeric,
ADD COLUMN image_avg_b numeric,
ADD COLUMN image_brightness numeric;