-- Phase 2: Cancel-by-link support
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancel_token UUID UNIQUE DEFAULT gen_random_uuid();

UPDATE public.bookings SET cancel_token = gen_random_uuid() WHERE cancel_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token ON public.bookings(cancel_token);

COMMENT ON COLUMN public.bookings.cancel_token IS 'Secret token for public cancel/reschedule link; used in /t/:slug/cancel?token=...';
