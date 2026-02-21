import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isTrialExpired, isInGracePeriod, isPastGracePeriod } from "@/lib/plans";

export interface MySubscription {
  tenant_id: string;
  plan: string;
  plan_type: string | null;
  status: string;
  trial_ends_at: string | null;
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_tenant_subscription");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      // React Query does not allow undefined; use null for "no subscription"
      return (row ?? null) as MySubscription | null;
    },
  });
}

export function useTrialStatus() {
  const { data: sub } = useMySubscription();
  if (!sub || sub.plan_type !== "free") return null;
  const trialEndsAt = sub.trial_ends_at;
  if (!trialEndsAt) return null;
  return {
    trialEndsAt,
    isExpired: isTrialExpired(trialEndsAt),
    isInGrace: isInGracePeriod(trialEndsAt),
    isPastGrace: isPastGracePeriod(trialEndsAt),
    needsUpgrade: isTrialExpired(trialEndsAt),
  };
}
