-- Seed file for impact-workflow-poc
-- This file runs after migrations during `supabase db reset`

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
VALUES 
  ('uploads', 'uploads', true, false, 52428800, '{"image/*","application/pdf","text/plain","application/json"}', null),
  ('avatars', 'avatars', true, false, 10485760, '{"image/jpeg","image/jpg","image/png","image/gif","image/webp"}', null)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for uploads bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Set up storage policies for avatars bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create a sample admin user (this will be created after Supabase Auth is set up)
-- You can customize this or add more seed data as needed

-- Example: Insert some initial data if needed
-- INSERT INTO public.users (id, email, name, role, created_at, updated_at)
-- VALUES 
--   ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User', 'ADMIN', now(), now());

-- Add any other seed data for your specific POC here
