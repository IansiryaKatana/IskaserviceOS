# Onboarding, Branding, Payment & Import/Export – Plan

## Alignment & recommendations

### 1. Branding: “Do it there or later”
- **Current:** Onboarding Step 4 says “You can add a logo and customize colors later from the Admin dashboard” but there is **no way to set logo/colors in the wizard** and **no Branding section in tenant Admin** (only Payment settings under Settings).
- **Recommendation:**  
  - **Tenant Admin → Settings:** Add a **Branding** section (logo URL, primary color) so tenants can edit logo and theme after onboarding.  
  - **Onboarding Step 4 (Branding):** Keep it optional; add an optional “Set now” form (logo URL, primary color) so they can do it in the wizard or skip and do it later in Admin.

### 2. Payment options: “Set now or later” in wizard
- **Current:** Payment settings exist only in Admin → Settings. Onboarding does not mention payment.
- **Recommendation:** Add an optional **Payment** step in the onboarding wizard (after Branding, before Done):  
  - **Set up now** – show the same Stripe/PayPal (and optionally Pay at venue) fields as in Admin so they can configure and save.  
  - **I’ll do it later** – skip and continue; they can configure in Admin → Settings when ready.  
  This matches the “set it now or later” pattern used for Branding.

### 3. Import/export – phased approach
Build in phases so each phase is testable and shippable:

| Phase | Scope | Deliverables |
|-------|--------|--------------|
| **Phase 1** | Clients | Export: CSV template + “Export clients” (current list). Import: CSV template (columns: first_name, last_name, email, phone, notes) + “Import clients” with validation and duplicate handling (e.g. match by email). |
| **Phase 2** | Bookings | Export: CSV template + “Export bookings” (existing). Import: CSV template (customer_name, customer_email, customer_phone, booking_date, booking_time, service_id or service_name, location_id or name, etc.) + “Import past bookings” with validation and optional client linking. |
| **Phase 3** | Categories, services, staff, schedules | Export: Templates (or single ZIP) for categories, services, staff, schedules. Import: Templates to create categories, then services (with category), then staff, then schedules; with validation and “replace/merge” options if needed. |

Implement **one phase at a time**; validate and deploy before moving to the next.

---

## Implementation status

- [x] Plan document (this file)
- [x] Tenant Admin Settings: Branding section (logo URL, primary color)
- [x] Onboarding: Step 4 optional branding form; new Step 5 Payment (set now / later); Step 6 Done
- [x] Phase 1: Clients – Export CSV, Download template, Import from CSV (duplicate by email = skip)
- [x] Phase 2: Bookings – Export CSV, Download template, Import from CSV (service/location/staff by name; date/time normalized)
- [x] Phase 3: Categories, services, staff, schedules – Export CSV, Download template, Import CSV for each (categories by slug; services by category name; staff by category/location name; schedules by staff name and day)
