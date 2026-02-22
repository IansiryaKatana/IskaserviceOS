# Iska Service OS — Complete Documentation (Everything)

This document explains **every** feature and action in Iska Service OS for **Super Admins**, **Tenant Admins**, and **End Users**. Follow the steps exactly to perform each task.

---

# Part 1: Super Admin (Platform)

**Who:** You manage the entire platform: tenants, subscriptions, payments, platform admins, and tenant requests.

**How to access:** Log in with an account that has **platform admin** role, then go to **Platform** (e.g. `/platform` or use the app navigation if available).

---

## 1.1 Platform — Overview Tab

**What it does:** Shows high-level platform stats and booking revenue.

- **View:** Open Platform and ensure the **Overview** tab is selected.
- **Stats shown:** Total tenants, bookings, services, staff; paying tenants (Starter + Lifetime); MRR (Monthly Recurring Revenue); booking revenue chart over time.
- **Change period:** Use the period dropdown (Day / Week / Month) to change the date range for the revenue chart.

---

## 1.2 Platform — Tenants Tab

**What it does:** Create, edit, and delete tenants (businesses). Set branding, deployment type, and custom domain.

### Create a new tenant

1. Go to **Platform** → **Tenants**.
2. Click **Add tenant** (or equivalent “+” / “New” button).
3. Fill in:
   - **Name** — Business display name.
   - **Slug** — URL-friendly identifier (e.g. `acme-salon`). Used in URLs like `/t/acme-salon`.
   - **Business type** — Salon, Spa, Clinic, Mechanic, Fitness, or Other.
   - **Deployment type** — Usually **Hosted** (data in your main Supabase). **External** only if the tenant uses their own Supabase project.
   - **Status** — **Active** (recommended) or inactive.
   - **Subscription plan** — Free, Starter, or Lifetime (for display; actual billing is in Subscriptions).
   - **Custom domain** (optional) — e.g. `booking.salon.com`. Leave blank if not using custom domain.
   - **Logo URL** / **Favicon URL** (optional) — Full URLs to images.
4. Optionally set **Theme** (primary color, accent, fonts, border radius, panel position).
5. If **External** deployment: fill **Supabase URL** and **Supabase anon key** in the deployment section.
6. Click **Save** or **Create**.

### Edit a tenant

1. Go to **Platform** → **Tenants**.
2. Find the tenant in the list and click **Edit** (pencil icon or row action).
3. Change any fields (name, slug, business type, logo, theme, custom domain, deployment, status, subscription plan).
4. Click **Save** or **Update**.

### Delete a tenant

1. Go to **Platform** → **Tenants**.
2. Find the tenant and click **Delete** (trash icon or row action).
3. Confirm in the dialog. This removes the tenant and its related data (use with caution).

### Set tenant theme (branding)

1. Edit the tenant (see **Edit a tenant** above).
2. In the form, open the **Theme** or **Branding** section.
3. Set **Primary color**, **Primary foreground**, **Accent color**, **Tag colors**, **Fonts**, **Border radius**, **Panel position** as desired.
4. Save.

### Set custom domain for a tenant

1. Edit the tenant.
2. In **Custom domain**, enter the full hostname only (e.g. `booking.salon.com`) — no `https://` or path.
3. Save.
4. Ensure your app has `VITE_APP_MAIN_DOMAIN` set to your main app domain so custom-domain resolution works. The tenant’s DNS must point that hostname to your app.

### Set external deployment (tenant’s own Supabase)

1. Edit the tenant.
2. Set **Deployment type** to **External**.
3. In the deployment section, enter **Supabase URL** (e.g. `https://xxxxx.supabase.co`) and **Supabase anon key** from the tenant’s Supabase project.
4. Save. The app will use this client for that tenant’s data (bookings, services, staff, etc.).

---

## 1.3 Platform — Requests Tab

**What it does:** View and manage lead/demo requests from the public “Request” or “Contact” form on the homepage.

