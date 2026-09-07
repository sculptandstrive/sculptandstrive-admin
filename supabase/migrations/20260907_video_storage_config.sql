-- ==============================================================================
-- Migration: Supabase Storage Configuration for Video Tutorials & Playlists
-- Date: 2026-09-07
-- Description:
--   1. Ensures the 'tutorials' storage bucket exists with 500MB file limit.
--   2. Configures allowed MIME types for videos and thumbnails.
--   3. Sets up RLS policies for public reading and authenticated admin uploads.
-- ==============================================================================

-- 1. Create or update the 'tutorials' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tutorials',
  'tutorials',
  true,
  524288000, -- 500 MB (500 * 1024 * 1024 bytes)
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/avi',
    'video/mkv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/avi',
    'video/mkv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

-- 2. Storage RLS Policies for 'tutorials' bucket
-- Allow public access to view/stream videos and thumbnails
CREATE POLICY "Public Access for Tutorials Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorials');

-- Allow authenticated users (admins/trainers) to upload video tutorials and thumbnails
CREATE POLICY "Authenticated Upload for Tutorials Bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tutorials');

-- Allow authenticated users to update/overwrite tutorial videos and thumbnails
CREATE POLICY "Authenticated Update for Tutorials Bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tutorials');

-- Allow authenticated users to delete tutorial videos and thumbnails
CREATE POLICY "Authenticated Delete for Tutorials Bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tutorials');
