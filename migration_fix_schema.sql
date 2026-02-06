-- STANDALONE MIGRATION TO FIX MISSING COLUMNS
-- Run this in the Supabase SQL Editor

-- 1. Update Leads Table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2. Update Drafts Table
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