- **View list:** Go to **Platform** → **Requests**. You see all tenant requests (or filter by status if the filter exists).
- **Filter by status:** Use the status filter dropdown (e.g. Pending, Contacted, Converted) if available.
- **View details:** Click a request to see name, email, phone, company, message, business type.
- **Add or edit notes:** Open the request, type in the **Notes** field, and save.
- **Update status:** Change the request status (e.g. Pending → Contacted → Converted) and save.
- **Convert to tenant:** Use **Convert to tenant** (or equivalent). This creates a new tenant from the request and may link the request to that tenant. Follow any on-screen steps (e.g. set name, slug, business type) and confirm.

---

## 1.4 Platform — Admins Tab

**What it does:** Manage who is a **platform admin** (can access Platform and manage all tenants).

- **View list:** Go to **Platform** → **Admins**. You see users who are platform admins.
- **Add platform admin:** Click **Add admin** (or similar). Enter the user’s **email** (they must already have an account). Submit. They get platform admin rights.
- **Remove platform admin:** Find the admin in the list and click **Remove** (or trash). Confirm. They lose platform access.

---

## 1.5 Platform — Subscriptions Tab

**What it does:** Manage each tenant’s subscription (plan, status, trial end, Stripe/PayPal IDs).

- **View list:** Go to **Platform** → **Subscriptions**. You see tenant subscriptions (tenant name, plan, status, trial end, etc.).
- **Create subscription:** Click **Add** or **New**. Select **Tenant**, set **Plan** (e.g. starter, lifetime), **Status** (e.g. active, trialing, cancelled). Set **Trial ends at** if applicable. Save.
- **Edit subscription:** Click **Edit** on a row. Change plan, status, trial end, or external IDs (Stripe subscription ID, PayPal ID, etc.). Save.
- **Delete subscription:** Click **Delete** on a row and confirm. Use only when you intend to remove that subscription record.

---

## 1.6 Platform — Deployments Tab

**What it does:** Manage **external** Supabase deployment configs per tenant (URL and anon key).

- **View list:** Go to **Platform** → **Deployments**. You see tenants that have an external deployment config.
- **Add deployment config:** Click **Add** (or create from Tenants when setting a tenant to External). Select **Tenant**, enter **Supabase URL** and **Supabase anon key**. Save.
- **Edit deployment config:** Click **Edit** on a row. Update URL or anon key. Save.
- **Delete deployment config:** Click **Delete** and confirm. The tenant will fall back to hosted data if they are set to External (or you can set the tenant back to Hosted in Tenants).

---

## 1.7 Platform — Roles Tab

**What it does:** Manage **user roles per tenant** (tenant_owner, admin, manager, staff, etc.).

- **View list:** Go to **Platform** → **Roles**. You see user–tenant–role assignments.
- **Add role:** Click **Add**. Select **User** (by email or ID), **Tenant**, and **Role** (e.g. tenant_owner, admin, manager). Save.
- **Edit role:** Click **Edit** on a row. Change the **Role**. Save.
- **Remove role:** Click **Delete** on a row and confirm. The user loses that role for that tenant.

---

## 1.8 Platform — Payments Tab

**What it does:** Configure **platform-level** payment options: Stripe and PayPal keys and payment links for Starter and Lifetime.

- **Open:** Go to **Platform** → **Payments**.
- **Payment provider:** Choose **Stripe**, **PayPal**, or **None**.
- **Stripe:**
  - **Publishable key** — Your Stripe publishable key (pk_...).
  - **Payment link (Starter)** — Stripe Payment Link URL for $45/mo Starter.
  - **Payment link (Lifetime)** — Stripe Payment Link URL for $500 Lifetime.
- **PayPal:**
  - **Client ID** — PayPal client ID.
  - **Payment URL (Starter)** — PayPal payment URL for Starter.
  - **Payment URL (Lifetime)** — PayPal payment URL for Lifetime.
