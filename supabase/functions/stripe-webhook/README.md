# Stripe Webhook

Handles `checkout.session.completed`: creates a tenant, subscription, and stores the mapping in `stripe_checkout_tenants` so the user can claim the tenant on `/onboarding?plan=...&session_id=...`.

## Supabase Dashboard – Secrets

- `STRIPE_WEBHOOK_SECRET` – Webhook signing secret (Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret, starts with `whsec_`).
- `STRIPE_SECRET_KEY` – Stripe secret key (for Stripe API; the webhook uses it to construct the client).

## Stripe Dashboard – Webhook

1. Developers → Webhooks → Add endpoint.
2. Endpoint URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`.
3. Events: `checkout.session.completed`.
4. Copy the **Signing secret** into Supabase secrets as `STRIPE_WEBHOOK_SECRET`.

## Stripe Payment Link – Success URL

Set the **Success URL** (in the Payment Link settings) so it includes the Checkout Session ID:

- Starter: `https://<your-app>/onboarding?plan=starter&session_id={CHECKOUT_SESSION_ID}`
- Lifetime: `https://<your-app>/onboarding?plan=lifetime&session_id={CHECKOUT_SESSION_ID}`

Then after payment the user is redirected to onboarding and the app can call `claim-stripe-tenant` with `session_id` to assign the tenant to their account.
