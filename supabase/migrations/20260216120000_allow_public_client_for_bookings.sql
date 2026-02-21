-- Allow anon users to insert and select clients for the public booking flow.
-- Required when customers book without being logged in.
CREATE POLICY "Public can insert clients for bookings" ON public.clients
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can select clients for booking lookup" ON public.clients
  FOR SELECT
  USING (true);

-- Allow anon to call increment_client_bookings (SECURITY DEFINER handles actual update)
GRANT EXECUTE ON FUNCTION public.increment_client_bookings(uuid, decimal) TO anon;
