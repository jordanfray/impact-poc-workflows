#!/bin/bash

# Setup script for creating environment files
# This script helps users create the required .env.local and .env files

echo "🚀 Impact Workflow POC - Environment Setup"
echo "=========================================="
echo ""
echo "This script will help you create the required environment files."
echo "Make sure you have already run 'npm run supabase:start' and copied the output."
echo ""

# Check if Supabase is running
if ! curl -s http://127.0.0.1:54331/health > /dev/null 2>&1; then
    echo "❌ Supabase doesn't seem to be running on port 54331."
    echo "Please run 'npm run supabase:start' first."
    exit 1
fi

echo "✅ Supabase is running!"
echo ""

# Get keys from user
echo "Please enter your Supabase keys from the 'npm run supabase:start' output:"
echo ""

read -p "Anon Key: " ANON_KEY
read -p "Service Role Key: " SERVICE_ROLE_KEY
read -p "JWT Secret: " JWT_SECRET

echo ""
read -p "OpenAI API Key (optional, press Enter to skip): " OPENAI_KEY

# Create environment content
ENV_CONTENT="# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$ANON_KEY

# Database URLs for Prisma
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# JWT Secret for local development
SUPABASE_JWT_SECRET=$JWT_SECRET"

if [ ! -z "$OPENAI_KEY" ]; then
    ENV_CONTENT="$ENV_CONTENT

# OpenAI API Key for AI features
OPENAI_API_KEY=$OPENAI_KEY"
else
    ENV_CONTENT="$ENV_CONTENT

# Optional: OpenAI API Key for AI features (if needed)
# OPENAI_API_KEY=your-openai-api-key-here"
fi

# Write to both files
echo "$ENV_CONTENT" > .env.local
echo "$ENV_CONTENT" > .env

echo ""
echo "✅ Environment files created successfully!"
echo "   - .env.local (for Next.js)"
echo "   - .env (for Prisma)"
echo ""
echo "Next steps:"
echo "1. npm run prisma:generate"
echo "2. npx prisma db push"
echo "3. npm run dev"
echo ""
echo "🎉 You're all set!"
