
-- Create offer_flash_screens table for popup offer banners
CREATE TABLE public.offer_flash_screens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offer_flash_screens ENABLE ROW LEVEL SECURITY;

-- Anyone can read active flash screens
CREATE POLICY "Anyone can read active flash screens"
  ON public.offer_flash_screens FOR SELECT
  USING (is_active = true OR is_super_admin() OR has_permission('read_products'));

-- Admin can create
CREATE POLICY "Authorized can create flash screens"
  ON public.offer_flash_screens FOR INSERT
  WITH CHECK (is_super_admin() OR has_permission('create_products'));

-- Admin can update
CREATE POLICY "Authorized can update flash screens"
  ON public.offer_flash_screens FOR UPDATE
  USING (is_super_admin() OR has_permission('update_products'));

-- Admin can delete
CREATE POLICY "Authorized can delete flash screens"
  ON public.offer_flash_screens FOR DELETE
  USING (is_super_admin() OR has_permission('delete_products'));
