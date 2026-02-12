-- Allow anyone to view active tenants (needed for theme/branding on public pages)
CREATE POLICY "Anyone can view active tenants"
ON public.tenants
FOR SELECT
USING (status = 'active');