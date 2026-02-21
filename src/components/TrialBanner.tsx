import { Link } from "react-router-dom";
import { useTrialStatus } from "@/hooks/use-my-subscription";
import { AlertTriangle } from "lucide-react";
import { GRACE_DAYS_AFTER_TRIAL } from "@/lib/plans";

export function TrialBanner() {
  const status = useTrialStatus();
  if (!status || !status.needsUpgrade) return null;

  const graceDeadline = new Date(status.trialEndsAt);
  graceDeadline.setDate(graceDeadline.getDate() + GRACE_DAYS_AFTER_TRIAL);
  const graceDaysLeft = status.isInGrace
    ? Math.max(0, Math.ceil((graceDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium ${
        status.isPastGrace ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-amber-950"
      }`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {status.isPastGrace ? (
        <span>Your trial has ended and your data will be removed. Upgrade now to keep your business data.</span>
      ) : status.isInGrace ? (
        <span>
          Your free trial has ended. Upgrade within {graceDaysLeft} days to keep your data, or it will be removed.
        </span>
      ) : (
        <span>Your free trial has ended. Upgrade to Starter or Lifetime to continue using Iska Service OS.</span>
      )}
      <Link
        to="/pricing"
        className="ml-2 shrink-0 rounded-full bg-white/20 px-3 py-1 font-semibold uppercase tracking-wider hover:bg-white/30"
      >
        Upgrade
      </Link>
    </div>
  );
}
