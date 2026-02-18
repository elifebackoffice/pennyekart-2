
-- Add website_url column for subsidiary company external sites
ALTER TABLE public.services ADD COLUMN website_url text DEFAULT NULL;

-- Add a logo_url column for company branding
ALTER TABLE public.services ADD COLUMN logo_url text DEFAULT NULL;
