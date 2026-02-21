/**
 * Plan constants for Iska Service OS
 * Plans: Free (15-day trial), Starter ($45/mo), Lifetime ($500)
 */

export const PLAN_FREE = "free";
export const PLAN_STARTER = "starter";
export const PLAN_LIFETIME = "lifetime";

export type PlanType = typeof PLAN_FREE | typeof PLAN_STARTER | typeof PLAN_LIFETIME;

export const TRIAL_DAYS = 15;
export const GRACE_DAYS_AFTER_TRIAL = 7; // Days before data removal after trial ends

export const PLANS = {
  [PLAN_FREE]: {
    name: "Free",
    price: "$0",
    period: "15-day trial",
    description: "Full access for 15 days. Upgrade to Starter or Lifetime before trial ends.",
  },
  [PLAN_STARTER]: {
    name: "Starter",
    price: "$45",
    period: "per month",
    description: "For small businesses. All features included.",
  },
  [PLAN_LIFETIME]: {
    name: "Lifetime",
    price: "$500",
    period: "one-time",
    description: "Pay once, use forever. All features included.",
  },
} as const;

export function isPaidPlan(plan: string): boolean {
  return plan === PLAN_STARTER || plan === PLAN_LIFETIME;
}

export function getTrialEndDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

export function getGraceDeadline(trialEndsAt: string): Date {
  const d = new Date(trialEndsAt);
  d.setDate(d.getDate() + GRACE_DAYS_AFTER_TRIAL);
  return d;
}

export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > new Date(trialEndsAt);
}

export function isInGracePeriod(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  const trialEnd = new Date(trialEndsAt);
  const graceDeadline = getGraceDeadline(trialEndsAt);
  const now = new Date();
  return now > trialEnd && now <= graceDeadline;
}

export function isPastGracePeriod(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > getGraceDeadline(trialEndsAt);
}