- Click **Save** or **Update** to store. These are used so the Pricing page can redirect users to pay; success URLs should point to `/onboarding?plan=starter` or `/onboarding?plan=lifetime` (and Stripe should use `session_id={CHECKOUT_SESSION_ID}` in success URL for claim flow).

---

## 1.9 Platform — Media Tab

**What it does:** If your build includes a Media tab, it is for managing platform or tenant media assets (e.g. images). Use the on-screen upload/browse/delete actions as shown in the UI.

---

# Part 2: Tenant Admin (Admin Dashboard)

**Who:** You run one (or more) businesses (tenants) and manage services, staff, bookings, clients, payments, inventory, POS, waitlist, membership, and settings.

**How to access:** Log in, then go to **Admin** (e.g. `/admin`). Use the **tenant switcher** at the top if you have access to multiple tenants to switch the active tenant.

---

## 2.1 Switching Tenants

- At the top of Admin, use the **tenant switcher** dropdown (or list).
- Select the tenant you want to manage. All tabs (Analytics, Services, Bookings, etc.) then show that tenant’s data.

---

## 2.2 Admin — Analytics Tab

**What it does:** Revenue, booking counts, and trends for the current tenant.

- **Open:** Click **Analytics** in the Admin sidebar/tabs.
- **Period:** Use **Day**, **Week**, or **Month** to change the date range.
- **You see:** Total revenue, total bookings, average booking value, confirmed/cancelled/pending counts; revenue trend chart; top services; top staff; revenue by location.

---

## 2.3 Admin — Services Tab

**What it does:** Create, edit, and delete services. Import/export CSV. Download template.

### Create a service

1. Go to **Admin** → **Services**.
2. Click **Add** (or **New service**).
3. Fill in: **Name**, **Description**, **Duration (minutes)**, **Buffer (minutes)** (optional, blocks next slot after booking), **Price**, **Category** (select existing category), **Sort order**, **Active** (on/off). Add **Metadata** if the form has it. Upload **Image** if available.
4. Click **Save** or **Create**.

### Edit a service

1. In **Services**, find the service and click **Edit** (pencil).
2. Change any fields. Click **Save** or **Update**.

### Delete a service

1. In **Services**, find the service and click **Delete** (trash).
2. Confirm. The service is removed.

### Export services to CSV

1. In **Services**, click **Export CSV**.
2. A file downloads with current services (name, description, duration, price, category, sort order, active).

### Download services import template

1. Click **Download template**.
2. A CSV with a header and 10 sample rows downloads. Fill in your data (same columns as export), then use **Import CSV** to upload.

### Import services from CSV

1. Click **Import CSV** and choose a file.
2. File must have a header row and columns matching the template (e.g. Name, Description, Duration (min), Price, Category name, Sort order, Active). Rows without a name are skipped.
3. After import, a success message shows how many were imported and how many skipped.

---

## 2.4 Admin — Categories Tab (Service Categories)

**What it does:** Create, edit, delete service categories. Import/export and template.

### Create a category

1. Go to **Admin** → **Categories**.
2. Click **Add**. Enter **Name**, **Slug** (or leave blank to auto-generate), **Description**, **Tag color** (hex optional), **Sort order**, **Active**. Save.

### Edit / Delete category

1. In **Categories**, click **Edit** or **Delete** on a category. Confirm for delete.

### Export / Download template / Import

- **Export CSV** — Downloads all categories.
- **Download template** — CSV with 10 sample rows.
- **Import CSV** — Select file; rows must have Name (and optionally Slug, Description, Tag color, Sort order, Active). Duplicate slugs are skipped.

---

## 2.5 Admin — Bookings Tab

**What it does:** View, filter, and update booking status. Create booking. Export and template.

### View and filter bookings

1. Go to **Admin** → **Bookings**.
2. List shows bookings (customer, date, time, service, staff, location, status, total). Use **pagination** if shown.
3. Use **status filter** (e.g. Pending, Confirmed, Cancelled) if available.

