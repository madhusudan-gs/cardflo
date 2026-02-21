-- CARD FLO: STORAGE BUCKET & LOGO FALLBACK COLUMN

-- 1. Add column to leads table for the cropped logo URL
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS logo_fallback_url text;

-- 2. Create the "card_images" storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('card_images', 'card_images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for "card_images" bucket
-- Note: Assuming auth.uid() is required for uploads, but public for viewing since it's a public bucket above

-- Allow authenticated users to upload their own logo snips
DROP POLICY IF EXISTS "Authenticated users can upload scanned images" ON storage.objects;
CREATE POLICY "Authenticated users can upload scanned images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'card_images');

-- Allow all users to view the images
DROP POLICY IF EXISTS "Anyone can view scanned images" ON storage.objects;
CREATE POLICY "Anyone can view scanned images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'card_images');

-- Allow users to update/delete their own uploads
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'card_images' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'card_images' AND owner = auth.uid());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
