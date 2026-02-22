import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useTenant } from "@/hooks/use-tenant";
import { CancelBookingContent } from "@/components/CancelBookingContent";

/**
 * Public page: /t/:slug/cancel?token=...
 * Renders CancelBookingContent (shared with in-dialog cancel flow).
 */
const CancelBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { setTenantBySlug, loading: tenantLoading } = useTenant();

  useEffect(() => {
    if (slug) setTenantBySlug(slug);
  }, [slug, setTenantBySlug]);

  const onBack = () => navigate(slug ? `/t/${slug}` : "/", { replace: true });

  if (tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <CancelBookingContent token={token} onBack={onBack} />;
};

export default CancelBooking;
