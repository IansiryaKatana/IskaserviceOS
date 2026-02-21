# Iska Service OS — Plan Structure & Post-Payment Onboarding

Recommendations based on your vision, PRD, current codebase, and industry standards.

---

## 1. Plan Structure (3 Plans)

| Plan | Price | Billing | Features |
|------|-------|---------|----------|
| **Free** | $0 | — | 15-day full trial. Same features as Starter. After trial: upgrade prompt; 3 days grace; then data removed. |
| **Starter** | $45/mo | Recurring | Full access. Locations, staff, services, bookings, inventory, POS, payments, analytics. |
| **Lifetime** | $500 | One-time | Same features as Starter. Pay once, use forever. |
| ~~Enterprise~~ | Custom | Contact | Keep as "Contact Sales" for custom deployments. |

**Rationale:**
- **Free 15 days**: Industry standard for appointment SaaS (Calendly, Acuity, Fresha). Lets users evaluate with real data.
- **3-day grace**: Reduces accidental churn; gives time for weekend payment.
- **Data removal**: Clear policy improves trust; aligns with GDPR “right to erasure”.
- **Starter vs Lifetime**: Appeals to different budgets—monthly flexibility vs upfront savings.

---

## 2. Database Changes

### 2.1 Extend `tenant_subscriptions`

```sql
-- Migration: add trial and plan-type support
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free' 
    CHECK (plan_type IN ('free', 'starter', 'lifetime'));
```

- `trial_ends_at`: When free trial ends.
- `plan_type`: `free` | `starter` | `lifetime` (replaces generic `plan` or used alongside it).

### 2.2 Add `onboarding_status` to tenants

```sql
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'in_progress', 'completed')),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
```

- Used to decide whether to show the onboarding wizard.
- Superadmin can still override via Platform UI if needed.

### 2.3 Link `tenant_requests` to tenants (optional)

```sql
ALTER TABLE public.tenant_requests
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
```

- When a paying user completes checkout, you can link their request → tenant for audit.

---

## 3. Trial & Data Removal Logic

### Flow

1. **Free signup** → Create tenant + `tenant_subscriptions` with `plan_type = 'free'`, `trial_ends_at = now() + 15 days`, `status = 'trialing'`.
2. **Day 15** → Trial ends. UI shows upgrade modal (cannot dismiss). Features remain usable for 3 days.
3. **Day 16–18** → Grace period. Banner: “Upgrade within 3 days or your data will be removed.”
4. **Day 19** → If not upgraded, run data removal.

### Implementation Options

| Option | Pros | Cons |
|--------|------|------|
| **Supabase cron + Edge Function** | Runs on schedule, server-side | Requires Supabase Pro for cron |
| **Supabase pg_cron** | Native, no extra infra | Postgres extension setup |
| **External cron (e.g. Vercel/Netlify)** | Works on free tier | Extra service to maintain |
| **On-login check + async job** | Simple to start | Relies on user activity |

**Recommendation:** Start with **on-login check**: when a user with `plan_type = 'free'` and `trial_ends_at + 3 days < now()` logs in, call an Edge Function or API route that:
1. Marks tenant for deletion (or sets `status = 'cancelled'`).
2. Optionally archives/removes tenant data in a single transaction.
3. Redirects user to Pricing with a “Your trial expired” message.

---

## 4. Post-Payment Onboarding Wizard (Industry Best Practices)

### 4.1 When It Runs

- **After payment** (Stripe/PayPal success) → Redirect to `/onboarding?tenant_id=...` or `/onboarding` (tenant from session).
- **First login** for a tenant with `onboarding_status = 'pending'` or `'in_progress'`.

### 4.2 Wizard Steps (Recommended Order)

Based on your PRD, metadata schemas, and “tenant setup under 5 minutes”:

| Step | Title | What Customer Does | What It Populates |
|------|-------|--------------------|-------------------|
| 1 | **Business basics** | Business name, slug, business type (salon/spa/mechanic/clinic/fitness) | `tenants.name`, `tenants.slug`, `tenants.business_type` |
| 2 | **Service categories** | Add 1–3 categories (e.g. Barber, Salon, Hair Color) | `service_categories` |
| 3 | **First location** | Location name, address, contact | `locations` |
| 4 | **Branding (optional)** | Logo upload, primary color | `tenants.logo_url`, `tenants.theme_config` |
| 5 | **Invite team (optional)** | Email(s) for staff/manager | Creates `user_roles` + invite flow (or defers) |
| 6 | **Done** | “Launch your booking page” CTA | `onboarding_status = 'completed'` |

**Superadmin finishes:**
- Assigning `tenant_owner` role to the paying user.
- Deployment config (hosted vs external).
- Custom domain (if applicable).

### 4.3 UX Guidelines

- **Progress indicator**: Step X of 6, plus checklist of completed steps.
- **Skip optional steps**: Steps 4–5 can be “Skip for now”.
- **Smart defaults**: Pre-fill from `tenant_requests` if the user came from a request.
- **Benefit copy**: e.g. “Add categories so clients can browse services” instead of “Enter category name”.
- **Mobile-first**: Each step as a single screen; bottom sheet on mobile.
- **Validation**: Per-step validation before advancing; clear error messages.

