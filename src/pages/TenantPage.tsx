import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/use-tenant";
import { TenantPageSkeleton } from "@/components/TenantPageSkeleton";
import Index from "./Index";

/**
 * Wrapper that loads a tenant by slug from the URL param,
 * then renders the standard booking page with that tenant's theme.
 */
const TenantPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { setTenantBySlug, loading, tenant } = useTenant();

  useEffect(() => {
    if (slug) {
      setTenantBySlug(slug);
    }
  }, [slug, setTenantBySlug]);

  if (loading) {
    return <TenantPageSkeleton />;
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body">
        <div className="text-center">
          <h1 className="mb-4 font-display text-4xl font-bold text-foreground">Tenant Not Found</h1>
          <p className="text-muted-foreground">The business "{slug}" could not be found.</p>
          <a href="/" className="mt-4 inline-block text-primary underline hover:text-primary/90">Return Home</a>
        </div>
      </div>
    );
  }

  return <Index />;
};

export default TenantPage;
