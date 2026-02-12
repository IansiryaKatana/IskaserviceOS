# What's Left to Build - Prioritized Implementation Guide

## 🎯 Current Status: ~70% Complete

**✅ Fully Implemented:**
- Multi-tenant infrastructure with RLS
- Theme engine (white-label branding)
- Core booking system
- Full Platform CRUD (tenants, admins, subscriptions, deployments, roles)
- Admin CRUD for all tenant resources
- Role-based access control

---

## 🔴 CRITICAL - Build These First (Production Blockers)

### 1. **Enhanced Analytics Dashboard** ⚠️ HIGH IMPACT
**Current State:** Only basic counts (tenants, bookings, services, staff)  
**What's Missing:**
- Revenue tracking (daily, weekly, monthly)
- Booking trends and conversion rates
- Popular services/staff rankings
- Location performance comparison
- Platform-level MRR/churn metrics

**Implementation:**
```typescript
// Create: src/hooks/use-tenant-analytics.ts
export function useTenantRevenue(tenantId: string, period: 'day' | 'week' | 'month') {
  return useQuery({
    queryKey: ["tenant-revenue", tenantId, period],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("total_price, booking_date, status")
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .gte("booking_date", getPeriodStart(period));
      
      return {
        total: data?.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) || 0,
        count: data?.length || 0,
        average: data?.length ? total / data.length : 0,
      };
    },
  });
}
```

**UI Components Needed:**
- Revenue chart (Line/Bar chart using recharts)
- Booking trends chart
- Top services/staff cards
- Analytics tab in Admin page

**Database Optimization:**
```sql
-- Create materialized view for performance
CREATE MATERIALIZED VIEW booking_revenue_daily AS
SELECT 
  tenant_id,
  DATE(booking_date) as date,
  COUNT(*) as booking_count,
  SUM(total_price) as revenue,
  AVG(total_price) as avg_value
FROM bookings
WHERE status = 'confirmed'
GROUP BY tenant_id, DATE(booking_date);

-- Refresh daily via cron or trigger
```

**Priority:** 🔴 CRITICAL - Needed for business insights

---

### 2. **External Supabase Client Factory** ⚠️ PARTIALLY DONE
**Current State:** UI exists, but no dynamic client switching  
**What's Missing:**
- Client factory that routes to correct Supabase instance
- Service role key encryption/decryption
- Server-side proxy for external operations

**Implementation:**
```typescript
// Create: src/integrations/supabase/client-factory.ts
import { createClient } from '@supabase/supabase-js';
import { supabase } from './client';
import { useTenant } from '@/hooks/use-tenant';

export async function getTenantClient(tenantId: string) {
  // Fetch tenant and deployment config
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, tenant_deployment_config(*)')
    .eq('id', tenantId)
    .single();
  
  if (tenant?.deployment_type === 'external' && tenant.tenant_deployment_config) {
    const config = tenant.tenant_deployment_config;
    // For external, create client with their credentials
    // NOTE: Service role key should be stored encrypted and decrypted server-side only
    return createClient(config.supabase_url!, config.supabase_anon_key!);
  }
  
  // Default to hosted client
  return supabase;
}
```

**Security Requirements:**
- Store service role keys in Supabase Vault (encrypted)
- Never expose service keys to frontend
- Use Edge Functions for operations requiring service role
- Add audit logging for external database access

**Priority:** 🔴 CRITICAL - Blocks external deployment revenue model

---

### 3. **Payment Processing (Stripe)** ❌ NOT STARTED
**Current State:** Subscription table has Stripe fields, but no payment flow  
**What's Missing:**
- Payments table
- Stripe integration (Elements, Payment Intents)
- Webhook handling
- Invoice generation
- Refund support

