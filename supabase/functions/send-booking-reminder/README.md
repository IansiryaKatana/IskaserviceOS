# send-booking-reminder

Sends "Reminder: your appointment" emails for bookings in the next N hours (default 24).

## Invocation

- **POST** (no body): processes appointments in the next 24 hours.
- **POST** with `{ "hours_ahead": 48 }`: processes appointments in the next 48 hours.

## Cron setup

To run daily (e.g. send reminders for tomorrow’s appointments), call this function on a schedule:

1. **Supabase cron** (Pro): use pg_cron or Scheduled Functions to `POST` to your project’s Edge Function URL daily (e.g. 10:00 UTC).
2. **External cron** (e.g. GitHub Actions, cron-job.org): `POST https://<project-ref>.supabase.co/functions/v1/send-booking-reminder` with header `Authorization: Bearer <anon-or-service-role-key>`.

Example (curl):

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/send-booking-reminder" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"hours_ahead": 24}'
```

## Secrets

- `RESEND_API_KEY`: Resend API key (optional; if missing, logs only).
- `RESEND_FROM_EMAIL`: From address (default `bookings@resend.dev`).
