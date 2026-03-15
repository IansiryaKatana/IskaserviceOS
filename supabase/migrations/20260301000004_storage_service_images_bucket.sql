-- Ensure service-images bucket exists and allow authenticated uploads + public read.
-- Required for Platform (tenant media) and Admin (service images) uploads.

-- Create bucket if not exists (public so getPublicUrl works).
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload (INSERT).
DROP POLICY IF EXISTS "service-images authenticated insert" ON storage.objects;
CREATE POLICY "service-images authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images');

-- Allow authenticated users to update (for upsert).
DROP POLICY IF EXISTS "service-images authenticated update" ON storage.objects;
CREATE POLICY "service-images authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service-images');

-- Public read is implied by bucket public = true; add explicit SELECT for anon/authenticated if needed.
DROP POLICY IF EXISTS "service-images public read" ON storage.objects;
CREATE POLICY "service-images public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-images');

-- Allow authenticated users to delete (optional, for cleanup).
DROP POLICY IF EXISTS "service-images authenticated delete" ON storage.objects;
CREATE POLICY "service-images authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-images');
