import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting } from "@/hooks/use-site-settings";
import { ArrowRight, ArrowUpRight, X, Phone, Mail, Menu } from "lucide-react";
import { useCreateTenantRequest } from "@/hooks/use-tenant-requests";
import { useFeedback } from "@/hooks/use-feedback";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface TenantPreview {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  status: string;
  theme_config: Record<string, string> | null;
}

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<TenantPreview | null>(null);
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
    <div className="relative min-h-screen max-md:flex max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:min-h-0 max-md:flex-col overflow-hidden bg-hero font-body">
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
        <nav className="hidden gap-2 rounded-full bg-white/10 backdrop-blur-md shadow-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-widest text-white md:flex">
          <button
            onClick={() => setPanelOpen(true)}
            className={`rounded-full px-4 py-2 transition-colors uppercase ${
              panelOpen ? "text-white" : "bg-black text-white hover:font-semibold"
            }`}
            style={panelOpen ? { backgroundColor: '#d16e17' } : {}}
          >
            Use cases
          </button>
          <Link 
            to="/pricing" 
            className={`rounded-full px-4 py-2 transition-colors ${
              location.pathname === "/pricing" ? "text-white" : "text-white hover:text-primary"
            }`}
            style={location.pathname === "/pricing" ? { backgroundColor: '#d16e17' } : {}}
          >
            Pricing
          </Link>
          <Link 
            to="/reviews" 
            className={`rounded-full px-4 py-2 transition-colors ${
              location.pathname === "/reviews" ? "text-white" : "text-white hover:text-primary"
            }`}
            style={location.pathname === "/reviews" ? { backgroundColor: '#d16e17' } : {}}
          >
            Reviews
          </Link>
          <Link 
            to="/docs" 
            className={`rounded-full px-4 py-2 transition-colors ${
              location.pathname === "/docs" ? "text-white" : "text-white hover:text-primary"
            }`}
            style={location.pathname === "/docs" ? { backgroundColor: '#d16e17' } : {}}
          >
            Documentation
          </Link>
          <a href="/login" className="rounded-full bg-white px-4 py-2 text-black transition-colors hover:bg-white/90">
            Sign In
          </a>
        </nav>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-card border-border">
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => { setPanelOpen(true); setMobileMenuOpen(false); }}
                className="rounded-full bg-primary px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-primary-foreground"
              >
                Use cases
              </button>
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full px-4 py-3 text-sm font-medium uppercase ${location.pathname === "/pricing" ? "bg-primary text-primary-foreground" : "text-foreground"}`}
              >
                Pricing
              </Link>
              <Link
                to="/reviews"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full px-4 py-3 text-sm font-medium uppercase ${location.pathname === "/reviews" ? "bg-primary text-primary-foreground" : "text-foreground"}`}
              >
                Reviews
              </Link>
              <Link
                to="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full px-4 py-3 text-sm font-medium uppercase ${location.pathname === "/docs" ? "bg-primary text-primary-foreground" : "text-foreground"}`}
              >
                Documentation
              </Link>
              <a
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full bg-primary px-4 py-3 text-center text-sm font-medium uppercase text-primary-foreground"
              >
                Sign In
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Hero Content — bottom-left like tenant page */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col justify-end px-4 pb-8 sm:px-8 sm:pb-16 md:min-h-[calc(100vh-80px)] md:flex-initial">
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

      {/* Use cases panel: same behavior & positioning as Services/booking dialog */}
      <Dialog open={panelOpen} onOpenChange={(open) => { setPanelOpen(open); if (!open) setSelectedUseCase(null); }}>
        <DialogContent
          hideOverlay
          closeButtonClassName="absolute right-4 top-4 sm:right-5 rounded-lg bg-muted p-1.5 hover:bg-muted/80 data-[state=open]:!bg-muted"
          className="booking-dialog animate-none left-auto right-6 top-20 bottom-6 z-[100] flex w-full max-w-[calc(28rem-60px)] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-l-xl border-0 border-l bg-card p-0 shadow-2xl sm:right-10 sm:top-24 sm:bottom-8 sm:max-w-[calc(32rem-60px)] md:top-32 md:bottom-10 lg:right-12 lg:top-36 lg:bottom-12 max-lg:!left-0 max-lg:!right-0 max-lg:!top-auto max-lg:!bottom-0 max-lg:!translate-x-0 max-lg:!translate-y-0 max-lg:!max-w-none max-lg:!w-full max-lg:!max-h-[90vh] max-lg:!rounded-t-2xl max-lg:!rounded-b-none max-lg:!rounded-l-none max-lg:!border-l-0"
        >
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Panel header: same as booking dialog location step */}
            <div className="flex min-w-0 shrink-0 items-center justify-between overflow-hidden p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                  Use cases
                </h3>
              </div>
            </div>

            {/* Panel content: same scroll/padding as booking dialog */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]" style={{ scrollbarGutter: "stable" }}>
              <div className="min-h-0 flex-1">
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
                  <div className="grid grid-cols-2 gap-4">
                    {tenants.map((tenant) => {
                      const isSelected = selectedUseCase?.id === tenant.id;
                      return (
                        <button
                          key={tenant.id}
                          onClick={() => setSelectedUseCase(tenant)}
                          className={`group flex min-h-[120px] w-full flex-col rounded-xl p-4 text-left transition-all shadow-sm hover:shadow sm:p-5 ${
                            isSelected ? "bg-[#d16e17] text-white" : "bg-[#d16e17]/10"
                          }`}
                        >
                          <p className={`text-sm font-semibold mb-2 sm:text-base ${isSelected ? "text-white" : "text-card-foreground"}`}>
                            {tenant.name}
                          </p>
                          <hr className={`mb-2 w-full border-0 border-t ${isSelected ? "border-white/30" : "border-border"}`} />
                          <p className={`text-[11px] flex-1 leading-relaxed sm:text-xs ${isSelected ? "text-white/90" : "text-muted-foreground"}`}>
                            {BUSINESS_LABELS[tenant.business_type] || tenant.business_type}
                          </p>
                          <div className="mt-4 flex justify-end">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-[#d16e17]/15 text-[#d16e17] group-hover:bg-[#d16e17]/25"
                              }`}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected use case block at bottom */}
              {selectedUseCase && (
                <div className="mt-4 shrink-0 animate-fade-in rounded-xl bg-black p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                    <p className="text-sm font-semibold text-white sm:text-base">
                      {selectedUseCase.name}
                    </p>
                    <span className="hidden w-px self-stretch bg-white/30 sm:block" aria-hidden />
                    <p className="text-[11px] text-white/80 sm:text-xs">
                      {BUSINESS_LABELS[selectedUseCase.business_type] || selectedUseCase.business_type}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigate(`/t/${selectedUseCase.slug}`);
                      setPanelOpen(false);
                      setSelectedUseCase(null);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold uppercase tracking-wider text-black transition-transform hover:scale-[1.02]"
                  >
                    <span>Check it out</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Callback Dialog — Modal Bottom Sheet on tablet/mobile via DialogContent */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-lg:mb-0">
          <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
            Request a Callback
          </h3>
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
