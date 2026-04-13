
-- Fix existing data: unapprove all seller products where the partner is unapproved
UPDATE seller_products sp
SET is_approved = false
FROM profiles p
WHERE p.user_id = sp.seller_id
  AND p.is_approved = false
  AND sp.is_approved = true;

-- Create trigger function to cascade partner unapproval to their products
CREATE OR REPLACE FUNCTION public.cascade_partner_unapproval()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_approved = true AND NEW.is_approved = false 
     AND NEW.user_type = 'selling_partner' THEN
    UPDATE public.seller_products
    SET is_approved = false
    WHERE seller_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
CREATE TRIGGER on_partner_unapproval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_partner_unapproval();
