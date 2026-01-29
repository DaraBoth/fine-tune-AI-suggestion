# Supabase Storage Setup

This project now stores original uploaded files in Supabase Storage for proper download functionality.

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Create a bucket with the following settings:
   - **Name**: `training-files`
   - **Public**: Keep it **OFF** (private bucket)
5. Click **Create Bucket**

6. Set up storage policies:
   - Click on the `training-files` bucket
   - Go to **Policies** tab
   - Click **New Policy**
   - Create policies for INSERT, SELECT, and DELETE operations
   - You can use the templates or custom policies based on your auth setup

### Option 2: Using SQL Migration

Run the migration file in your Supabase SQL Editor:

```sql
-- From: supabase/migrations/002_create_storage_bucket.sql
```

Go to **SQL Editor** in Supabase dashboard and run the migration file.

## Verify Setup

After setup, you should see:
- ✅ A `training-files` bucket in Storage
- ✅ Policies allowing file operations
- ✅ Files being uploaded when you train the AI

## Features

- **Original File Storage**: All uploaded PDFs and text files are stored in Supabase Storage
- **Download Original**: Users can download the exact file they uploaded
- **View Text**: Users can view extracted text content in a modal
- **Automatic Cleanup**: When a file is "forgotten", both chunks and original file are deleted

## Troubleshooting

If uploads fail:
1. Check if the bucket exists: `SELECT * FROM storage.buckets WHERE name = 'training-files'`
2. Check policies: Ensure your anon/authenticated key has proper permissions
3. Check console logs for specific error messages
4. Verify your Supabase URL and anon key in `.env.local`

## Storage Limits

- Supabase Free Tier: 1GB storage
- Pro Tier: 100GB storage
- Files are stored with timestamp prefixes to avoid naming conflicts
