# Iska Service OS — Phased Roadmap & Custom Domain

This document describes the phased implementation roadmap (analytics, custom domain, metadata, audit logging, email) and the **Custom Domain** feature in detail.

---

## 1. Phased Roadmap Overview

| Phase | Scope | Status |
|-------|--------|--------|
| **1a** | Tenant analytics (revenue, trends, top services/staff, location stats) | ✅ Done |
| **1b** | Platform analytics (MRR, paying tenants, booking revenue chart) | ✅ Done |
| **2a** | Custom domain (resolve tenant by hostname, show booking at `/`) | ✅ Done |
| **2b** | External Supabase client factory (optional) | ✅ Done |
| **3** | Metadata UI, audit logging usage, audit viewer; email expansion planned | ✅ Done |
| **Later** | Advanced booking, inventory/POS polish, CRM/membership, performance | Planned |

---

## 2. Phase 1 — Analytics (Done)

### 2.1 Tenant analytics
- **Hook:** `src/hooks/use-analytics.ts` — `useTenantAnalytics(period)`.
- **Metrics:** revenue, `revenueByPeriod`, top services, top staff, `locationStats`.
- **UI:** Admin → Analytics tab: period selector, stat cards, revenue trend chart, top services/staff, **Revenue by Location** (from `locationStats`).

### 2.2 Platform analytics
- **Hooks:** `src/hooks/use-platform-data.ts` (`usePlatformStats`), `src/hooks/use-analytics.ts` (`usePlatformAnalytics(period)`).
- **Metrics:** Tenants, Bookings, Services, Staff; **Paying (Starter + Lifetime)**, **MRR** (Starter × $45); booking revenue (all tenants) by period.
- **UI:** Platform page: overview stat cards (including MRR, Paying tenants), **Booking revenue (all tenants)** section with period selector and line chart.

---

## 3. Phase 2a — Custom Domain (Done)

Tenants can use a custom hostname (e.g. `booking.salon.com`). When a visitor opens that URL, the app resolves the tenant from `tenants.custom_domain` and shows the booking page at `/` (no `/t/:slug` in the URL).

### 3.1 Edge function: `get-tenant-by-domain`

- **Path:** `supabase/functions/get-tenant-by-domain/index.ts`
- **Purpose:** Resolve tenant slug by hostname. **Public** (no auth) so the client can resolve tenant on first load.
- **Input:**
  - **GET:** `?host=<hostname>` (e.g. `https://.../functions/v1/get-tenant-by-domain?host=booking.salon.com`)
  - **POST:** `{ "host": "<hostname>" }`
- **Output:** `{ "slug": "tenant-slug" }` or `404` with `{ "error": "Not found" }`.
- **Logic:** Query `tenants` where `custom_domain` matches host (case-insensitive via `ilike`) and `status = 'active'`; return that row’s `slug`. Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-side only).

**Deploy:**
```bash
supabase functions deploy get-tenant-by-domain
```

### 3.2 App configuration

- **Env (see `env.example`):**
  - `VITE_APP_MAIN_DOMAIN` — Main app hostname (e.g. `iska-service-os.netlify.app` or `app.example.com`). When the visitor’s host is **different** from this (and not localhost), the app treats the request as a custom domain and calls the edge function.
  - Leave **empty** to disable custom-domain resolution (all traffic uses the normal home/tenant routes).

### 3.3 TenantProvider (`src/hooks/use-tenant.tsx`)

- **New context value:** `tenantLoadedByDomain: boolean` — `true` when the current tenant was resolved from the request hostname.
- **On init:** If `window.location.hostname` is not `localhost`, not `127.0.0.1`, and not equal to `VITE_APP_MAIN_DOMAIN` (and `VITE_APP_MAIN_DOMAIN` is set), the app:
  1. Calls `GET .../functions/v1/get-tenant-by-domain?host=<hostname>`.
  2. On success: `setTenantBySlug(data.slug)` and `setTenantLoadedByDomain(true)`.
  3. On failure: falls back to default tenant (no custom-domain flag).

### 3.4 Root route (`src/App.tsx`)

- **Route:** `"/"` → `RootRoute`.
- **Behavior:**
  - If `tenantLoadedByDomain && tenant`: render **booking page** (`<Index />`).
  - If `tenantLoadedByDomain && loading`: show “Loading...”.
  - If `tenantLoadedByDomain && !tenant`: show “Business Not Found”.
  - Otherwise: render marketing **`<Home />`**.

### 3.5 Database

- **Table:** `tenants` (existing).
- **Column:** `custom_domain` (TEXT, nullable). Store the full hostname (e.g. `booking.salon.com`) for the tenant. No trailing slash, no scheme.

### 3.6 Setup checklist (per tenant)

