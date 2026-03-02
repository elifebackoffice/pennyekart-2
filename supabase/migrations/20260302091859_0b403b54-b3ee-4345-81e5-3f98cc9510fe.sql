
-- Create trigger function to credit wallet points on delivery
CREATE OR REPLACE FUNCTION public.credit_wallet_points_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item jsonb;
  _product_id uuid;
  _qty int;
  _wallet_points numeric;
  _total_points numeric := 0;
  _wallet record;
BEGIN
  -- Only fire when status changes TO 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.user_id IS NOT NULL THEN

    -- Loop through order items to collect wallet points
    FOR _item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      _product_id := (_item->>'id')::uuid;
      _qty := COALESCE((_item->>'quantity')::int, 1);

      -- Check admin products first
      SELECT wallet_points INTO _wallet_points
      FROM public.products WHERE id = _product_id;

      IF _wallet_points IS NULL OR _wallet_points = 0 THEN
        -- Check seller products
        SELECT wallet_points INTO _wallet_points
        FROM public.seller_products WHERE id = _product_id;
      END IF;

      IF _wallet_points IS NOT NULL AND _wallet_points > 0 THEN
        _total_points := _total_points + (_wallet_points * _qty);
      END IF;
    END LOOP;

    -- Credit total points to customer wallet
    IF _total_points > 0 THEN
      SELECT * INTO _wallet FROM public.customer_wallets WHERE customer_user_id = NEW.user_id FOR UPDATE;

      IF _wallet IS NOT NULL THEN
        UPDATE public.customer_wallets
        SET balance = balance + _total_points, updated_at = now()
        WHERE id = _wallet.id;

        INSERT INTO public.customer_wallet_transactions (
          wallet_id, customer_user_id, order_id, type, amount, description
        ) VALUES (
          _wallet.id,
          NEW.user_id,
          NEW.id,
          'credit',
          _total_points,
          'Wallet points earned from order delivery: ₹' || _total_points
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER credit_wallet_points_on_delivery
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.credit_wallet_points_on_delivery();