### Change booking status

1. Find the booking. Click **Edit** or the status dropdown/button.
2. Set status to **Confirmed**, **Cancelled**, **No-show**, or **Pending** as allowed.
3. Save. If you have email features on, cancellation or no-show may trigger an email.

### Create a booking manually

1. In **Bookings**, click **Add booking** (or equivalent).
2. Fill: **Customer name**, **Email**, **Phone**, **Date**, **Time**, **Service**, **Location**, **Staff** (or “any”), **Total price**, **Status**.
3. Save.

### Export bookings / Download template / Import

- **Export CSV** — Downloads bookings (customer, email, phone, date, time, service, location, staff, total, status).
- **Download template** — CSV with 10 sample rows for import format.
- **Import CSV** — Upload a file with the same columns; each row creates a booking (if your import supports it).

---

## 2.6 Admin — Clients Tab

**What it does:** Manage clients (contacts). Filter by tag. Assign membership plan. Import/export and template.

### View and filter clients

1. Go to **Admin** → **Clients**.
2. Use **Filter by tag** to show only clients with a given tag.
3. List shows client name, email, phone, notes, tags. Use pagination if shown.

### Create a client

1. Click **Add** or **New client**.
2. Fill **First name**, **Last name**, **Email**, **Phone**, **Notes**, **Tags** (comma-separated, e.g. VIP, returning).
3. Click **Create Client** or **Save**.

### Edit a client

1. Click **Edit** on a client (or open client form with that client).
2. Change any fields. Click **Update Client** or **Save**.

### Assign or change membership plan (edit client only)

1. **Edit** the client (see above).
2. In the form you see **Membership plan**: current plan or “No plan assigned.”
3. In **Membership plan** dropdown, select a plan (from your Membership tab).
4. Click **Assign**. The client is now linked to that plan (one plan per client).
5. To remove: click **Remove plan**.

### Delete a client

1. Find the client and click **Delete**. Confirm.

### Export / Download template / Import

- **Export CSV** — Downloads clients (first name, last name, email, phone, notes).
- **Download template** — CSV with 10 sample rows.
- **Import CSV** — Choose file; columns: First name, Last name, Email, Phone, Notes. Rows without at least email or phone may be skipped.

---

## 2.7 Admin — Payments Tab

**What it does:** View payments, add payment, see revenue stats. Export and template.

### View payments

1. Go to **Admin** → **Payments**.
2. You see total revenue, refunds, net revenue (if stats are enabled), and a list of payments (amount, method, status, date). Use pagination if shown.

### Add a payment manually

1. Click **Add Payment**.
2. Enter **Amount**, **Method** (e.g. cash, card), **Status** (e.g. succeeded). Link to **Booking** or **Client** if the form has those fields.
3. Save.

### Export / Download template

- **Export CSV** — Downloads payments (amount, method, status, date).
- **Download template** — CSV with 10 sample rows (for reference; payments are usually created by POS or bookings).

---

## 2.8 Admin — Inventory Tab

**What it does:** Manage stock items (products). Adjust stock. Import/export and template.

### Create a stock item

1. Go to **Admin** → **Inventory**.
2. Click **Add Item**.
3. Fill: **Name**, **SKU** (optional), **Description**, **Quantity**, **Unit** (e.g. each, box), **Cost price**, **Sell price**, **Min stock** (alert when below), **Category**, **Active** (visible in POS).
4. Save.

### Edit / Delete stock item

1. In **Inventory**, click **Edit** or **Delete** on an item. For delete, confirm.

### Adjust stock

1. Click **Adjust stock** (or similar) on an item.
2. Enter **Quantity delta** (positive to add, negative to subtract), **Type** (e.g. purchase, sale, return, adjustment), **Notes**.
3. Click **Apply**. Quantity and stock transactions update.

### Export / Download template / Import

