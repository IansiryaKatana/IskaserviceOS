# Payments & Trial Setup

Quick reference for getting Stripe, trial, and data removal working in production.

---

## 1. Migrations

Run pending migrations so the app and Edge Functions have the required tables:

```bash
npx supabase db push
```

Or run these in the Supabase SQL editor if `db push` is not linked:

- `supabase/migrations/20260213120000_trial_onboarding.sql` – trial, plan_type, onboarding_status, create_trial_tenant, get_my_tenant_subscription
- `supabase/migrations/20260218000000_booking_cancel_token.sql` – bookings.cancel_token
- `supabase/migrations/20260219000000_link_tenant_request_on_trial.sql` – link_tenant_request_to_tenant()
- `supabase/migrations/20260220000000_stripe_checkout_tenants.sql` – stripe_checkout_tenants table

---

## 2. Stripe (Starter / Lifetime)

### Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets)

- **STRIPE_WEBHOOK_SECRET** – From Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret (`whsec_...`)
- **STRIPE_SECRET_KEY** – Your Stripe secret key (`sk_...`)

### Webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Event: `checkout.session.completed`.

### Payment link success URL

In each Stripe Payment Link (Starter and Lifetime), set the success URL so the session ID is passed:

- **Starter:** `https://<your-app-domain>/onboarding?plan=starter&session_id={CHECKOUT_SESSION_ID}`
- **Lifetime:** `https://<your-app-domain>/onboarding?plan=lifetime&session_id={CHECKOUT_SESSION_ID}`

After payment, the user is redirected to onboarding and the app claims the tenant for them using `session_id`.

---

## 3. PayPal (Starter / Lifetime)

### Webhook (recommended)

1. PayPal Developer Dashboard → Your app → Webhooks → Add webhook.
2. URL: `https://<project-ref>.supabase.co/functions/v1/paypal-webhook`
3. Event: **PAYMENT.CAPTURE.COMPLETED**.

When a payment completes, the webhook creates a tenant and a row in `paypal_tenant_claims`. The customer is matched by **payer email** when they land on onboarding.

### Return URL for payment links

In each PayPal payment link (Starter and Lifetime), set the **return URL** to:

- **Starter:** `https://<your-app-domain>/onboarding?plan=starter`
- **Lifetime:** `https://<your-app-domain>/onboarding?plan=lifetime`

The user must sign in with the **same email** they used for PayPal so the app can call **claim-paypal-tenant** and assign the tenant to their account.

---

## 4. Trial & grace period

- **Trial:** 15 days (create_trial_tenant, Signup with plan=free).
- **Grace:** 3 days after trial end before data removal. Configurable in `src/lib/plans.ts` (`GRACE_DAYS_AFTER_TRIAL`).
- **Trial banner:** Shown in Admin when trial has ended (grace or past grace).
- **Past grace:** Admin shows a full-page “Trial ended” and calls `remove-my-expired-trial` so the user’s tenant can be removed; user is sent to Pricing.

---

## 5. Trial data removal (batch)

The Edge Function **remove-expired-trial-data** deletes tenants whose free trial ended more than the grace period ago. It uses the same grace days as the app (see function source).

**Run manually (e.g. from Supabase Dashboard or curl):**

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/remove-expired-trial-data" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

**Schedule (optional):** Use Supabase cron (Pro), pg_cron, or an external cron to POST to the function URL daily.

No JWT required; use the service role key in the `Authorization` header when calling from a cron or script.

---

## 6. Free trial signup flow

1. User clicks “Start 15-Day Free Trial” on Pricing → `/signup?plan=free`.
2. After signup, `create_trial_tenant` runs and `link_tenant_request_to_tenant` links any matching tenant request.
3. Redirect to `/onboarding?tenant_id=...` → user completes onboarding.

---

## 7. Paid (Stripe) flow

1. User clicks “Pay with Card (Stripe)” for Starter/Lifetime → Stripe Checkout.
2. Stripe sends `checkout.session.completed` to **stripe-webhook** → tenant + subscription + `stripe_checkout_tenants` row created.
3. User is redirected to `/onboarding?plan=...&session_id=cs_...`.
4. App calls **claim-stripe-tenant** with `session_id` → user is assigned as tenant_owner.
5. Redirect to `/onboarding?tenant_id=...` → user completes onboarding.
