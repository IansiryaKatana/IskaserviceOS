-- Function to increment client booking stats
CREATE OR REPLACE FUNCTION public.increment_client_bookings(
  client_id UUID,
  amount DECIMAL DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.clients
  SET 
    total_bookings = total_bookings + 1,
    total_spent = total_spent + amount,
    last_booking_date = CURRENT_DATE,
    updated_at = now()
  WHERE id = client_id;
END;
$$;
