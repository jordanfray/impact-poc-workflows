#!/bin/bash

# Setup script for creating Supabase storage buckets
# This script creates the necessary storage buckets for the Impact Workflow POC

echo "🪣 Impact Workflow POC - Storage Bucket Setup"
echo "============================================"
echo ""

# Check if Supabase is running
if ! curl -s http://127.0.0.1:54331/health > /dev/null 2>&1; then
    echo "❌ Supabase doesn't seem to be running on port 54331."
    echo "Please run 'npm run supabase:start' first."
    exit 1
fi

echo "✅ Supabase is running!"
echo ""

# Load environment variables
if [ -f .env.local ]; then
    echo "📄 Loading environment variables from .env.local"
    export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
    echo "📄 Loading environment variables from .env"
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ No environment file found. Please create .env.local or .env first."
    exit 1
fi

echo "🔧 Creating storage buckets..."

# Create SQL file for bucket creation
cat > /tmp/create_buckets.sql << 'EOF'
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
VALUES 
  ('uploads', 'uploads', true, false, 52428800, '{"image/*","application/pdf","text/plain","application/json"}', null),
  ('avatars', 'avatars', true, false, 10485760, '{"image/jpeg","image/jpg","image/png","image/gif","image/webp"}', null)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for uploads bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Public Access uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Set up storage policies for avatars bucket
DROP POLICY IF EXISTS "Public Access avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Public Access avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EOF

# Execute the SQL file
echo "📝 Executing bucket creation SQL..."
psql "$DATABASE_URL" -f /tmp/create_buckets.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Storage buckets created successfully!"
    echo "   - 'uploads' bucket (50MB limit, supports images, PDFs, text, JSON)"
    echo "   - 'avatars' bucket (10MB limit, supports image formats)"
    echo ""
    echo "🔒 Security policies applied:"
    echo "   - Public read access for both buckets"
    echo "   - Authenticated users can upload files"
    echo "   - Users can only modify their own files"
    echo ""
    echo "🎉 You can now use file uploads in your application!"
else
    echo ""
    echo "❌ Failed to create storage buckets. Check the error above."
    echo "You may need to run this script again or check your database connection."
fi

# Clean up
rm -f /tmp/create_buckets.sql

echo ""
echo "💡 Tip: You can manage buckets via Supabase Studio at http://localhost:54333"
