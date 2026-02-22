import { useEffect, useState } from "react";
import { X, Calendar, MapPin, User, Scissors } from "lucide-react";

type CancelData = {
  booking: { booking_date: string; booking_time: string; customer_name: string; service_name: string | null; staff_name: string | null; location_name: string | null };
  tenant_name: string | null;
  tenant_slug: string | null;
  cancel_allowed?: boolean;
  cancel_message?: string | null;
};

const formatTime = (t: string) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};

export interface CancelBookingContentProps {
  token: string;
  /** When embedded in a panel (e.g. booking flow dialog). */
  embedded?: boolean;
  onBack: () => void;
  onCancelled?: () => void;
}

export function CancelBookingContent({ token, embedded, onBack, onCancelled }: CancelBookingContentProps) {
  const [loading, setLoading] = useState(!!token);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<CancelData | null>(null);

  useEffect(() => {
    if (!token) return;
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
    return () => {
      cancelled = true;
    };
  }, [token]);

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
    if (body.success) {
      setDone(true);
      onCancelled?.();
    } else {
      setError((body as { error?: string }).error ?? "Could not cancel booking.");
    }
  };

  if (loading && !data && !error) {
    return (
      <div className={embedded ? "py-4 text-center text-sm text-muted-foreground" : "flex min-h-screen items-center justify-center bg-background font-body"}>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!token || error) {
    return (
      <div className={embedded ? "space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5" : "flex min-h-screen items-center justify-center bg-background font-body px-4"}>
        <div className={embedded ? "" : "w-full max-w-md rounded-xl border border-border bg-card p-6 text-center"}>
          <X className="mx-auto h-10 w-10 text-destructive sm:h-12 sm:w-12" />
          <h2 className="mt-3 font-display text-base font-bold text-foreground sm:text-lg">Invalid or expired link</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{error || "This cancel link is invalid or the booking was already cancelled."}</p>
          <button type="button" onClick={onBack} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:text-sm">
            {embedded ? "Back" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={embedded ? "space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5" : "flex min-h-screen items-center justify-center bg-background font-body px-4"}>
        <div className={embedded ? "" : "w-full max-w-md rounded-xl border border-border bg-card p-6 text-center"}>
          <h2 className="font-display text-base font-bold text-foreground sm:text-lg">Booking cancelled</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Your appointment has been cancelled. You can book again anytime.</p>
          <button type="button" onClick={onBack} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:text-sm">
            {embedded ? "Done" : "Book again"}
          </button>
        </div>
      </div>
    );
  }

  const b = data!.booking;
  const tenantName = data!.tenant_name ?? "the business";
  const cancelAllowed = data!.cancel_allowed !== false;
  const cancelMessage = data!.cancel_message;

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-background font-body px-4 py-8"}>
      <div className={embedded ? "rounded-xl border border-border bg-card p-4 sm:p-5" : "mx-auto max-w-md rounded-xl border border-border bg-card p-6"}>
        {!embedded && <h2 className="font-display text-xl font-bold text-foreground mb-2">Cancel or reschedule</h2>}
        <p className={embedded ? "text-xs text-muted-foreground sm:text-sm" : "text-sm text-muted-foreground mb-6"}>Your appointment at {tenantName}:</p>
        <div className="mt-4 space-y-2 sm:space-y-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <Scissors className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
            <span className="text-foreground">{b.service_name ?? "Appointment"}</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
            <span>{b.booking_date} at {formatTime(b.booking_time)}</span>
          </div>
          {b.location_name && (
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
              <span>{b.location_name}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
            <span>{b.customer_name}</span>
          </div>
        </div>
        {cancelMessage && (
          <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 sm:text-sm">
            {cancelMessage}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling || !cancelAllowed}
            className="w-full rounded-xl border border-destructive bg-destructive/10 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed sm:py-3 sm:text-sm"
          >
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl border border-border py-2.5 text-center text-xs font-medium text-foreground hover:bg-secondary sm:py-3 sm:text-sm"
          >
            Keep booking (back to {tenantName})
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground sm:text-xs">
          To reschedule, cancel here then book a new time on our booking page.
        </p>
      </div>
    </div>
  );
}