- **Export CSV** — Downloads stock items (name, SKU, description, quantity, unit, cost, sell price, min stock, category, active).
- **Download template** — CSV with 10 sample rows.
- **Import CSV** — Upload file with same columns; each row creates a stock item (name required; sell price must be ≥ 0).

---

## 2.9 Admin — POS Tab

**What it does:** Point-of-sale: add items to cart, select client (optional), complete sale. View today’s and week’s sales.

### Make a sale

1. Go to **Admin** → **POS**.
2. **Add items:** From the list of active stock items, click to add (or set quantity). Each item shows sell price; total updates.
3. **Optional:** Select a **Client** so the sale is linked and their total spent can update.
4. Click **Complete sale** (or **Checkout**). Choose **Payment method** (e.g. cash, card) if prompted. Confirm.
5. Sale is recorded; stock is reduced; payment row created; client total spent updated if client was selected.

### View sales and revenue

- **Today’s Sales** / **Today’s Revenue** — Count and total for today.
- **This week** / **Week revenue** — Count and total for the current week.
- List of recent POS sales may appear below; use it to review past transactions.

---

## 2.10 Admin — Locations Tab

**What it does:** Manage business locations. Import/export and template.

### Create a location

1. Go to **Admin** → **Locations**.
2. Click **Add**. Enter **Name**, **Address**, **City**, **Phone**, **Email**, **Sort order**, **Active**. Save.

### Edit / Delete location

1. Click **Edit** or **Delete** on a location. Confirm for delete.

### Export / Download template / Import

- **Export CSV** — Downloads locations (name, address, city, phone, email, sort order, active).
- **Download template** — CSV with 10 sample rows.
- **Import CSV** — Upload file with same columns; each row creates a location (name required).

---

## 2.11 Admin — Staff Tab

**What it does:** Manage staff (service providers). Import/export and template.

### Create staff

1. Go to **Admin** → **Staff**.
2. Click **Add**. Enter **Name**, **Title**, **Category** (slug, e.g. barber), **Bio**, **Location** (optional), **Sort order**, **Active**. Add **Metadata** if the form has it. Save.

### Edit / Delete staff

1. Click **Edit** or **Delete** on a staff member. Confirm for delete.

### Export / Download template / Import

- **Export CSV** — Exports staff (name, title, category, bio, location name, sort order, active).
- **Download template** — CSV with 10 sample rows.
- **Import CSV** — Upload file; columns: Name, Title, Category (slug), Bio, Location name, Sort order, Active. Name required; location matched by name.

---

## 2.12 Admin — Schedules Tab

**What it does:** Manage staff availability (day of week, start time, end time).

### Create a schedule entry

1. Go to **Admin** → **Schedules**.
2. Click **Add**. Select **Staff**, **Day** (e.g. Monday), **Start time**, **End time**, **Available** (on/off). Save.

### Edit / Delete schedule

1. Click **Edit** or **Delete** on a schedule row. Confirm for delete.

### Export / Download template / Import

- **Export CSV** — Exports schedules (staff name, day, start time, end time, available).
- **Download template** — CSV with 10 sample rows.
- **Import CSV** — Upload file; columns: Staff name, Day, Start time, End time, Available. Staff matched by name; day can be name or number (0–6).

---

## 2.13 Admin — Waitlist Tab

**What it does:** View and manage waitlist entries (e.g. for fully booked dates).

### View waitlist

1. Go to **Admin** → **Waitlist**.
2. Use **Status** filter (e.g. Pending, Notified, Converted, Expired, Cancelled) and **Date** filter if available.
3. List shows entries (name, contact, date, service, notes, status).

### Mark as notified

1. Find a **Pending** entry. Click **Mark notified** (or equivalent). Status becomes Notified.

### Mark as converted

1. Find an entry. Click **Converted**. Status becomes Converted (e.g. they booked).

### Cancel entry

1. Find an entry. Click **Cancel**. Status becomes Cancelled.

---

## 2.14 Admin — Membership Tab

