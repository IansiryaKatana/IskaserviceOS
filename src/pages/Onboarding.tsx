import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTenant } from "@/hooks/use-platform-data";
import { useCreateServiceCategory } from "@/hooks/use-salon-data";
import { useCreateLocation } from "@/hooks/use-salon-data";
import { useFeedback } from "@/hooks/use-feedback";
import { Link } from "react-router-dom";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";

const STEPS = [
  { id: 1, title: "Business basics", desc: "Confirm your business details" },
  { id: 2, title: "Service categories", desc: "Add categories like Barber, Salon" },
  { id: 3, title: "First location", desc: "Add your main business address" },
  { id: 4, title: "Branding", desc: "Logo and colors (optional)" },
  { id: 5, title: "Done", desc: "Launch your booking page" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenant_id");

  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<{ id: string; name: string; slug: string; business_type: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    businessType: "salon",
    categories: [{ name: "", slug: "" }],
    locationName: "",
    locationAddress: "",
    locationCity: "",
    locationPhone: "",
  });

  const updateTenant = useUpdateTenant();
  const createCategory = useCreateServiceCategory();
  const createLocation = useCreateLocation();

  useEffect(() => {
    if (!tenantId) {
      navigate("/pricing", { replace: true });
      return;
    }
    supabase
      .from("tenants")
      .select("id, name, slug, business_type")
      .eq("id", tenantId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/pricing", { replace: true });
          return;
        }
        setTenant(data);
        setForm((f) => ({ ...f, name: data.name, slug: data.slug, businessType: data.business_type || "salon" }));
      })
      .finally(() => setLoading(false));
  }, [tenantId, navigate]);

  const slugFromName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "";

  const handleStep1 = async () => {
    if (!tenant || !form.name.trim()) {
      showError("Business name is required");
      return;
    }
    try {
      await updateTenant.mutateAsync({
        id: tenant.id,
        name: form.name.trim(),
        slug: form.slug.trim() || slugFromName(form.name),
        business_type: form.businessType,
        onboarding_status: "in_progress",
      });
      setStep(2);
    } catch (e: any) {
      showError(e.message || "Failed to save");
    }
  };

  const handleStep2 = async () => {
    const validCats = form.categories.filter((c) => c.name.trim());
    if (validCats.length === 0) {
      showError("Add at least one service category");
      return;
    }
    try {
      for (let i = 0; i < validCats.length; i++) {
        const cat = validCats[i];
        await createCategory.mutateAsync({
          name: cat.name.trim(),
          slug: cat.slug.trim() || slugFromName(cat.name),
          tenant_id: tenant!.id,
          description: null,
          tag_color: null,
          is_active: true,
          sort_order: i,
        });
      }
      setStep(3);
    } catch (e: any) {
      showError(e.message || "Failed to save categories");
    }
  };

  const handleStep3 = async () => {
    if (!form.locationName.trim()) {
      showError("Location name is required");
      return;
    }
    try {
      await createLocation.mutateAsync({
        name: form.locationName.trim(),
        address: form.locationAddress.trim() || null,
        city: form.locationCity.trim() || null,
        phone: form.locationPhone.trim() || null,
        tenant_id: tenant!.id,
        is_active: true,
        sort_order: 0,
      });
      setStep(4);
    } catch (e: any) {
      showError(e.message || "Failed to save location");
    }
  };

  const handleStep4 = () => {
    setStep(5);
  };

  const handleComplete = async () => {
    try {
      await supabase
        .from("tenants")
        .update({ onboarding_status: "completed", onboarding_completed_at: new Date().toISOString() })
        .eq("id", tenant!.id);
      showSuccess("You're all set! Welcome to Iska Service OS.");
      window.location.href = "/admin";
    } catch (e: any) {
      showError(e.message || "Failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <img src="/iska systems logos.png" alt="Iska Service OS" className="h-8" />
          <span className="text-xs font-medium text-muted-foreground">
            Step {step} of {STEPS.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-8">
          <div className="mb-2 flex gap-1">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full ${s.id <= step ? "bg-primary" : "bg-secondary"}`}
              />
            ))}
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">{STEPS[step - 1].title}</h2>
          <p className="text-xs text-muted-foreground">{STEPS[step - 1].desc}</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Business name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: f.slug || slugFromName(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">URL slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugFromName(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="my-salon"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Business type</label>
              <select
                value={form.businessType}
                onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="salon">Salon / Barbershop</option>
                <option value="spa">Spa / Wellness</option>
                <option value="mechanic">Auto / Mechanic</option>
                <option value="clinic">Clinic / Medical</option>
                <option value="fitness">Fitness / Gym</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {form.categories.map((cat, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) =>
                    setForm((f) => {
                      const next = [...f.categories];
                      next[i] = { ...next[i], name: e.target.value, slug: next[i].slug || slugFromName(e.target.value) };
                      return { ...f, categories: next };
                    })
                  }
                  placeholder="e.g. Barber"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      categories: f.categories.filter((_, j) => j !== i),
                    }))
                  }
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  categories: [...f.categories, { name: "", slug: "" }],
                }))
              }
              className="text-xs font-medium text-primary"
            >
              + Add category
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Location name *</label>
              <input
                type="text"
                value={form.locationName}
                onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))}
                placeholder="e.g. Main Street"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Address</label>
              <input
                type="text"
                value={form.locationAddress}
                onChange={(e) => setForm((f) => ({ ...f, locationAddress: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">City</label>
              <input
                type="text"
                value={form.locationCity}
                onChange={(e) => setForm((f) => ({ ...f, locationCity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Phone</label>
              <input
                type="tel"
                value={form.locationPhone}
                onChange={(e) => setForm((f) => ({ ...f, locationPhone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <p className="text-sm text-muted-foreground">
            You can add a logo and customize colors later from the Admin dashboard. Click Continue to finish.
          </p>
        )}

        {step === 5 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Check className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">You're ready!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your booking page will be at <strong>/t/{tenant.slug}</strong>. Add services, staff, and start taking bookings.
            </p>
            <Link
              to={`/t/${tenant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs font-medium text-primary hover:underline"
            >
              Preview your booking page →
            </Link>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          {step > 1 && step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => {
              if (step === 1) handleStep1();
              else if (step === 2) handleStep2();
              else if (step === 3) handleStep3();
              else if (step === 4) handleStep4();
              else handleComplete();
            }}
            disabled={
              updateTenant.isPending || createCategory.isPending || createLocation.isPending
            }
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] disabled:opacity-50"
          >
            {step === 5 ? "Go to Admin" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
