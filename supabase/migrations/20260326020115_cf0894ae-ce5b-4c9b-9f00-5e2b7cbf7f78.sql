ALTER TABLE public.offer_flash_screens
  ADD COLUMN IF NOT EXISTS open_trigger text DEFAULT 'refresh',
  ADD COLUMN IF NOT EXISTS open_delay_seconds integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS auto_disappear_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'all';