**Database Schema:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  tenant_id UUID REFERENCES tenants(id),
  stripe_payment_intent_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- pending, succeeded, failed, refunded
  payment_method TEXT, -- card, cash, online
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);
```

**Implementation Steps:**
1. Install Stripe: `npm install @stripe/stripe-js @stripe/react-stripe-js`
2. Create payment flow component
3. Add Stripe config to tenant_deployment_config (encrypted)
4. Create Edge Function for webhook handling
5. Add payment status to booking confirmation

**Priority:** 🔴 CRITICAL - Needed for monetization

---

## 🟡 HIGH PRIORITY (Feature Completeness)

### 4. **Client Management System** ⚠️ PARTIAL
**Current State:** Bookings have customer_name/email/phone, but no client table  
**What's Missing:**
- Dedicated clients table
- Client history tracking
- Client preferences (favorite services/staff)
- Client notes (medical history for clinics)
- Loyalty points system

**Database Schema:**
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Optional, for authenticated clients
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  preferences JSONB DEFAULT '{}'::jsonb, -- { favorite_services: [], favorite_staff: [] }
  notes TEXT, -- Medical history, allergies, special requests
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  last_booking_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_user ON clients(user_id);
```

**Features to Build:**
- Auto-create clients from booking form (match by email/phone)
- Client search in Admin
- Client profile view with booking history
- Client preferences (auto-suggest favorite services/staff)
- Client notes editor

**Priority:** 🟡 HIGH - Improves customer experience significantly

---

### 5. **Metadata System for Industry Flexibility** ⚠️ PARTIAL
**Current State:** Metadata columns exist but not utilized  
**What's Missing:**
- Metadata editor UI in Admin
- Schema validation per business_type
- Metadata-based filtering in booking flow

**Implementation:**
```typescript
// Create: src/lib/metadata-schemas.ts
export const BUSINESS_METADATA_SCHEMAS = {
  mechanic: {
    requires_bay: { type: 'boolean', default: false, label: 'Requires Service Bay' },
    requires_lift: { type: 'boolean', default: false, label: 'Requires Lift' },
    bay_number: { type: 'number', optional: true, label: 'Bay Number' },
    max_vehicle_size: { type: 'string', enum: ['small', 'medium', 'large'], optional: true },
  },
  spa: {
    requires_room: { type: 'boolean', default: true, label: 'Requires Private Room' },
    gender_preference: { type: 'boolean', default: false, label: 'Gender-Specific Service' },
    room_type: { type: 'string', enum: ['single', 'couples'], default: 'single' },
  },
  clinic: {
    requires_room: { type: 'boolean', default: true },
    room_type: { type: 'string', enum: ['consultation', 'examination', 'procedure'] },
    equipment_required: { type: 'array', items: 'string', optional: true },
  },
  fitness: {
    max_capacity: { type: 'number', default: 20 },
    equipment_required: { type: 'array', items: 'string', optional: true },
    class_type: { type: 'string', enum: ['group', 'personal', 'both'] },
  },
};
```

**UI Component:**
- Dynamic metadata editor based on business_type
- Validation based on schema
- Use in service/location forms

**Priority:** 🟡 HIGH - Enables true industry-agnostic platform

---

### 6. **Custom Domain Support** ❌ NOT STARTED
**Current State:** Custom domain field exists, but no routing  
**What's Missing:**
- Domain verification system
- Middleware/routing logic
- DNS configuration guide

**Implementation Options:**

**Option A: Vercel/Netlify (Easiest)**
- Use their custom domain API
- Automatic SSL
- Built-in domain verification

**Option B: Vite + Middleware**
```typescript
// Create: src/middleware.ts (if using Vite with SSR plugin)
export function getTenantFromDomain(hostname: string) {
  // Query tenants table for custom_domain match
  // Return tenant slug
}
```

**Priority:** 🟡 HIGH - Needed for true white-label experience

---

## 🟢 MEDIUM PRIORITY (Nice to Have)

### 7. **Audit Logging System** ❌ NOT STARTED
**What's Missing:**
- Track all sensitive operations
- GDPR compliance
- Security monitoring

**Database Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,
  action TEXT NOT NULL, -- create, update, delete, view
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB, -- { old: {...}, new: {...} }
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

**Implementation:**
- Create database triggers for automatic logging
- Add manual logging for sensitive operations
- Build audit log viewer in Platform dashboard

**Priority:** 🟢 MEDIUM - Important for compliance, not blocking

---

### 8. **Email Notifications System** ⚠️ PARTIAL
**Current State:** Edge Function exists for booking confirmation  
**What's Missing:**
- Email templates
- Multiple notification types (reminders, cancellations, confirmations)
- Tenant-configurable email settings
- SMS notifications (optional)

**Implementation:**
- Use Supabase Edge Functions with Resend/SendGrid
- Create email template system
- Add notification preferences per tenant
- Build notification history

