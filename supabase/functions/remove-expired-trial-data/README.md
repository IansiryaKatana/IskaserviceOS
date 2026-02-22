# remove-expired-trial-data

Deletes tenants whose **free** trial has ended and who are **past the grace period** (3 days after trial end). Uses the same grace logic as the app (`src/lib/plans.ts`).

## When to run

- **Manually:** e.g. from Supabase Dashboard (Invoke) or curl with service role key.
- **Scheduled:** Use Supabase Pro cron, pg_cron, or an external cron to POST to this function daily.

## How to call

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/remove-expired-trial-data" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

No JWT required; the function uses the service role key from the environment. Response: `{ "removed": number, "tenantIds": string[] }` or `{ "removed": 0, "message": "..." }`.

## Grace period

Defined in this file as `GRACE_DAYS = 3`. Keep it in sync with `GRACE_DAYS_AFTER_TRIAL` in `src/lib/plans.ts` and with `remove-my-expired-trial` (on-login cleanup).
