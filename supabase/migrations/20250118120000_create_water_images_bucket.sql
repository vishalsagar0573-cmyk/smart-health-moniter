-- Create a new storage bucket for water images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('water_images', 'water_images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies

-- Drop existing policies to ensure clean state and avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;

-- Allow public access to the bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'water_images' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'water_images' AND auth.role() = 'authenticated' );

-- Allow users to update their own objects
CREATE POLICY "Authenticated users can update own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'water_images' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'water_images' AND auth.uid() = owner );

-- Allow users to delete their own objects
CREATE POLICY "Authenticated users can delete own files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'water_images' AND auth.uid() = owner );
