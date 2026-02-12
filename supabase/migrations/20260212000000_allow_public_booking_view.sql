-- Allow public to view bookings for availability checking
-- This is needed for the booking page to show which time slots are already taken
-- Only allows viewing non-cancelled bookings to check availability
CREATE POLICY "Public can view bookings for availability" ON public.bookings FOR SELECT
  USING (
    -- Only show bookings that are not cancelled (cancelled slots should be available)
    status != 'cancelled'
  );