**What it does:** Manage **membership plans** (e.g. monthly/yearly plans). Does not assign plans to clients (that is in Clients → Edit client → Membership plan).

### Create a membership plan

1. Go to **Admin** → **Membership**.
2. Click **Add plan** (or **New plan**).
3. Enter **Name**, **Slug**, **Description**, **Price**, **Billing interval** (Monthly, Yearly, One-time), **Active** (on/off). Save.

### Edit / Delete plan

1. Click **Edit** or **Delete** on a plan. Confirm for delete. Deleting a plan does not automatically remove client_memberships; handle those in Clients if needed.

---

## 2.15 Admin — Audit Tab

**What it does:** View audit log of recent actions (create/update/delete on services, locations, staff, bookings, etc.).

- **Open:** Go to **Admin** → **Audit**.
- You see a list of events: time, action (e.g. create, update, delete), table name, record ID, and optional details. Use for compliance and debugging.

---

## 2.16 Admin — Settings Tab

**What it does:** Tenant-level settings: payment options (Stripe, PayPal, M-Pesa, pay at venue), site settings, cancel policy, branding.

### Payment settings (Stripe / PayPal / M-Pesa)

1. Go to **Admin** → **Settings**.
2. Find **Payment** or **Payments** section.
3. **Stripe:** Enter **Publishable key**; optional webhook or payment intent config if your app uses it.
4. **PayPal:** Enter **Client ID** (and secret if stored for server-side).
5. **M-Pesa:** Enter keys/shortcode/passkey if the form has them.
6. **Pay at venue:** Toggle **Allow pay at venue** so customers can request a booking without online payment.
7. Save.

### Site settings

- If **Settings** includes **Site** or **General** (e.g. business name, contact, homepage image keys), fill and save.

### Cancel / no-show policy

- **Cancel by hours:** How many hours before the appointment a customer can cancel (e.g. 24).
- **No-show after minutes:** Optional; mark as no-show if customer doesn’t show within X minutes. Save.

### Branding (tenant)

- Logo, favicon, or theme may be in **Settings** or in **Tenant** (Platform). Update as needed and save.

---

# Part 3: End Users & Customers

**Who:** Customers who book appointments, cancel, create an account, or view reviews.

---

## 3.1 Home Page

- **URL:** `/` (when not using a custom domain for a tenant).
- **What you see:** Marketing home: hero, list of example businesses (tenants), use cases, and often a **Request** or **Contact** form.
- **Book a business:** Click a business card or “Book” to go to that tenant’s booking page (e.g. `/t/{slug}`).
- **Request demo/contact:** Fill the request form (name, email, phone, company, message, business type) and submit. A Super Admin sees it in Platform → Requests.

---

## 3.2 Pricing Page

- **URL:** `/pricing`.
- **What you see:** Plans (Free 15-day trial, Starter $45/mo, Lifetime $500, Enterprise Contact).
- **Start free trial:** Click **Start 15-Day Free Trial** → redirects to `/signup?plan=free`. After signup you get a tenant and go to onboarding.
- **Subscribe (Starter):** Click **Subscribe $45/mo** → redirects to Stripe or PayPal (using platform payment links). After payment, you are redirected to `/onboarding?plan=starter` (and optionally `session_id` for Stripe). Complete onboarding.
- **Buy Lifetime:** Click **Buy Lifetime $500** → same flow with Lifetime payment link; then `/onboarding?plan=lifetime`.
- **Enterprise:** Click **Contact Sales** → typically opens email or contact form.

---

## 3.3 Sign Up

- **URL:** `/signup` or `/signup?plan=free`.
- **Free trial:** If `plan=free`, form may ask: Name, Email, Password, Business name, Business URL (slug), Business type. Submit → account created, trial tenant created, redirect to `/onboarding?tenant_id=...`.
- **Other plans:** If no plan or plan other than free, form may be standard (email, password). After signup you confirm email and then sign in; you can go to Pricing to choose a plan.

---

