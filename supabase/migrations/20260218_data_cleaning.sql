-- Data Cleaning Migration for Phone Numbers
-- Enforces E.164 format and cleans existing data

-- 1. Aggressive Clean: Remove all characters except digits (0-9) and plus sign (+)
-- This removes spaces, dashes, parentheses, backticks, quotes, etc.
UPDATE public.leads
SET phone = regexp_replace(phone, '[^0-9+]', '', 'g')
WHERE phone IS NOT NULL;

-- 2. Smart Fix: Convert 10-digit numbers (missing country code) to +91
-- If the cleaned number is exactly 10 digits (no plus), we assume it's an Indian number (+91)
UPDATE public.leads
SET phone = '+91' || phone
WHERE phone ~ '^[0-9]{10}$';

-- 3. Strict Validation: Discard invalid E.164 numbers
-- E.164 must start with '+' and have 10-15 digits total.
-- If it doesn't match this pattern, we clear the field (discard).
UPDATE public.leads
SET phone = NULL
WHERE phone IS NOT NULL 
AND phone !~ '^\+[0-9]{10,15}$';
