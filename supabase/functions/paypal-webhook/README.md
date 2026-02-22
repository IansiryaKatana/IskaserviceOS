# PayPal Webhook

Handles `PAYMENT.CAPTURE.COMPLETED`: creates a tenant, subscription, and a row in `paypal_tenant_claims` so the user can claim the tenant on `/onboarding?plan=...` (matched by email via **claim-paypal-tenant**).

## PayPal Dashboard

1. **Webhooks:** Developer Dashboard → Your app → Webhooks → Add webhook.
2. **URL:** `https://<project-ref>.supabase.co/functions/v1/paypal-webhook`
3. **Event:** `PAYMENT.CAPTURE.COMPLETED` (and optionally `PAYMENT.CAPTURE.DENIED` for logging).

## Optional: Signature verification

For production you can enable webhook signature verification. Set `PAYPAL_WEBHOOK_ID` in Supabase Edge Function secrets (from the webhook subscription details). Future versions of this function can verify the `paypal-transmission-sig` header using the [PayPal verification method](https://developer.paypal.com/api/rest/webhooks/).

## Return URL for payment links

In each PayPal payment link (Starter / Lifetime), set the **return URL** to:

- **Starter:** `https://<your-app>/onboarding?plan=starter`
- **Lifetime:** `https://<your-app>/onboarding?plan=lifetime`

Customers are matched by the payer email; they must sign in with that email so **claim-paypal-tenant** can assign the tenant.