## 3.4 Log In (Admin / Account)

- **URL:** `/login`.
- Enter **Email** and **Password**. Click **Sign In**. If you don’t have an account, use **Sign up** (or go to `/signup`).
- After sign-in you are redirected to **Admin** (or Account/Home depending on app). Use **Platform** only if your account is a platform admin.

---

## 3.5 Booking Flow (Customer)

- **URL:** `/t/{slug}` (e.g. `/t/acme-salon`) or custom domain (e.g. `booking.salon.com` if configured).
- **Step 1 — Location:** Choose a location. Click **Next**.
- **Step 2 — Service:** Choose a service (and optionally a category filter). Click **Next**.
- **Step 3 — Specialist:** Choose a staff member or “Any available.” Click **Next**.
- **Step 4 — Date & time:** Pick a date and a time slot from available slots. Click **Next**.
- **Step 5 — Details:** Enter **Name**, **Email**, **Phone** (with country code). Optionally enable **Repeat weekly** and choose **Number of appointments** (2–12). Then choose payment:
  - **Pay at venue:** Click **Request booking (pay at venue)**. One booking (or multiple if repeat weekly) is created; confirmation appears; cancel link may be emailed.
  - **Pay with PayPal:** Click **Pay with PayPal**, complete in PayPal popup; booking(s) created after payment.
  - **Pay with Card (Stripe):** Click **Pay with Card**, enter card details, confirm; booking(s) created after payment.
  - **M-Pesa:** Click **Pay with M-Pesa**, enter phone, confirm; after you complete the prompt on your phone, click **I've paid – confirm booking** to create booking(s).
- **Confirmation:** You see a summary (service, specialist, location, date, time, total). If you chose repeat weekly, you see “You have N upcoming weekly appointments.” A **cancel link** may be shown and sent by email.

---

## 3.6 Cancel a Booking (Customer)

- **URL:** `/t/{slug}/cancel?token=...` (token is in the confirmation email or on the confirmation screen).
- Open the link. The page loads the booking details (date, time, service, customer name).
- Click **Cancel booking** (or similar). Confirm. The booking status becomes **Cancelled**; a cancellation email may be sent.

---

## 3.7 My Account (Logged-in User)

- **URL:** `/account` (after login).
- **Bookings tab:** View your upcoming and past bookings (linked to your user_id). Click **Book an appointment** to go to home or a tenant.
- **Profile tab:** View and edit **Display name** and **Phone**. Click **Edit**, change fields, **Save**.
- **Sign out:** Click **Log out** (or similar) to sign out.

---

## 3.8 Onboarding (New Tenant Owner)

- **URL:** `/onboarding?tenant_id=...` or `/onboarding?plan=starter&session_id=...` (after payment).
- **When:** After free trial signup or after Stripe/PayPal payment for Starter/Lifetime.
- **Steps (typical):**
  1. **Business basics** — Confirm or edit business name, slug, business type. Save and continue.
  2. **Service categories** — Add one or more categories (e.g. Barber, Salon). Save and continue.
  3. **First location** — Add location name, address, city, phone. Save and continue.
  4. **Branding (optional)** — Logo, primary color. Skip or save.
  5. **Payment (optional)** — Stripe/PayPal keys or “Set up later.” Save or skip.
  6. **Done** — “Launch your booking page” or “Go to Admin.” Click to go to Admin or your booking page.
- **Completion:** `onboarding_status` is set to completed; you can then use Admin and your public booking page.

---

## 3.9 Reviews (Public)

- **URL:** `/reviews` (platform reviews) or `/t/{slug}/reviews` (tenant reviews).
- **Platform reviews:** List or summary of reviews across the platform (if enabled).
- **Tenant reviews:** List or summary of reviews for that tenant. Customers may be able to leave a review from a link after a booking (if that feature exists).

---

# Quick Reference — Where to Do What

