import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { X, Calendar, MapPin, User, Scissors } from "lucide-react";

/**
 * Public page: /t/:slug/cancel?token=...
 * Fetches booking by cancel_token (via edge function), shows summary and Cancel button.
 */
const CancelBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { setTenantBySlug, tenant, loading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(!!token);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<{
    booking: { booking_date: string; booking_time: string; customer_name: string; service_name: string | null; staff_name: string | null; location_name: string | null };
    tenant_name: string | null;
    tenant_slug: string | null;
  } | null>(null);

  useEffect(() => {
    if (slug) setTenantBySlug(slug);
  }, [slug, setTenantBySlug]);

  useEffect(() => {
    if (!token || tenantLoading) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = import.meta.env.VITE_SUPABASE_URL;
    fetch(`${url}/functions/v1/get-booking-by-cancel-token?token=${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body.error) {
          setError(body.error);
          setData(null);
          return;
        }
        setData({
          booking: body.booking,
          tenant_name: body.tenant_name,
          tenant_slug: body.tenant_slug,
          cancel_allowed: body.cancel_allowed !== false,
          cancel_message: body.cancel_message ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load booking.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, tenantLoading]);

  const handleCancel = async () => {
    if (!token) return;
    setCancelling(true);
    setError(null);
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${url}/functions/v1/cancel-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ cancel_token: token }),
    });
    const body = await res.json().catch(() => ({}));
    setCancelling(false);
    if (body.success) setDone(true);
    else setError((body as { error?: string }).error ?? "Could not cancel booking.");
  };

  const formatTime = (t: string) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  if (tenantLoading || (token && loading && !data && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!token || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <X className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="font-display text-lg font-bold text-foreground mb-2">Invalid or expired link</h1>
          <p className="text-sm text-muted-foreground mb-4">{error || "This cancel link is invalid or the booking was already cancelled."}</p>
          <Link to="/" className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Back to home</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="font-display text-lg font-bold text-foreground mb-2">Booking cancelled</h1>
          <p className="text-sm text-muted-foreground mb-4">Your appointment has been cancelled. You can book again anytime.</p>
          <Link to={data?.tenant_slug ? `/t/${data.tenant_slug}` : "/"} className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Book again</Link>
        </div>
      </div>
    );
  }

  const b = data!.booking;
  const tenantName = data!.tenant_name ?? "the business";
  const cancelAllowed = data!.cancel_allowed !== false;
  const cancelMessage = data!.cancel_message;

  return (
    <div className="min-h-screen bg-background font-body px-4 py-8">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground mb-2">Cancel or reschedule</h1>
        <p className="text-sm text-muted-foreground mb-6">Your appointment at {tenantName}:</p>
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Scissors className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{b.service_name ?? "Appointment"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{b.booking_date} at {formatTime(b.booking_time)}</span>
          </div>
          {b.location_name && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{b.location_name}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{b.customer_name}</span>
          </div>
        </div>
        {cancelMessage && (
          <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {cancelMessage}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling || !cancelAllowed}
            className="w-full rounded-xl border border-destructive bg-destructive/10 py-3 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </button>
          <Link
            to={data?.tenant_slug ? `/t/${data.tenant_slug}` : "/"}
            className="block w-full rounded-xl border border-border py-3 text-center text-sm font-medium text-foreground hover:bg-secondary"
          >
            Keep booking (back to {tenantName})
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          To reschedule, cancel here then book a new time on our booking page.
        </p>
      </div>
    </div>
  );
};

export default CancelBooking;
