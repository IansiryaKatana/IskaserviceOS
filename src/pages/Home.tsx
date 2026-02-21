import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting } from "@/hooks/use-site-settings";
import { ArrowRight, ArrowUpRight, Building2, Scissors, Sparkles, Car, Stethoscope, Dumbbell, X, Phone, Mail } from "lucide-react";
import { useCreateTenantRequest } from "@/hooks/use-tenant-requests";
import { useFeedback } from "@/hooks/use-feedback";

interface TenantPreview {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  status: string;
  theme_config: Record<string, string> | null;
}

const BUSINESS_ICONS: Record<string, React.ReactNode> = {
  salon: <Scissors className="h-5 w-5" />,
  spa: <Sparkles className="h-5 w-5" />,
  mechanic: <Car className="h-5 w-5" />,
  clinic: <Stethoscope className="h-5 w-5" />,
  fitness: <Dumbbell className="h-5 w-5" />,
};

const BUSINESS_LABELS: Record<string, string> = {
  salon: "Salon & Barbershop",
  spa: "Spa & Wellness",
  mechanic: "Auto Service",
  clinic: "Medical Clinic",
  fitness: "Fitness Studio",
};

const Home = () => {
  const { showSuccess, showError } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = useState<TenantPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    business_type: "",
  });
  const createRequest = useCreateTenantRequest();
  const { data: desktopBg } = useSiteSetting("homepage_bg_desktop", null);
  const { data: mobileBg } = useSiteSetting("homepage_bg_mobile", null);
  const bgImage = desktopBg?.value || "/images/hero-1.jpg";
  const bgMobileImage = mobileBg?.value || bgImage;

  useEffect(() => {
    supabase
      .from("tenants")
      .select("id, name, slug, business_type, status, theme_config")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        setTenants((data as TenantPreview[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero font-body">
      {/* Full-screen Background Image */}
      <div className="absolute inset-0">
        <picture>
          <source media="(max-width: 767px)" srcSet={bgMobileImage} />
          <img
            src={bgImage}
            alt="Iska Service OS"
            className="h-full w-full object-cover grayscale-hero"
          />
        </picture>
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <a href="/">
          <img src="/iska systems logos.png" alt="Iska Service OS" className="h-8 sm:h-10" />
        </a>
        <nav className="hidden gap-2 rounded-full bg-white/10 backdrop-blur-md shadow-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-widest text-hero-muted md:flex">
          <button
            onClick={() => setPanelOpen(true)}
            className={`rounded-full px-4 py-2 transition-colors uppercase ${
              location.pathname === "/" ? "text-white" : "hover:text-hero-foreground"
            }`}
            style={location.pathname === "/" ? { backgroundColor: '#d16e17' } : {}}
          >
            DEMOS
          </button>
          <Link 
            to="/pricing" 
            className={`rounded-full px-4 py-2 transition-colors ${
              location.pathname === "/pricing" ? "text-white" : "hover:text-hero-foreground"
            }`}
            style={location.pathname === "/pricing" ? { backgroundColor: '#d16e17' } : {}}
          >
            Pricing
          </Link>
          <Link 
            to="/reviews" 
            className={`rounded-full px-4 py-2 transition-colors ${
              location.pathname === "/reviews" ? "text-white" : "hover:text-hero-foreground"
            }`}
            style={location.pathname === "/reviews" ? { backgroundColor: '#d16e17' } : {}}
          >
            Reviews
          </Link>
          <a href="/login" className="rounded-full bg-white px-4 py-2 text-black transition-colors hover:bg-white/90">
            Sign In
          </a>
        </nav>
        <button
          onClick={() => setPanelOpen(true)}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-105 md:hidden"
        >
          DEMOS
        </button>
      </header>

      {/* Hero Content — bottom-left like tenant page */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col justify-end px-4 pb-8 sm:px-8 sm:pb-16">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold leading-tight text-hero-foreground sm:text-5xl lg:text-6xl">
            Powerful white-label platform for service businesses.
          </h1>
          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-hero-muted sm:text-sm">
            A white-label infrastructure engine for appointment-based businesses.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowRequestDialog(true)}
              className="group flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-transform hover:scale-105"
              style={{ backgroundColor: '#d16e17' }}
            >
              Get Started
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </main>

      {/* Right-anchored Demo Panel (matches tenant page panel style) */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setPanelOpen(false)}
          />
          <div className="animate-slide-in-right relative z-10 flex h-full w-full max-w-md flex-col bg-card shadow-2xl sm:max-w-lg">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                Live Demos
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-card-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              <p className="mb-4 text-xs text-muted-foreground">
                Explore how Iska Service OS adapts to different industries
              </p>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {tenants.map((tenant) => {
                    const primaryColor = tenant.theme_config?.primary_color || "hsl(var(--primary))";
                    return (
                      <button
                        key={tenant.id}
                        onClick={() => navigate(`/t/${tenant.slug}`)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-primary/40 sm:p-4"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary"
                          style={{ backgroundColor: primaryColor + "1a" }}
                        >
                          {BUSINESS_ICONS[tenant.business_type] || <Building2 className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-card-foreground">{tenant.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {BUSINESS_LABELS[tenant.business_type] || tenant.business_type}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-card-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-border px-4 py-3 sm:px-5">
              <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                {tenants.length} active tenants · {new Set(tenants.map(t => t.business_type)).size} industries
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Request Callback Dialog */}
      {showRequestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                Request a Callback
              </h3>
              <button
                onClick={() => setShowRequestDialog(false)}
                className="text-muted-foreground hover:text-card-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Tell us about your business and we'll get back to you within 24 hours.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Name *</label>
                <input
                  type="text"
                  value={requestForm.name}
                  onChange={(e) => setRequestForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Email *</label>
                <input
                  type="email"
                  value={requestForm.email}
                  onChange={(e) => setRequestForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Phone</label>
                <input
                  type="tel"
                  value={requestForm.phone}
                  onChange={(e) => setRequestForm(f => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Company</label>
                <input
                  type="text"
                  value={requestForm.company}
                  onChange={(e) => setRequestForm(f => ({ ...f, company: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Business Type</label>
                <select
                  value={requestForm.business_type}
                  onChange={(e) => setRequestForm(f => ({ ...f, business_type: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Select...</option>
                  <option value="salon">Salon / Barbershop</option>
                  <option value="spa">Spa / Wellness</option>
                  <option value="mechanic">Auto / Mechanic</option>
                  <option value="clinic">Clinic / Medical</option>
                  <option value="fitness">Fitness / Gym</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Message</label>
                <textarea
                  value={requestForm.message}
                  onChange={(e) => setRequestForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Tell us about your business needs..."
                />
              </div>
              <button
                onClick={async () => {
                  if (!requestForm.name || !requestForm.email) {
                    showError("Required", "Name and email are required");
                    return;
                  }
                  try {
                    await createRequest.mutateAsync({
                      name: requestForm.name,
                      email: requestForm.email,
                      phone: requestForm.phone || null,
                      company: requestForm.company || null,
                      message: requestForm.message || null,
                      business_type: requestForm.business_type || null,
                    });
                    showSuccess("Request submitted", "We'll contact you soon.");
                    setShowRequestDialog(false);
                    setRequestForm({ name: "", email: "", phone: "", company: "", message: "", business_type: "" });
                  } catch (err: any) {
                    showError("Failed", err.message || "Failed to submit request");
                  }
                }}
                disabled={createRequest.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createRequest.isPending ? "Submitting..." : "Request Callback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