**Priority:** 🟢 MEDIUM - Improves user experience

---

### 9. **Advanced Booking Features** ⚠️ PARTIAL
**What's Missing:**
- Recurring bookings
- Waitlist functionality
- Booking modifications (reschedule)
- Cancellation policies
- Booking reminders

**Priority:** 🟢 MEDIUM - Enhances booking system

---

## 🔵 FUTURE PHASES (Phase 3-4 from PRD)

### 10. **Inventory + POS System**
- Generic stock_items table
- Stock transactions
- Link to services
- Inventory management UI

### 11. **CRM + Membership**
- Loyalty programs
- Subscription plans (client memberships)
- Package booking bundles
- Review/rating system

---

## 🚀 PERFORMANCE & SCALABILITY IMPROVEMENTS

### Immediate Optimizations:
1. **Code Splitting**
   ```typescript
   // Split routes
   const Platform = lazy(() => import('./pages/Platform'));
   const Admin = lazy(() => import('./pages/Admin'));
   ```

2. **Image Optimization**
   - Use WebP format
   - Lazy loading for service images
   - CDN for static assets

3. **Database Indexing**
   - Add composite indexes for common queries
   - Consider partitioning bookings table at scale

4. **Caching Strategy**
   - Increase React Query stale time for static data
   - Cache tenant configs
   - Use service workers for offline support

---

## 🎨 UI/UX IMPROVEMENTS

### Quick Wins:
1. **Loading States**
   - Skeleton loaders instead of "Loading..."
   - Progressive image loading

2. **Error Handling**
   - Better error messages
   - Retry mechanisms
   - Offline detection

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

4. **Mobile Optimizations**
   - Touch gestures
   - Better mobile forms
   - Swipe actions

---

## 📊 RECOMMENDED IMPLEMENTATION ORDER

### Week 1-2: Critical Infrastructure
1. ✅ Enhanced Analytics (revenue, trends, charts)
2. ✅ External Supabase Client Factory
3. ✅ Payment Processing (Stripe)

### Week 3-4: Feature Completeness
4. ✅ Client Management System
5. ✅ Metadata System
6. ✅ Custom Domain Routing

### Week 5-6: Polish & Scale
7. ✅ Audit Logging
8. ✅ Email Notifications
9. ✅ Performance Optimizations

### Week 7+: Advanced Features
10. Inventory/POS
11. CRM/Membership
12. Advanced booking features

---

## 💡 MY RECOMMENDATIONS FOR IMMEDIATE IMPROVEMENTS

### 1. **Add Analytics Dashboard** (Highest ROI)
- Quick to implement
- High business value
- Uses existing data
- Visual impact for demos

### 2. **Implement Client Management** (High User Value)
- Improves customer experience
- Enables personalization
- Foundation for loyalty programs

### 3. **Add Payment Processing** (Revenue Critical)
- Enables monetization
- Industry standard expectation
- Stripe is well-documented

### 4. **Build Metadata System** (Flexibility)
- Makes platform truly industry-agnostic
- Differentiates from competitors
- Enables future expansion

### 5. **Performance Optimizations** (Technical Debt)
- Improves user experience
- Reduces server costs
- Better SEO

---

## 🎯 ESTIMATED TIMELINE

**Minimum Viable Product (MVP):** 2-3 weeks
- Analytics dashboard
- Client management
- Basic payment processing

**Production Ready:** 4-6 weeks
- All critical features
- Security hardening
- Performance optimization

**Full Feature Set:** 8-12 weeks
- All phases complete
- Advanced features
- Enterprise-ready

---

## 🔍 WHAT I WOULD ADD BEYOND PRD

### 1. **Booking Calendar View**
- Month/week/day views for admins
- Drag-and-drop rescheduling
- Visual conflict detection

### 2. **Multi-language Support**
- i18n framework
- Tenant-configurable languages
- RTL support

### 3. **Advanced Reporting**
- Custom report builder
- Export to PDF/Excel
- Scheduled reports

### 4. **API Access**
- REST API for integrations
- Webhooks for events
- API key management

### 5. **Mobile App Foundation**
- React Native setup
- Shared business logic
- Push notifications

---

**Bottom Line:** Focus on Analytics, Payments, and Client Management first. These provide the highest value and are quickest to implement with your current architecture.