| I want to… | Where |
|------------|--------|
| Manage all businesses (tenants) | Platform → Tenants |
| Manage who can access Platform | Platform → Admins |
| Set Stripe/PayPal for the whole platform | Platform → Payments |
| Manage a tenant’s subscription | Platform → Subscriptions |
| Give a user a role on a tenant | Platform → Roles |
| Handle contact/demo requests | Platform → Requests |
| View platform stats and revenue | Platform → Overview |
| Manage services, staff, locations | Admin → Services / Staff / Locations |
| Manage categories and schedules | Admin → Categories / Schedules |
| View or change bookings | Admin → Bookings |
| Manage clients and assign membership | Admin → Clients |
| View or add payments | Admin → Payments |
| Manage inventory and POS | Admin → Inventory / POS |
| Manage waitlist | Admin → Waitlist |
| Manage membership plans | Admin → Membership |
| View audit log | Admin → Audit |
| Change tenant payment or site settings | Admin → Settings |
| Book an appointment | Home → choose business → `/t/{slug}` or custom domain |
| Cancel my booking | Link in email or `/t/{slug}/cancel?token=...` |
| Sign up / Log in | `/signup`, `/login` |
| Choose a plan and pay | `/pricing` |
| Set up my business after signup/payment | `/onboarding` |
| View my bookings and profile | `/account` |

---

---

# Appendix A: Environment Variables

- **VITE_SUPABASE_URL** — Your Supabase project URL (e.g. `https://xxxxx.supabase.co`). Required.
- **VITE_SUPABASE_PUBLISHABLE_KEY** — Supabase anon (public) key. Required.
- **VITE_APP_MAIN_DOMAIN** — Your main app domain (e.g. `your-app.netlify.app`). When a visitor’s host is different (and not localhost), the app treats it as a custom domain and resolves the tenant by `custom_domain`. Leave empty to disable custom-domain detection.
- **Edge Function secrets** (in Supabase Dashboard → Project Settings → Edge Functions → Secrets):
  - **STRIPE_SECRET_KEY** / **STRIPE_WEBHOOK_SECRET** — For Stripe payment and webhooks.
  - **PayPal:** PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET; PAYPAL_MODE=live for production.
  - **RESEND_API_KEY**, **RESEND_FROM_EMAIL** — For booking emails (confirmation, cancellation, reminder, no-show).

---

# Appendix B: Custom Domain (Customer Experience)

- **Super Admin:** In Platform → Tenants → Edit tenant, set **Custom domain** to the tenant’s hostname (e.g. `booking.salon.com`). No `https://` or path.
- **DNS:** The tenant points that hostname to your app (e.g. Netlify/Vercel).
- **App:** Set **VITE_APP_MAIN_DOMAIN** to your main app domain. When someone visits `booking.salon.com`, the app calls the `get-tenant-by-domain` Edge Function, gets the tenant slug, and shows the **booking page at `/`** (no `/t/slug` in the URL).
- **Customer:** They open `https://booking.salon.com` and see the same booking flow as `/t/{slug}` but with a clean URL.

---

# Appendix C: Emails (Confirmation, Cancellation, Reminder, No-Show)

- **Confirmation:** Sent when a booking is created or confirmed (e.g. after pay-at-venue request or after Stripe/PayPal/M-Pesa). Requires RESEND_API_KEY and RESEND_FROM_EMAIL in Edge Function secrets.
- **Cancellation:** Sent when a booking is cancelled (from cancel link or from Admin → Bookings → set status to Cancelled).
- **Reminder:** Sent by the `send-booking-reminder` Edge Function (e.g. 24 hours before). Run via cron: `POST /functions/v1/send-booking-reminder` with optional body `{ "hours_ahead": 24 }`. Use Supabase cron or external scheduler with service role key.
- **No-show:** Sent when Admin sets a booking’s status to **No-show** (if customer email exists).

---

*This document covers every main feature and action in Iska Service OS as of the current codebase. If a button or tab is named slightly differently in your deployment, use the closest match above.*
