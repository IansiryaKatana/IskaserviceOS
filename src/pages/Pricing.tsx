import { Link } from "react-router-dom";
import { Check, ArrowRight, Building2, X } from "lucide-react";
import { useState } from "react";
import { useCreateTenantRequest } from "@/hooks/use-tenant-requests";
import { toast } from "sonner";
import iskaOSLogo from "/iska systems logos.png";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out Iska Service OS",
    features: [
      "1 location",
      "Up to 5 staff members",
      "Unlimited bookings",
      "Basic analytics",
      "Email support",
      "White-label branding",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "per month",
    description: "For small businesses getting started",
    features: [
      "3 locations",
      "Up to 15 staff members",
      "Unlimited bookings",
      "Advanced analytics",
      "Priority email support",
      "Custom domain",
      "Payment processing",
      "Client management",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Pro",
    price: "$99",
    period: "per month",
    description: "For growing businesses",
    features: [
      "Unlimited locations",
      "Unlimited staff",
      "Unlimited bookings",
      "Full analytics suite",
      "Priority support",
      "Custom domain + SSL",
      "Stripe integration",
      "Advanced client features",
      "Review management",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment option",
      "Custom training",
      "Multi-region support",
      "Advanced security",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const Pricing = () => {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showEnterpriseDialog, setShowEnterpriseDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    business_type: "",
    message: "",
  });
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    company_size: "",
    business_type: "",
    requirements: "",
    timeline: "",
    message: "",
  });
  const createRequest = useCreateTenantRequest();

  const handlePlanClick = (planName: string) => {
    setSelectedPlan(planName);
    if (planName === "Enterprise") {
      setShowEnterpriseDialog(true);
    } else {
      setShowRequestDialog(true);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.name || !requestForm.email) {
      toast.error("Name and email are required");
      return;
    }
    try {
      const message = selectedPlan
        ? `Interested in ${selectedPlan} plan.\n\n${requestForm.message || ""}`
        : requestForm.message || "";
      
      await createRequest.mutateAsync({
        name: requestForm.name,
        email: requestForm.email,
        phone: requestForm.phone || null,
        company: requestForm.company || null,
        message: message || null,
        business_type: requestForm.business_type || null,
      });
      toast.success("Request submitted! We'll contact you soon.");
      setShowRequestDialog(false);
      setRequestForm({ name: "", email: "", phone: "", company: "", business_type: "", message: "" });
      setSelectedPlan(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    }
  };

  const handleSubmitEnterprise = async () => {
    if (!enterpriseForm.name || !enterpriseForm.email) {
      toast.error("Name and email are required");
      return;
    }
    try {
      const message = `Enterprise/Custom Solution Inquiry\n\nCompany Size: ${enterpriseForm.company_size || "Not specified"}\nTimeline: ${enterpriseForm.timeline || "Not specified"}\nRequirements: ${enterpriseForm.requirements || "Not specified"}\n\n${enterpriseForm.message || ""}`;
      
      await createRequest.mutateAsync({
        name: enterpriseForm.name,
        email: enterpriseForm.email,
        phone: enterpriseForm.phone || null,
        company: enterpriseForm.company || null,
        message: message || null,
        business_type: enterpriseForm.business_type || null,
      });
      toast.success("Request submitted! Our sales team will contact you soon.");
      setShowEnterpriseDialog(false);
      setEnterpriseForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        company_size: "",
        business_type: "",
        requirements: "",
        timeline: "",
        message: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={iskaOSLogo} alt="Iska Service OS" className="h-8 sm:h-10" />
        </Link>
        <nav className="hidden gap-6 text-xs font-medium uppercase tracking-widest text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/pricing" className="text-primary">Pricing</Link>
          <Link to="/reviews" className="hover:text-foreground">Reviews</Link>
          <Link to="/login" className="hover:text-foreground">Sign In</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include white-label branding and core booking features.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col transition-colors hover:bg-secondary/50 ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-lg scale-105"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most Popular
                </span>
              )}
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-card-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-card-foreground">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span className="text-xs text-card-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePlanClick(plan.name)}
                className={`w-full rounded-full py-2.5 text-xs font-semibold uppercase tracking-wider transition-transform hover:scale-105 mt-auto ${
                  plan.popular
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border p-8 text-center" style={{ backgroundColor: '#d16e17' }}>
          <Building2 className="mx-auto h-12 w-12 text-white mb-4" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Need a Custom Solution?
          </h2>
          <p className="text-sm text-white/90 mb-6 max-w-xl mx-auto">
            We offer custom pricing for enterprise deployments, white-label solutions, and on-premise installations.
          </p>
          <button
            onClick={() => handlePlanClick("Enterprise")}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[#d16e17] transition-transform hover:scale-105"
          >
            Contact Sales
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>

      {/* Request Callback Dialog for Free/Starter/Pro */}
      {showRequestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                {selectedPlan ? `Get Started with ${selectedPlan}` : "Request a Callback"}
              </h3>
              <button
                onClick={() => {
                  setShowRequestDialog(false);
                  setSelectedPlan(null);
                }}
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
                onClick={handleSubmitRequest}
                disabled={createRequest.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createRequest.isPending ? "Submitting..." : selectedPlan ? `Start ${selectedPlan} Plan` : "Request Callback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Contact Sales Dialog */}
      {showEnterpriseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                Contact Sales - Enterprise Solution
              </h3>
              <button
                onClick={() => setShowEnterpriseDialog(false)}
                className="text-muted-foreground hover:text-card-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Tell us about your enterprise needs and our sales team will contact you with a custom solution.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Name *</label>
                <input
                  type="text"
                  value={enterpriseForm.name}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Email *</label>
                <input
                  type="email"
                  value={enterpriseForm.email}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Phone</label>
                <input
                  type="tel"
                  value={enterpriseForm.phone}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Company *</label>
                <input
                  type="text"
                  value={enterpriseForm.company}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, company: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Company Size</label>
                <select
                  value={enterpriseForm.company_size}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, company_size: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Select...</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Business Type</label>
                <select
                  value={enterpriseForm.business_type}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, business_type: e.target.value }))}
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
                <label className="text-[11px] font-medium text-muted-foreground">Timeline</label>
                <select
                  value={enterpriseForm.timeline}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, timeline: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Select...</option>
                  <option value="immediate">Immediate</option>
                  <option value="1-3 months">1-3 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="6-12 months">6-12 months</option>
                  <option value="exploring">Just exploring</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Specific Requirements</label>
                <textarea
                  value={enterpriseForm.requirements}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, requirements: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Custom integrations, on-premise deployment, multi-region, etc."
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Additional Message</label>
                <textarea
                  value={enterpriseForm.message}
                  onChange={(e) => setEnterpriseForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Tell us more about your needs..."
                />
              </div>
              <button
                onClick={handleSubmitEnterprise}
                disabled={createRequest.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createRequest.isPending ? "Submitting..." : "Contact Sales"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