---

## 5. Payment Flow Integration

### 5.1 Platform Payments Config

Add Lifetime:

- `platform_stripe_payment_link_lifetime`
- `platform_paypal_payment_url_lifetime`

Existing Starter/Pro fields stay; adapt labels:

- Starter: $45/mo
- Lifetime: $500 one-time

### 5.2 Pricing Page Changes

- **Free**: “Start 15-Day Free Trial” → Creates tenant with trial, then redirects to onboarding (or signup).
- **Starter**: “Subscribe $45/mo” → Stripe/PayPal → success URL: `/onboarding?plan=starter`.
- **Lifetime**: “Buy Lifetime $500” → Stripe/PayPal → success URL: `/onboarding?plan=lifetime`.

### 5.3 Post-Checkout

1. **Stripe/PayPal success** → Redirect to `/onboarding?plan=starter|募ifetime` (and optionally `tenant_id` if you create the tenant server-side).
2. **If tenant doesn’t exist yet** → Create tenant + subscription (or rely on webhook).
3. **Onboarding wizard** → Collect business details; superadmin assigns roles and deployment afterward.

**Note:** With PayPal/Stripe payment links, you often don’t get a webhook until the link is configured (e.g. Stripe webhook for `checkout.session.completed`). A common pattern:

- **Option A**: Create tenant after payment via webhook; redirect to “We’re setting up your account—check your email.”
- **Option B**: Collect email on Pricing; create tenant immediately with `status = 'pending_payment'`; after payment, webhook updates subscription and marks active.

---

## 6. Implementation Phases

### Phase 1 — Plans & Pricing (1–2 days)

- [ ] Update `Pricing.tsx`: Free, Starter, Lifetime (no Enterprise CTA change).
- [ ] Add Lifetime payment links in Platform Payments.
- [ ] Update `use-platform-payment-settings` for Lifetime.
- [ ] Migration: `tenant_subscriptions.trial_ends_at`, `plan_type`; `tenants.onboarding_status`.

### Phase 2 — Trial Logic (1 day)

- [ ] On Free “Get Started”: create tenant + subscription with 15-day trial.
- [ ] Trial banner/blocker in Admin when `trial_ends_at` passed.
- [ ] Grace-period logic (3 days) and “upgrade or data removed” messaging.
- [ ] Data removal: Edge Function or on-login check (start simple).

### Phase 3 — Onboarding Wizard (2–3 days)

- [ ] Route: `/onboarding` (protected, requires auth + tenant).
- [ ] Stepper component (e.g. 6 steps).
- [ ] Steps 1–3: business basics, categories, first location (required).
- [ ] Steps 4–5: branding, team (optional/skip).
- [ ] Step 6: completion + redirect to Admin.
- [ ] `onboarding_status` updates; progress persisted.

### Phase 4 — Post-Payment Hook (1 day)

- [ ] Success redirect URLs for Stripe/PayPal to `/onboarding?plan=...`.
- [ ] If using webhooks: create/update tenant and subscription on `checkout.session.completed` (or equivalent).
- [ ] Optional: link `tenant_requests` → `tenants` when email matches.

---

## 7. Files to Create/Modify

| Purpose | Path |
|---------|------|
| Migration (trial, plan_type, onboarding) | `supabase/migrations/YYYYMMDD_trial_onboarding.sql` |
| Plan constants | `src/lib/plans.ts` (e.g. `PLAN_FREE`, `PLAN_STARTER`, `PLAN_LIFETIME`) |
| Onboarding wizard | `src/pages/Onboarding.tsx` (or `src/pages/onboarding/`) |
| Onboarding steps | `src/components/onboarding/` (BusinessStep, CategoriesStep, etc.) |
| Trial banner / blocker | `src/components/TrialBanner.tsx` (used in Admin layout) |
| Data removal | `supabase/functions/remove-expired-trial-data/index.ts` |
| Pricing page | `src/pages/Pricing.tsx` (plans, CTAs, redirects) |
| Platform Payments | `src/pages/Platform.tsx` + `use-platform-payment-settings.ts` |
| Payment options hook | Add `paypalPaymentUrlLifetime`, `stripePaymentLinkLifetime` |

---

## 8. Summary

- **3 plans**: Free (15-day trial), Starter ($45/mo), Lifetime ($500).
- **Trial**: 15 days full access, 3-day grace, then data removal.
- **Onboarding**: 6-step wizard (business, categories, location, branding, team, done); superadmin handles roles and deployment.
- **Payment**: Add Lifetime links; success redirect to `/onboarding?plan=...`.
- **DB**: `trial_ends_at`, `plan_type`, `onboarding_status`; optional `tenant_requests.tenant_id`.

This aligns with your PRD, keeps the same feature set across plans, and follows common SaaS trial and onboarding patterns.
