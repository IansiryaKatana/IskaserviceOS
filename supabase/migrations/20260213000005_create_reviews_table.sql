-- Create reviews table for tenant reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  is_verified BOOLEAN DEFAULT false, -- Verified if linked to a booking
  is_approved BOOLEAN DEFAULT true, -- Admin can moderate
  is_featured BOOLEAN DEFAULT false, -- Featured reviews shown first
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON public.reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON public.reviews(is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT
  USING (is_approved = true);

-- Anyone can create reviews (public form)
CREATE POLICY "Anyone can create reviews" ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Tenant admins can manage their tenant's reviews
CREATE POLICY "Tenant admins can manage reviews" ON public.reviews FOR ALL
  USING (
    public.is_platform_admin(auth.uid()) OR
    public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'admin', tenant_id)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid()) OR
    public.has_tenant_role(auth.uid(), 'tenant_owner', tenant_id) OR
    public.has_tenant_role(auth.uid(), 'admin', tenant_id)
  );

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate average rating for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_rating_stats(tenant_uuid UUID)
RETURNS TABLE (
  average_rating DECIMAL,
  total_reviews INTEGER,
  rating_breakdown JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG(rating)::DECIMAL(3,2), 0) as average_rating,
    COUNT(*)::INTEGER as total_reviews,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    ) as rating_breakdown
  FROM public.reviews
  WHERE tenant_id = tenant_uuid AND is_approved = true;
END;
$$;
