import { Link, useNavigate } from "react-router-dom";
import { Check, X, CreditCard } from "lucide-react";
import { useState } from "react";
import { useCreateTenantRequest } from "@/hooks/use-tenant-requests";
import { usePublicPaymentOptions } from "@/hooks/use-platform-payment-settings";
import { useFeedback } from "@/hooks/use-feedback";
import iskaOSLogo from "/iska systems logos.png";
import { PLAN_FREE, PLAN_STARTER, PLAN_LIFETIME } from "@/lib/plans";

const PLANS = [
  {
    id: PLAN_FREE,
    name: "Free",
    price: "$0",
    period: "15-day trial",
    description: "Full access for 15 days. Upgrade to Starter or Lifetime before trial ends.",
    features: [
      "1 location",
      "Up to 5 staff members",
      "Unlimited bookings",
      "Basic analytics",
      "White-label branding",
      "Payment processing",
    ],
    cta: "Start 15-Day Free Trial",
    popular: false,
  },
  {
    id: PLAN_STARTER,
    name: "Starter",
    price: "$45",
    period: "per month",
    description: "For small businesses. All features included.",
    features: [
      "3 locations",
      "Up to 15 staff members",
      "Unlimited bookings",
      "Advanced analytics",
      "Priority support",
      "Custom domain",
      "Inventory & POS",
      "Client management",
    ],
    cta: "Subscribe $45/mo",
    popular: true,
  },
  {
    id: PLAN_LIFETIME,
    name: "Lifetime",
    price: "$500",
    period: "one-time",
    description: "Pay once, use forever. All features included.",
    features: [
      "Unlimited locations",
      "Unlimited staff",
      "Unlimited bookings",
      "Full analytics suite",
      "Priority support",
      "Custom domain + SSL",
      "Inventory & POS",
      "Client management",
      "API access",
    ],
    cta: "Buy Lifetime $500",
    popular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations and custom deployments.",
    features: [
      "Everything in Lifetime",
      "Dedicated account manager",
      "Custom integrations",
      "On-premise option",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useFeedback();
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
  const paymentOptions = usePublicPaymentOptions();

  const handlePlanClick = (planId: string) => {
    setSelectedPlan(planId);
    if (planId === "enterprise") {
      setShowEnterpriseDialog(true);
    } else if (planId === PLAN_FREE) {
      // Free trial: go to signup with redirect to onboarding
      navigate("/signup?plan=free");
    } else {
      setShowRequestDialog(true);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.name || !requestForm.email) {
      showError("Required", "Name and email are required");
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
      showSuccess("Request submitted", "We'll contact you soon.");
      setShowRequestDialog(false);
      setRequestForm({ name: "", email: "", phone: "", company: "", business_type: "", message: "" });
      setSelectedPlan(null);
    } catch (err: any) {
      showError("Failed", err.message || "Failed to submit request");
    }
  };

  const handleSubmitEnterprise = async () => {
    if (!enterpriseForm.name || !enterpriseForm.email) {
      showError("Required", "Name and email are required");
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
      showSuccess("Request submitted", "Our sales team will contact you soon.");
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
      showError("Failed", err.message || "Failed to submit request");
    }
  };

  const getStripeLink = (plan: string) => {
    if (plan === PLAN_STARTER) return paymentOptions.stripePaymentLinkStarter;
    if (plan === PLAN_LIFETIME) return paymentOptions.stripePaymentLinkLifetime;
    return null;
  };

  const getPayPalUrl = (plan: string) => {
    if (plan === PLAN_STARTER) return paymentOptions.paypalPaymentUrlStarter;
    if (plan === PLAN_LIFETIME) return paymentOptions.paypalPaymentUrlLifetime;
    return null;
  };

  const hasPaymentLinks = (plan: string) => {
    const stripe = getStripeLink(plan);
    const paypal = getPayPalUrl(plan);
    return !!(stripe || paypal);
  };

  return (
    <div className="min-h-screen bg-background font-body">
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
              key={plan.id}
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
                onClick={() => handlePlanClick(plan.id)}
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

      </main>

      {/* Payment / Request Dialog for Starter and Lifetime */}
      {showRequestDialog && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                Get Started with {selectedPlan === PLAN_STARTER ? "Starter" : "Lifetime"}
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
              Pay now with card or PayPal, or submit the form to request a callback.
            </p>
            {(selectedPlan === PLAN_STARTER || selectedPlan === PLAN_LIFETIME) && !paymentOptions.provider && (
              <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Configure Stripe or PayPal in Platform → Payments to accept payments here.
              </p>
            )}
            {(selectedPlan === PLAN_STARTER || selectedPlan === PLAN_LIFETIME) && (paymentOptions.provider === "stripe" || paymentOptions.provider === "both") && getStripeLink(selectedPlan) && (
              <div className="mb-4 flex flex-wrap gap-2">
                <a
                  href={getStripeLink(selectedPlan)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform"
                >
                  <CreditCard className="h-4 w-4" /> Pay with Card (Stripe)
                </a>
              </div>
            )}
            {(selectedPlan === PLAN_STARTER || selectedPlan === PLAN_LIFETIME) && (paymentOptions.provider === "paypal" || paymentOptions.provider === "both") && (paymentOptions.paypalClientId || getPayPalUrl(selectedPlan)) && (
              <div className="mb-4">
                {getPayPalUrl(selectedPlan) ? (
                  <a
                    href={getPayPalUrl(selectedPlan)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-secondary transition-colors"
                  >
                    Pay with PayPal
                  </a>
                ) : (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    Add your <strong>PayPal payment URL for {selectedPlan}</strong> in Platform → Payments.
                  </p>
                )}
              </div>
            )}
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Or request a callback</p>
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
                {createRequest.isPending ? "Submitting..." : `Request ${selectedPlan} Plan`}
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
