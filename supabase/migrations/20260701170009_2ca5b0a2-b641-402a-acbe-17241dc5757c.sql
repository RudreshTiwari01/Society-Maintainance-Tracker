-- Residents upload into a folder named after their own user id
CREATE POLICY "Complaint images: users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'complaint-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner can read own images; admins can read all
CREATE POLICY "Complaint images: owner or admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'complaint-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Owner can delete their own images (e.g. re-upload)
CREATE POLICY "Complaint images: owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'complaint-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);