1. Set `tenants.custom_domain` to the desired hostname (e.g. `booking.salon.com`).
2. Point that hostname’s DNS to your app (e.g. Netlify/Vercel).
3. Set `VITE_APP_MAIN_DOMAIN` in your build env to the main app domain.
4. Deploy the edge function `get-tenant-by-domain`.

---

## 4. Phase 2b — External Supabase Client ✅

- **Goal:** Tenant-specific Supabase client so that tenants with `deployment_type === 'external'` read/write their data (bookings, services, staff, etc.) from their own Supabase project.
- **Implemented:**
  - **`src/integrations/supabase/supabase-context.tsx`:** `SupabaseClientProvider` and `useSupabase()`. The provider runs inside `TenantProvider`; when the current tenant has `deployment_type === 'external'`, it loads `tenant_deployment_config` (supabase_url, supabase_anon_key) from the **main** DB and creates a client for that project. Otherwise it uses the default (hosted) client.
  - **App:** Wrapped in `SupabaseClientProvider` inside `TenantProvider`.
  - **Tenant-scoped hooks** now use `useSupabase()` instead of importing the default client: `use-salon-data`, `use-clients`, `use-payments`, `use-inventory`, `use-pos`, `use-site-settings`, `useTenantAnalytics`, `use-audit-logs`, `use-reviews`, `use-waitlist`. Platform-level hooks (e.g. `usePlatformAnalytics`, `usePlatformReviews`, platform data) continue to use the default client.
  - **`src/integrations/supabase/client-factory.ts`:** `getTenantClient(tenantId)` (async) and `createTenantClient(url, key)` remain for server-side or one-off use; `useTenantClient` is re-exported as `useSupabase`.
- **Security:** External tenant credentials (supabase_url, supabase_anon_key) are stored in `tenant_deployment_config` in the main DB; only anon key is used in the frontend (RLS: platform admins and tenant owners can view). Service role keys must never be in the frontend; use Edge Functions for server-only operations.

---

## 5. Phase 3 — Metadata UI, Audit Logging, Email

### 5.1 Metadata UI ✅
- **DB:** `locations`, `services`, `staff`, `bookings` have `metadata JSONB`.
- **Code:** `MetadataEditor` (`src/components/MetadataEditor.tsx`) and `src/lib/metadata-schemas.ts` define per–business-type fields (salon, spa, mechanic, clinic, fitness).
- **Implemented:** Admin service, location, and staff forms include a **Metadata** section. Form state has `metadata: Record<string, unknown>`; load/save use tenant `business_type` so schema-based fields are persisted.

### 5.2 Audit logging ✅
- **DB:** `audit_logs` table; `log_audit_event(...)` (SECURITY DEFINER). Migration `20260223000000_grant_audit_execute.sql` grants `EXECUTE` to `authenticated`.
- **Code:** `src/lib/audit.ts` — `logAuditEvent(supabase, { tenantId, userId, action, tableName, recordId, changes? })`. `useAuditLogs(tenantId, limit)` in `src/hooks/use-audit-logs.ts` reads logs.
- **Implemented:** Admin calls `logAuditEvent` after create/update/delete for **services**, **locations**, **staff**, and **bookings** (including status updates). Admin has an **Audit** tab that shows the last 100 entries (time, action, table, record id, details).

### 5.3 Email expansion ✅
- **Confirmation:** `send-booking-confirmation` — sent when a booking is created/confirmed (existing).
- **Cancellation:** `send-booking-cancellation` — “Your appointment was cancelled”. Invoked from:
  - **cancel-booking** Edge Function after a successful cancel (public cancel-by-token flow).
  - **Admin** when a booking’s status is set to `cancelled` (if `customer_email` is set).
- **Reminder:** `send-booking-reminder` — “Reminder: your appointment” for appointments in the next N hours (default 24). Invoke via **cron** (e.g. daily): `POST /functions/v1/send-booking-reminder` with optional body `{ "hours_ahead": 24 }`. Uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL` when set.
- **No-show:** `send-booking-no-show` — “Your appointment was marked as no-show”. Invoked from **Admin** when status is set to `no_show` (if `customer_email` is set).
- **Resend:** All four functions send via Resend when `RESEND_API_KEY` is set; otherwise they log and return success for development.

---

## 6. Later Phases

- **Advanced booking:** Recurring, waitlist, buffer time, etc.
- **Inventory / POS:** Polish and edge cases.
- **CRM / membership:** Client segments, memberships.
- **Performance:** Caching, query optimization, bundle size.

---

## 7. Related docs

- `PLAN_AND_ONBOARDING_RECOMMENDATIONS.md` — Plans, trial, onboarding.
- `PAYMENTS_AND_TRIAL_SETUP.md` — Payments and trial setup.
- `README.md` — Project overview and run instructions.
