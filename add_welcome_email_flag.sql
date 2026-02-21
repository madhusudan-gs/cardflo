-- Add a flag to track if the post-verification email has been sent
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false;
