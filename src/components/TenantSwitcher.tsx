import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { Building2, ChevronDown, Check } from "lucide-react";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  logo_url: string | null;
}

export function TenantSwitcher() {
  const { tenant, setTenantBySlug } = useTenant();
  const [open, setOpen] = useState(false);

  const { data: tenants } = useQuery({
    queryKey: ["all-tenants-switcher"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, business_type, logo_url")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as TenantOption[];
    },
  });

  const handleSelect = async (t: TenantOption) => {
    await setTenantBySlug(t.slug);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-secondary transition-colors"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-3 w-3" />
          )}
        </div>
        <span className="max-w-[120px] truncate">{tenant?.name || "Select tenant"}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card p-1 shadow-lg">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Switch Tenant</p>
            {tenants?.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                  {t.logo_url ? <img src={t.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.business_type}</p>
                </div>
                {tenant?.id === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
