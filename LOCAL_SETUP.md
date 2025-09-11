# Local Development Setup Guide

This guide will help you set up this Impact Workflow POC with its own isolated Supabase database using Docker.

## 🚀 Quick Start

For experienced developers who want to get started quickly:

1. `npm install`
2. `npm run supabase:start` (copy the keys from output)
3. `npm run setup:env` (interactive setup) OR manually create `.env.local` and `.env` files
4. `npm run prisma:generate && npx prisma db push`
5. `npm run setup:storage` (create upload buckets)
6. `npm run dev`
7. Visit http://localhost:3000 and http://localhost:54333 (Supabase Studio)

## Prerequisites

- Docker Desktop installed and running
- Node.js 18.18.0 or higher
- Supabase CLI installed (`npm install -g supabase`)

## Port Configuration

This POC uses custom ports to avoid conflicts with other Supabase projects:

- **API**: 54331 (instead of default 54321)
- **Database**: 54332 (instead of default 54322)
- **Studio**: 54333 (instead of default 54323)
- **Email Testing**: 54334 (instead of default 54324)
- **Analytics**: 54337 (instead of default 54327)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Supabase Local Development

First, start your local Supabase instance:

```bash
# Start Supabase (this will download Docker images on first run)
npm run supabase:start

# Check status to ensure everything is running
npm run supabase:status
```

**Important:** Copy the output from `supabase:start` - you'll need the keys for the next step.

### 3. Create Environment Files

After starting Supabase, you'll see output similar to this:

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54331
          DB URL: postgresql://postgres:postgres@127.0.0.1:54332/postgres
      Studio URL: http://127.0.0.1:54333
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
```

Create **both** `.env.local` and `.env` files in the project root with the following content (replace the placeholder values with your actual keys from the Supabase output):

```bash
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=YOUR_ACTUAL_ANON_KEY_FROM_SUPABASE_OUTPUT

# Database URLs for Prisma
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54332/postgres

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=YOUR_ACTUAL_SERVICE_ROLE_KEY_FROM_SUPABASE_OUTPUT

# JWT Secret for local development
SUPABASE_JWT_SECRET=YOUR_ACTUAL_JWT_SECRET_FROM_SUPABASE_OUTPUT

# Optional: OpenAI API Key for AI features (if needed)
# OPENAI_API_KEY=your-openai-api-key-here
```

**Note:** You need both files:
- `.env.local` - Used by Next.js for client and server-side environment variables
- `.env` - Used by Prisma CLI for database operations

**Tip:** You can copy the template above to both files and then replace the placeholder values with your actual keys.

**Alternative:** Use the setup script to create the environment files interactively:
```bash
./setup-env.sh
```

### 4. Set Up Database Schema

```bash
# Generate Prisma client and push schema to database
npm run prisma:generate
npx prisma db push
```

### 5. Set Up Storage Buckets

The application uses Supabase storage for file uploads. Create the necessary buckets:

```bash
# Create storage buckets for uploads and avatars
npm run setup:storage
```

This creates:
- **uploads** bucket (50MB limit) - for general file uploads (images, PDFs, text, JSON)
- **avatars** bucket (10MB limit) - for user avatar images

**Note**: The buckets are also created automatically when you run `npm run supabase:reset`.

### 6. Start the Application

```bash
# Start the Next.js development server
npm run dev
```

## Access Points

Once everything is running, you can access:

- **Next.js App**: http://localhost:3000
- **Supabase Studio**: http://localhost:54333
- **Email Testing**: http://localhost:54334
- **Database**: postgresql://postgres:postgres@127.0.0.1:54332/postgres

## Useful Commands

### Supabase Management
```bash
npm run supabase:start    # Start Supabase
npm run supabase:stop     # Stop Supabase
npm run supabase:restart  # Restart Supabase
npm run supabase:reset    # Reset database (WARNING: deletes all data)
npm run supabase:studio   # Open Supabase Studio
npm run supabase:status   # Check status of all services
```

### Database Management
```bash
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Create and apply migrations
npm run prisma:studio     # Open Prisma Studio
npm run db:setup          # Complete database setup
```

### Storage Management
```bash
npm run setup:storage     # Create storage buckets
npm run setup:env         # Interactive environment setup
```

## Troubleshooting

### Port Conflicts
If you get port conflicts, check what's running:
```bash
lsof -i :54331  # Check API port
lsof -i :54332  # Check DB port
lsof -i :54333  # Check Studio port
```

### Reset Everything
If you need to start fresh:
```bash
npm run supabase:stop
docker system prune -f
npm run supabase:start
# Then recreate your .env files with the new keys
npm run prisma:generate
npx prisma db push
```

### Multiple POCs
To run multiple POCs simultaneously:
1. Each POC should have its own port configuration in `supabase/config.toml`
2. Use different `project_id` values
3. Ensure no port conflicts between projects

## Database Schema

The current schema includes:
- User management with roles (ADMIN/USER)
- Supabase Auth integration
- Avatar support

You can modify the schema in `prisma/schema.prisma` and apply changes with:
```bash
npm run prisma:migrate
```

## Next Steps

1. Customize the database schema in `prisma/schema.prisma`
2. Add seed data in `supabase/seed.sql`
3. Configure authentication providers in Supabase Studio
4. Build your workflow features!

---

**Note**: This setup creates a completely isolated environment for this POC. Your existing Docker/Supabase setups won't be affected.

---

## 🎨 Fonts Configuration

### Font Files Included
The original design uses **F37Jan** and **Poppins** fonts, which are now included in this repository:
- **F37Jan**: Located in `public/fonts/f37-jan/` (used for headings)
- **Poppins**: Located in `public/fonts/poppins/` (used for body text)

### Font Loading
The application will load fonts in this order:
- **Headings**: F37Jan → system font fallbacks
- **Body text**: Poppins → system font fallbacks

### Font Files Structure
The fonts are organized as follows:
```
public/fonts/
├── f37-jan/
│   ├── F37Jan-Regular.otf
│   ├── F37Jan-Bold.otf
│   ├── F37Jan-Light.otf
│   └── ... (additional weights)
└── poppins/
    └── Web Fonts/Poppins/
        ├── Poppins-Regular.woff2
        ├── Poppins-Bold.woff2
        └── ... (additional weights)
```
