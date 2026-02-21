import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFeedback } from "@/hooks/use-feedback";
import { Link } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useFeedback();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan");
  const isFreeTrial = plan === "free";

  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user ? { id: user.id } : null);
      setAuthLoading(false);
    });
  }, []);
  const loading = authLoading;
  const user = authUser;
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    businessSlug: "",
    businessType: "salon",
  });
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (user && !isFreeTrial) {
    return <>{navigate("/admin", { replace: true })}</>;
  }

  const slugFromName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      showError("Email and password are required");
      return;
    }
    if (isFreeTrial && (!form.businessName || !form.businessSlug)) {
      showError("Business name and URL are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      if (form.name && data.user) {
        await supabase.from("profiles").upsert(
          { user_id: data.user.id, display_name: form.name },
          { onConflict: "user_id" }
        );
      }
      if (isFreeTrial) {
        const u = data.user ?? (await supabase.auth.getUser()).data.user;
        if (!u) throw new Error("Account created. Please check your email to confirm, then sign in and go to Pricing to start your trial.");
        const { data: tenantId, error } = await supabase.rpc("create_trial_tenant", {
          p_name: form.businessName,
          p_slug: form.businessSlug,
          p_business_type: form.businessType,
        });
        if (error) throw error;
        showSuccess("Your 15-day free trial has started! Let's set up your business.");
        navigate(`/onboarding?tenant_id=${tenantId}`, { replace: true });
      } else {
        showSuccess("Check your email to confirm your account");
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      showError(err.message || "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 font-body">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/iska systems logos.png" alt="Iska Service OS" className="mx-auto h-10" />
          <p className="mt-2 text-xs text-hero-muted">
            {isFreeTrial ? "Start your 15-day free trial" : "Create your account"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-card p-6 shadow-2xl">
          <h2 className="font-display text-base font-bold text-card-foreground">
            {isFreeTrial ? "Create Account & Start Free Trial" : "Sign Up"}
          </h2>
          <input
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          />
          <input
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          />
          <input
            type="password"
            placeholder="Password * (min 6 characters)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={6}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          />
          {isFreeTrial && (
            <>
              <hr className="border-border" />
              <p className="text-[11px] font-medium text-muted-foreground">Your business</p>
              <input
                type="text"
                placeholder="Business name *"
                value={form.businessName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    businessName: e.target.value,
                    businessSlug: f.businessSlug || slugFromName(e.target.value),
                  }))
                }
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
              <input
                type="text"
                placeholder="URL slug * (e.g. my-salon)"
                value={form.businessSlug}
                onChange={(e) => setForm((f) => ({ ...f, businessSlug: slugFromName(e.target.value) }))}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
              <select
                value={form.businessType}
                onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              >
                <option value="salon">Salon / Barbershop</option>
                <option value="spa">Spa / Wellness</option>
                <option value="mechanic">Auto / Mechanic</option>
                <option value="clinic">Clinic / Medical</option>
                <option value="fitness">Fitness / Gym</option>
                <option value="other">Other</option>
              </select>
            </>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 sm:text-sm"
          >
            {submitting ? "Please wait..." : isFreeTrial ? "Start Free Trial" : "Create Account"}
          </button>
          <Link
            to="/login"
            className="block w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
          >
            Already have an account? Sign in
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Signup;
