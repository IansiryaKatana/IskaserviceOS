import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  usePlatformStats,
  useTenantSubscriptions,
  useCreateTenantSubscription,
  useUpdateTenantSubscription,
  useDeleteTenantSubscription,
  usePlatformAdmins,
  useCreatePlatformAdmin,
  useDeletePlatformAdmin,
  useTenantDeploymentConfigs,
  useCreateTenantDeploymentConfig,
  useUpdateTenantDeploymentConfig,
  useDeleteTenantDeploymentConfig,
  useAllUserRoles,
  useCreateUserRole,
  useUpdateUserRole,
  useDeleteUserRole,
  type Tenant,
  type TenantSubscription,
  type TenantDeploymentConfig,
  type UserRole,
} from "@/hooks/use-platform-data";
import {
  LayoutDashboard,
  Building2,
  Plus,
  Edit2,
  Trash2,
  LogOut,
  X,
  Globe,
  Users,
  Calendar,
  Scissors,
  ChevronLeft,
  Eye,
  Palette,
  CreditCard,
  Shield,
  Key,
  UserCog,
  Search,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useSiteSettings, useUpsertSiteSetting } from "@/hooks/use-site-settings";

type Tab = "overview" | "tenants" | "admins" | "subscriptions" | "deployments" | "roles" | "media";

const BUSINESS_TYPES = [
  { value: "salon", label: "Salon / Barbershop" },
  { value: "spa", label: "Spa / Wellness" },
  { value: "clinic", label: "Clinic / Medical" },
  { value: "mechanic", label: "Auto / Mechanic" },
  { value: "fitness", label: "Fitness / Gym" },
  { value: "other", label: "Other" },
];

interface ThemeForm {
  primary_color: string;
  accent_color: string;
  tag_color_a: string;
  tag_color_b: string;
  font_primary: string;
  font_secondary: string;
  border_radius: string;
  panel_position: string;
}

const DEFAULT_THEME: ThemeForm = {
  primary_color: "#000000",
  accent_color: "#C9A227",
  tag_color_a: "#7C6A0A",
  tag_color_b: "#5C3B2E",
  font_primary: "Inter Tight",
  font_secondary: "Domine",
  border_radius: "14px",
  panel_position: "right",
};

// Media Management Component
const MediaManagement = () => {
  const { data: settings } = useSiteSettings(null);
  const upsertSetting = useUpsertSiteSetting();
  const [desktopImage, setDesktopImage] = useState("");
  const [mobileImage, setMobileImage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const desktop = settings?.find(s => s.key === "homepage_bg_desktop");
    const mobile = settings?.find(s => s.key === "homepage_bg_mobile");
    setDesktopImage(desktop?.value || "/images/hero-1.jpg");
    setMobileImage(mobile?.value || "/images/hero-1.jpg");
  }, [settings]);

  const handleImageUpload = async (file: File, type: "desktop" | "mobile") => {
    if (!file) return;
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `homepage-bg-${type}-${Date.now()}.${fileExt}`;
      const filePath = `homepage/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("service-images")
        .getPublicUrl(filePath);

      // Save to site_settings
      await upsertSetting.mutateAsync({
        key: `homepage_bg_${type}`,
        value: publicUrl,
        tenant_id: null,
      });

      if (type === "desktop") setDesktopImage(publicUrl);
      else setMobileImage(publicUrl);

      toast.success(`${type === "desktop" ? "Desktop" : "Mobile"} image uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = async (url: string, type: "desktop" | "mobile") => {
    try {
      await upsertSetting.mutateAsync({
        key: `homepage_bg_${type}`,
        value: url,
        tenant_id: null,
      });
      if (type === "desktop") setDesktopImage(url);
      else setMobileImage(url);
      toast.success(`${type === "desktop" ? "Desktop" : "Mobile"} image updated`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update image");
    }
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Media Management</h2>
        <p className="mt-1 text-xs text-muted-foreground">Manage homepage background images</p>
      </div>

      <div className="space-y-6">
        {/* Desktop Background */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Desktop Background Image</h3>
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-secondary">
              <img
                src={desktopImage}
                alt="Desktop background preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/hero-1.jpg";
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "desktop");
                }}
                disabled={uploading}
                className="w-full text-xs file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground file:hover:bg-primary/90 disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Or Enter URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={desktopImage}
                  onChange={(e) => setDesktopImage(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                />
                <button
                  onClick={() => handleUrlChange(desktopImage, "desktop")}
                  disabled={uploading || !desktopImage}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Background */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Mobile Background Image</h3>
          <div className="space-y-3">
            <div className="relative aspect-[9/16] w-full max-w-xs overflow-hidden rounded-lg border border-border bg-secondary">
              <img
                src={mobileImage}
                alt="Mobile background preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/hero-1.jpg";
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "mobile");
                }}
                disabled={uploading}
                className="w-full text-xs file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground file:hover:bg-primary/90 disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Or Enter URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={mobileImage}
                  onChange={(e) => setMobileImage(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                />
                <button
                  onClick={() => handleUrlChange(mobileImage, "mobile")}
                  disabled={uploading || !mobileImage}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Platform = () => {
  const { signOut } = useAuth();
  const { data: tenants, isLoading: loadingTenants } = useTenants();
  const { data: stats } = usePlatformStats();
  const { data: subscriptions } = useTenantSubscriptions();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [tab, setTab] = useState<Tab>("overview");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [formSection, setFormSection] = useState<"general" | "theme" | "subscription" | "deployment">("general");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    business_type: "salon",
    deployment_type: "hosted",
    logo_url: "",
    favicon_url: "",
    status: "active",
    custom_domain: "",
    subscription_plan: "free",
  });
  const [themeForm, setThemeForm] = useState<ThemeForm>(DEFAULT_THEME);
  const [deploymentForm, setDeploymentForm] = useState({
    deployment_type: "hosted",
    supabase_url: "",
    supabase_anon_key: "",
  });

  // Platform Admins
  const { data: platformAdmins, isLoading: loadingAdmins } = usePlatformAdmins();
  const createPlatformAdmin = useCreatePlatformAdmin();
  const deletePlatformAdmin = useDeletePlatformAdmin();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");

  // Subscriptions
  const createSubscription = useCreateTenantSubscription();
  const updateSubscription = useUpdateTenantSubscription();
  const deleteSubscription = useDeleteTenantSubscription();
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<TenantSubscription | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    tenant_id: "",
    plan: "free",
    status: "active",
    stripe_customer_id: "",
    stripe_subscription_id: "",
  });

  // Deployment Configs
  const { data: deploymentConfigs, isLoading: loadingDeployments } = useTenantDeploymentConfigs();
  const createDeploymentConfig = useCreateTenantDeploymentConfig();
  const updateDeploymentConfig = useUpdateTenantDeploymentConfig();
  const deleteDeploymentConfig = useDeleteTenantDeploymentConfig();
  const [showDeploymentForm, setShowDeploymentForm] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<TenantDeploymentConfig | null>(null);

  // User Roles
  const { data: allUserRoles, isLoading: loadingRoles } = useAllUserRoles();
  const createUserRole = useCreateUserRole();
  const updateUserRole = useUpdateUserRole();
  const deleteUserRole = useDeleteUserRole();
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    user_id: "",
    role: "client" as UserRole["role"],
    tenant_id: "",
  });
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "", business_type: "salon", deployment_type: "hosted", logo_url: "", favicon_url: "", status: "active", custom_domain: "", subscription_plan: "free" });
    setThemeForm(DEFAULT_THEME);
    setDeploymentForm({ deployment_type: "hosted", supabase_url: "", supabase_anon_key: "" });
    setFormSection("general");
    setShowForm(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    const tc = (t.theme_config as any) || {};
    setForm({
      name: t.name,
      slug: t.slug,
      business_type: t.business_type,
      deployment_type: t.deployment_type,
      logo_url: t.logo_url || "",
      favicon_url: t.favicon_url || "",
      status: t.status,
      custom_domain: t.custom_domain || "",
      subscription_plan: t.subscription_plan || "free",
    });
    setThemeForm({
      primary_color: tc.primary_color || DEFAULT_THEME.primary_color,
      accent_color: tc.accent_color || DEFAULT_THEME.accent_color,
      tag_color_a: tc.tag_color_a || DEFAULT_THEME.tag_color_a,
      tag_color_b: tc.tag_color_b || DEFAULT_THEME.tag_color_b,
      font_primary: tc.font_primary || DEFAULT_THEME.font_primary,
      font_secondary: tc.font_secondary || DEFAULT_THEME.font_secondary,
      border_radius: tc.border_radius || DEFAULT_THEME.border_radius,
      panel_position: tc.panel_position || DEFAULT_THEME.panel_position,
    });
    // Load deployment config if exists
    const deploymentConfig = deploymentConfigs?.find(d => d.tenant_id === t.id);
    if (deploymentConfig) {
      setDeploymentForm({
        deployment_type: deploymentConfig.deployment_type,
        supabase_url: deploymentConfig.supabase_url || "",
        supabase_anon_key: deploymentConfig.supabase_anon_key || "",
      });
    } else {
      setDeploymentForm({ deployment_type: t.deployment_type, supabase_url: "", supabase_anon_key: "" });
    }
    setFormSection("general");
    setShowForm(true);
  };

  // Search users by email or name
  const searchUsers = async () => {
    if (!searchEmail) {
      setSearchResults([]);
      return;
    }
    try {
      // Search profiles by display_name
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .or(`display_name.ilike.%${searchEmail}%,user_id.ilike.%${searchEmail}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(profiles || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to search users");
    }
  };

  // Platform Admin handlers
  const handleCreateAdmin = async () => {
    if (!adminUserId) {
      toast.error("User ID is required");
      return;
    }
    try {
      await createPlatformAdmin.mutateAsync(adminUserId);
      toast.success("Platform admin created");
      setShowAdminForm(false);
      setAdminUserId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create admin");
    }
  };

  // Subscription handlers
  const openNewSubscription = () => {
    setEditingSubscription(null);
    setSubscriptionForm({ tenant_id: "", plan: "free", status: "active", stripe_customer_id: "", stripe_subscription_id: "" });
    setShowSubscriptionForm(true);
  };

  const openEditSubscription = (sub: TenantSubscription) => {
    setEditingSubscription(sub);
    setSubscriptionForm({
      tenant_id: sub.tenant_id,
      plan: sub.plan,
      status: sub.status,
      stripe_customer_id: sub.stripe_customer_id || "",
      stripe_subscription_id: sub.stripe_subscription_id || "",
    });
    setShowSubscriptionForm(true);
  };

  const handleSaveSubscription = async () => {
    if (!subscriptionForm.tenant_id) {
      toast.error("Tenant is required");
      return;
    }
    try {
      if (editingSubscription) {
        await updateSubscription.mutateAsync({
          id: editingSubscription.id,
          ...subscriptionForm,
          stripe_customer_id: subscriptionForm.stripe_customer_id || null,
          stripe_subscription_id: subscriptionForm.stripe_subscription_id || null,
        });
        toast.success("Subscription updated");
      } else {
        await createSubscription.mutateAsync({
          tenant_id: subscriptionForm.tenant_id,
          plan: subscriptionForm.plan,
          status: subscriptionForm.status,
          stripe_customer_id: subscriptionForm.stripe_customer_id || null,
          stripe_subscription_id: subscriptionForm.stripe_subscription_id || null,
        });
        toast.success("Subscription created");
      }
      setShowSubscriptionForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save subscription");
    }
  };

  // Deployment Config handlers
  const openNewDeployment = () => {
    setEditingDeployment(null);
    setDeploymentForm({ deployment_type: "hosted", supabase_url: "", supabase_anon_key: "" });
    setShowDeploymentForm(true);
  };

  const openEditDeployment = (config: TenantDeploymentConfig) => {
    setEditingDeployment(config);
    setDeploymentForm({
      deployment_type: config.deployment_type,
      supabase_url: config.supabase_url || "",
      supabase_anon_key: config.supabase_anon_key || "",
    });
    setShowDeploymentForm(true);
  };

  const handleSaveDeployment = async () => {
    if (!deploymentForm.deployment_type) {
      toast.error("Deployment type is required");
      return;
    }
    if (deploymentForm.deployment_type === "external" && (!deploymentForm.supabase_url || !deploymentForm.supabase_anon_key)) {
      toast.error("Supabase URL and Anon Key are required for external deployment");
      return;
    }
    try {
      if (editingDeployment) {
        await updateDeploymentConfig.mutateAsync({
          id: editingDeployment.id,
          deployment_type: deploymentForm.deployment_type,
          supabase_url: deploymentForm.supabase_url || null,
          supabase_anon_key: deploymentForm.supabase_anon_key || null,
        });
        toast.success("Deployment config updated");
      } else {
        if (!editing?.id) {
          toast.error("Please select a tenant first");
          return;
        }
        await createDeploymentConfig.mutateAsync({
          tenant_id: editing.id,
          deployment_type: deploymentForm.deployment_type,
          supabase_url: deploymentForm.supabase_url || null,
          supabase_anon_key: deploymentForm.supabase_anon_key || null,
        });
        toast.success("Deployment config created");
      }
      setShowDeploymentForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save deployment config");
    }
  };

  // User Role handlers
  const openNewRole = () => {
    setEditingRole(null);
    setRoleForm({ user_id: "", role: "client", tenant_id: "" });
    setSearchEmail("");
    setSearchResults([]);
    setShowRoleForm(true);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setRoleForm({
      user_id: role.user_id,
      role: role.role,
      tenant_id: role.tenant_id || "",
    });
    setShowRoleForm(false);
  };

  const handleSaveRole = async () => {
    if (!roleForm.user_id) {
      toast.error("User ID is required");
      return;
    }
    try {
      if (editingRole) {
        await updateUserRole.mutateAsync({
          id: editingRole.id,
          role: roleForm.role,
          tenant_id: roleForm.tenant_id || null,
        });
        toast.success("Role updated");
      } else {
        await createUserRole.mutateAsync({
          user_id: roleForm.user_id,
          role: roleForm.role,
          tenant_id: roleForm.tenant_id || null,
        });
        toast.success("Role created");
      }
      setShowRoleForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save role");
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    try {
      const themeConfig: Json = themeForm as unknown as Json;
      if (editing) {
        await updateTenant.mutateAsync({
          id: editing.id,
          name: form.name,
          slug: form.slug,
          business_type: form.business_type,
          deployment_type: form.deployment_type,
          logo_url: form.logo_url || null,
          favicon_url: form.favicon_url || null,
          status: form.status,
          custom_domain: form.custom_domain || null,
          subscription_plan: form.subscription_plan || null,
          theme_config: themeConfig,
        });
        // Update deployment config if external
        if (form.deployment_type === "external") {
          const existingConfig = deploymentConfigs?.find(d => d.tenant_id === editing.id);
          if (existingConfig) {
            await updateDeploymentConfig.mutateAsync({
              id: existingConfig.id,
              deployment_type: deploymentForm.deployment_type,
              supabase_url: deploymentForm.supabase_url || null,
              supabase_anon_key: deploymentForm.supabase_anon_key || null,
            });
          } else {
            await createDeploymentConfig.mutateAsync({
              tenant_id: editing.id,
              deployment_type: deploymentForm.deployment_type,
              supabase_url: deploymentForm.supabase_url || null,
              supabase_anon_key: deploymentForm.supabase_anon_key || null,
            });
          }
        }
        toast.success("Tenant updated");
      } else {
        const newTenant = await createTenant.mutateAsync({
          name: form.name,
          slug: form.slug,
          business_type: form.business_type,
          deployment_type: form.deployment_type,
          logo_url: form.logo_url || null,
          theme_config: themeConfig,
        });
        // Create deployment config if external
        if (form.deployment_type === "external" && deploymentForm.supabase_url && deploymentForm.supabase_anon_key) {
          await createDeploymentConfig.mutateAsync({
            tenant_id: newTenant.id,
            deployment_type: deploymentForm.deployment_type,
            supabase_url: deploymentForm.supabase_url,
            supabase_anon_key: deploymentForm.supabase_anon_key,
          });
        }
        toast.success("Tenant created");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save tenant");
    }
  };

  const getSubscription = (tenantId: string) => subscriptions?.find(s => s.tenant_id === tenantId);

  const inputCls = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm";
  const labelCls = "text-[11px] font-medium text-muted-foreground";

  const statCards = [
    { label: "Tenants", value: stats?.totalTenants ?? "—", icon: <Building2 className="h-5 w-5" />, color: "bg-primary/10 text-primary" },
    { label: "Bookings", value: stats?.totalBookings ?? "—", icon: <Calendar className="h-5 w-5" />, color: "bg-accent/10 text-accent-foreground" },
    { label: "Services", value: stats?.totalServices ?? "—", icon: <Scissors className="h-5 w-5" />, color: "bg-secondary text-secondary-foreground" },
    { label: "Staff", value: stats?.totalStaff ?? "—", icon: <Users className="h-5 w-5" />, color: "bg-primary/10 text-primary" },
  ];

  const sectionBtn = (key: typeof formSection, label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => setFormSection(key)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
        formSection === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <a href="/" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </a>
          <h1 className="font-display text-sm font-bold text-foreground sm:text-base">Platform Admin</h1>
          <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">Super Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setTab("overview")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "overview" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutDashboard className="h-3.5 w-3.5" />Overview
          </button>
          <button onClick={() => setTab("tenants")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "tenants" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Building2 className="h-3.5 w-3.5" />Tenants
          </button>
          <button onClick={() => setTab("admins")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "admins" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Shield className="h-3.5 w-3.5" />Admins
          </button>
          <button onClick={() => setTab("subscriptions")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "subscriptions" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CreditCard className="h-3.5 w-3.5" />Subscriptions
          </button>
          <button onClick={() => setTab("deployments")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "deployments" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Key className="h-3.5 w-3.5" />Deployments
          </button>
          <button onClick={() => setTab("roles")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "roles" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <UserCog className="h-3.5 w-3.5" />Roles
          </button>
          <button onClick={() => setTab("media")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "media" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <ImageIcon className="h-3.5 w-3.5" />Media
          </button>
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Overview */}
        {tab === "overview" && (
          <div>
            <h2 className="mb-6 font-display text-lg font-bold text-foreground sm:text-xl">Platform Overview</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <div className={`mb-3 inline-flex rounded-lg p-2 ${s.color}`}>{s.icon}</div>
                  <p className="text-2xl font-bold text-card-foreground sm:text-3xl">{s.value}</p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="mb-3 font-display text-sm font-bold text-foreground">Recent Tenants</h3>
              <div className="space-y-2">
                {tenants?.slice(0, 5).map((t) => {
                  const sub = getSubscription(t.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                          {t.logo_url ? <img src={t.logo_url} alt={t.name} className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.slug} · {t.business_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          t.status === "active" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                        }`}>{t.status}</span>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{sub?.plan || t.subscription_plan || "free"}</span>
                        <a href={`/t/${t.slug}`} target="_blank" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tenants */}
        {tab === "tenants" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Tenants</h2>
              <button onClick={openNew} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs">
                <Plus className="h-3.5 w-3.5" />New Tenant
              </button>
            </div>
            {loadingTenants ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !tenants?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No tenants yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map((t) => {
                  const sub = getSubscription(t.id);
                  return (
                    <div key={t.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                            {t.logo_url ? <img src={t.logo_url} alt={t.name} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-card-foreground">{t.name}</h3>
                            <p className="text-[10px] text-muted-foreground">
                              {t.slug} · {t.business_type} · {t.deployment_type}
                            </p>
                            {t.custom_domain && (
                              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Globe className="h-3 w-3" />{t.custom_domain}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            t.status === "active" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          }`}>{t.status}</span>
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {sub?.plan || t.subscription_plan || "free"}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={`/t/${t.slug}`} target="_blank" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Preview">
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                            <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete tenant "${t.name}"? This cannot be undone.`))
                                  deleteTenant.mutateAsync(t.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed"));
                              }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Platform Admins Tab */}
        {tab === "admins" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Platform Admins</h2>
              <button onClick={() => setShowAdminForm(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs">
                <Plus className="h-3.5 w-3.5" />Add Admin
              </button>
            </div>
            {loadingAdmins ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !platformAdmins?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Shield className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No platform admins yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {platformAdmins.map((admin: any) => (
                  <div key={admin.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-card-foreground">
                            {admin.profile?.display_name || admin.user_id}
                          </h3>
                          <p className="text-[10px] text-muted-foreground">User ID: {admin.user_id}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Added: {new Date(admin.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Remove platform admin access?"))
                            deletePlatformAdmin.mutateAsync(admin.id).then(() => toast.success("Removed")).catch(() => toast.error("Failed"));
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {tab === "subscriptions" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Subscriptions</h2>
              <button onClick={openNewSubscription} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs">
                <Plus className="h-3.5 w-3.5" />New Subscription
              </button>
            </div>
            {!subscriptions?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <CreditCard className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => {
                  const tenant = tenants?.find(t => t.id === sub.tenant_id);
                  return (
                    <div key={sub.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-card-foreground">{tenant?.name || sub.tenant_id}</h3>
                            <p className="text-[10px] text-muted-foreground">
                              {sub.plan} · {sub.status}
                            </p>
                            {sub.current_period_start && (
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(sub.current_period_start).toLocaleDateString()} — {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            sub.status === "active" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          }`}>{sub.status}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditSubscription(sub)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Delete this subscription?"))
                                  deleteSubscription.mutateAsync(sub.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed"));
                              }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Deployments Tab */}
        {tab === "deployments" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Deployment Configs</h2>
            </div>
            {loadingDeployments ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !deploymentConfigs?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Key className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No deployment configs yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deploymentConfigs.map((config) => {
                  const tenant = tenants?.find(t => t.id === config.tenant_id);
                  return (
                    <div key={config.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Key className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-card-foreground">{tenant?.name || config.tenant_id}</h3>
                            <p className="text-[10px] text-muted-foreground">
                              {config.deployment_type} {config.supabase_url && `· ${new URL(config.supabase_url).hostname}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditDeployment(config)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this deployment config?"))
                                deleteDeploymentConfig.mutateAsync(config.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed"));
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* User Roles Tab */}
        {tab === "roles" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">User Roles</h2>
              <button onClick={openNewRole} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs">
                <Plus className="h-3.5 w-3.5" />New Role
              </button>
            </div>
            {loadingRoles ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !allUserRoles?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <UserCog className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No user roles yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allUserRoles.map((role: any) => {
                  const tenant = role.tenants;
                  return (
                    <div key={role.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserCog className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-card-foreground">
                              {role.profiles?.display_name || role.user_id}
                            </h3>
                            <p className="text-[10px] text-muted-foreground">
                              {role.role} {tenant ? `· ${tenant.name}` : "· Platform"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditRole(role)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this role?"))
                                deleteUserRole.mutateAsync(role.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed"));
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Media Management Tab */}
        {tab === "media" && <MediaManagement />}
      </main>

      {/* Tenant Form Modal — Expanded */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-lg rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                {editing ? "Edit Tenant" : "New Tenant"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-card-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {sectionBtn("general", "General", <Building2 className="h-3 w-3" />)}
              {sectionBtn("theme", "Theme & Branding", <Palette className="h-3 w-3" />)}
              {editing && sectionBtn("subscription", "Subscription", <CreditCard className="h-3 w-3" />)}
              {editing && sectionBtn("deployment", "Deployment", <Key className="h-3 w-3" />)}
            </div>

            <div className="space-y-3">
              {/* GENERAL SECTION */}
              {formSection === "general" && (
                <>
                  <div>
                    <label className={labelCls}>Business Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        name: e.target.value,
                        slug: editing ? f.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                      }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Slug *</label>
                    <input type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className={inputCls} />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Preview: /t/{form.slug || "..."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Business Type</label>
                      <select value={form.business_type} onChange={(e) => setForm((f) => ({ ...f, business_type: e.target.value }))} className={inputCls}>
                        {BUSINESS_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Deployment</label>
                      <select value={form.deployment_type} onChange={(e) => setForm((f) => ({ ...f, deployment_type: e.target.value }))} className={inputCls}>
                        <option value="hosted">Hosted (SaaS)</option>
                        <option value="external">External</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Logo URL</label>
                    <input type="url" value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." className={inputCls} />
                    {form.logo_url && <img src={form.logo_url} alt="Logo preview" className="mt-1 h-10 rounded border border-border object-contain" />}
                  </div>
                  <div>
                    <label className={labelCls}>Favicon URL</label>
                    <input type="url" value={form.favicon_url} onChange={(e) => setForm((f) => ({ ...f, favicon_url: e.target.value }))} placeholder="https://..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Custom Domain</label>
                    <input type="text" value={form.custom_domain} onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value }))} placeholder="booking.yourbrand.com" className={inputCls} />
                  </div>
                  {editing && (
                    <div>
                      <label className={labelCls}>Status</label>
                      <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* THEME SECTION */}
              {formSection === "theme" && (
                <>
                  <p className="text-[10px] text-muted-foreground">Customize the visual appearance for this tenant.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["primary_color", "accent_color", "tag_color_a", "tag_color_b"] as const).map((key) => (
                      <div key={key}>
                        <label className={labelCls}>{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={themeForm[key]}
                            onChange={(e) => setThemeForm(f => ({ ...f, [key]: e.target.value }))}
                            className="h-8 w-8 cursor-pointer rounded border border-border"
                          />
                          <input
                            type="text"
                            value={themeForm[key]}
                            onChange={(e) => setThemeForm(f => ({ ...f, [key]: e.target.value }))}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Primary Font</label>
                      <input type="text" value={themeForm.font_primary} onChange={(e) => setThemeForm(f => ({ ...f, font_primary: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Display Font</label>
                      <input type="text" value={themeForm.font_secondary} onChange={(e) => setThemeForm(f => ({ ...f, font_secondary: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Border Radius</label>
                      <input type="text" value={themeForm.border_radius} onChange={(e) => setThemeForm(f => ({ ...f, border_radius: e.target.value }))} placeholder="14px" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Panel Position</label>
                      <select value={themeForm.panel_position} onChange={(e) => setThemeForm(f => ({ ...f, panel_position: e.target.value }))} className={inputCls}>
                        <option value="right">Right</option>
                        <option value="left">Left</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="mt-3 rounded-xl border border-border p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full" style={{ backgroundColor: themeForm.primary_color }} />
                      <div className="h-10 w-10 rounded-full" style={{ backgroundColor: themeForm.accent_color }} />
                      <div className="h-6 w-6 rounded-full" style={{ backgroundColor: themeForm.tag_color_a }} />
                      <div className="h-6 w-6 rounded-full" style={{ backgroundColor: themeForm.tag_color_b }} />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div
                        className="rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: themeForm.primary_color, borderRadius: themeForm.border_radius, fontFamily: themeForm.font_primary }}
                      >
                        Book Now
                      </div>
                      <div
                        className="rounded-full border px-4 py-1.5 text-xs font-semibold"
                        style={{ borderColor: themeForm.accent_color, color: themeForm.accent_color, borderRadius: themeForm.border_radius, fontFamily: themeForm.font_secondary }}
                      >
                        Services
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SUBSCRIPTION SECTION */}
              {formSection === "subscription" && editing && (
                <>
                  <div>
                    <label className={labelCls}>Plan</label>
                    <select
                      value={form.subscription_plan}
                      onChange={(e) => setForm(f => ({ ...f, subscription_plan: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  {(() => {
                    const sub = getSubscription(editing.id);
                    return sub ? (
                      <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium text-card-foreground">{sub.status}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium text-card-foreground">{sub.plan}</span></div>
                        {sub.current_period_start && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Period</span>
                            <span className="font-medium text-card-foreground">
                              {new Date(sub.current_period_start).toLocaleDateString()} — {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        )}
                        {sub.stripe_customer_id && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Stripe</span><span className="font-medium text-card-foreground truncate">{sub.stripe_customer_id}</span></div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No subscription record found.</p>
                    );
                  })()}
                </>
              )}

              {/* DEPLOYMENT SECTION */}
              {formSection === "deployment" && editing && (
                <>
                  <p className="text-[10px] text-muted-foreground">Configure external Supabase deployment for this tenant.</p>
                  <div>
                    <label className={labelCls}>Deployment Type</label>
                    <select
                      value={deploymentForm.deployment_type}
                      onChange={(e) => setDeploymentForm(f => ({ ...f, deployment_type: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="hosted">Hosted (SaaS)</option>
                      <option value="external">External Supabase</option>
                    </select>
                  </div>
                  {deploymentForm.deployment_type === "external" && (
                    <>
                      <div>
                        <label className={labelCls}>Supabase URL *</label>
                        <input
                          type="url"
                          value={deploymentForm.supabase_url}
                          onChange={(e) => setDeploymentForm(f => ({ ...f, supabase_url: e.target.value }))}
                          placeholder="https://xxxxx.supabase.co"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Supabase Anon Key *</label>
                        <input
                          type="text"
                          value={deploymentForm.supabase_anon_key}
                          onChange={(e) => setDeploymentForm(f => ({ ...f, supabase_anon_key: e.target.value }))}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className={inputCls}
                        />
                        <p className="mt-0.5 text-[10px] text-muted-foreground">⚠️ Store service role key securely (server-side only)</p>
                      </div>
                    </>
                  )}
                </>
              )}

              <button
                onClick={handleSave}
                disabled={createTenant.isPending || updateTenant.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createTenant.isPending || updateTenant.isPending ? "Saving..." : editing ? "Update Tenant" : "Create Tenant"}
              </button>
            </div>
          </div>
          </div>
        )}

      {/* Platform Admin Form Modal */}
      {showAdminForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">Add Platform Admin</h3>
              <button onClick={() => setShowAdminForm(false)} className="text-muted-foreground hover:text-card-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>User ID (UUID) *</label>
                <input
                  type="text"
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className={inputCls}
                />
                <p className="mt-0.5 text-[10px] text-muted-foreground">Enter the user's UUID from auth.users table</p>
              </div>
              <button
                onClick={handleCreateAdmin}
                disabled={createPlatformAdmin.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createPlatformAdmin.isPending ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Form Modal */}
      {showSubscriptionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                {editingSubscription ? "Edit Subscription" : "New Subscription"}
              </h3>
              <button onClick={() => setShowSubscriptionForm(false)} className="text-muted-foreground hover:text-card-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Tenant *</label>
                <select
                  value={subscriptionForm.tenant_id}
                  onChange={(e) => setSubscriptionForm(f => ({ ...f, tenant_id: e.target.value }))}
                  className={inputCls}
                  disabled={!!editingSubscription}
                >
                  <option value="">Select tenant...</option>
                  {tenants?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Plan *</label>
                  <select
                    value={subscriptionForm.plan}
                    onChange={(e) => setSubscriptionForm(f => ({ ...f, plan: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status *</label>
                  <select
                    value={subscriptionForm.status}
                    onChange={(e) => setSubscriptionForm(f => ({ ...f, status: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Stripe Customer ID</label>
                <input
                  type="text"
                  value={subscriptionForm.stripe_customer_id}
                  onChange={(e) => setSubscriptionForm(f => ({ ...f, stripe_customer_id: e.target.value }))}
                  placeholder="cus_xxxxx"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Stripe Subscription ID</label>
                <input
                  type="text"
                  value={subscriptionForm.stripe_subscription_id}
                  onChange={(e) => setSubscriptionForm(f => ({ ...f, stripe_subscription_id: e.target.value }))}
                  placeholder="sub_xxxxx"
                  className={inputCls}
                />
              </div>
              <button
                onClick={handleSaveSubscription}
                disabled={createSubscription.isPending || updateSubscription.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createSubscription.isPending || updateSubscription.isPending ? "Saving..." : editingSubscription ? "Update Subscription" : "Create Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Config Form Modal */}
      {showDeploymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                {editingDeployment ? "Edit Deployment Config" : "New Deployment Config"}
              </h3>
              <button onClick={() => setShowDeploymentForm(false)} className="text-muted-foreground hover:text-card-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {!editingDeployment && (
                <div>
                  <label className={labelCls}>Tenant *</label>
                  <select
                    value={editing?.id || ""}
                    onChange={(e) => {
                      const tenant = tenants?.find(t => t.id === e.target.value);
                      if (tenant) openEdit(tenant);
                    }}
                    className={inputCls}
                  >
                    <option value="">Select tenant...</option>
                    {tenants?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>Deployment Type *</label>
                <select
                  value={deploymentForm.deployment_type}
                  onChange={(e) => setDeploymentForm(f => ({ ...f, deployment_type: e.target.value }))}
                  className={inputCls}
                >
                  <option value="hosted">Hosted (SaaS)</option>
                  <option value="external">External Supabase</option>
                </select>
              </div>
              {deploymentForm.deployment_type === "external" && (
                <>
                  <div>
                    <label className={labelCls}>Supabase URL *</label>
                    <input
                      type="url"
                      value={deploymentForm.supabase_url}
                      onChange={(e) => setDeploymentForm(f => ({ ...f, supabase_url: e.target.value }))}
                      placeholder="https://xxxxx.supabase.co"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Supabase Anon Key *</label>
                    <input
                      type="text"
                      value={deploymentForm.supabase_anon_key}
                      onChange={(e) => setDeploymentForm(f => ({ ...f, supabase_anon_key: e.target.value }))}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className={inputCls}
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">⚠️ Service role key should be stored server-side only</p>
                  </div>
                </>
              )}
              <button
                onClick={handleSaveDeployment}
                disabled={createDeploymentConfig.isPending || updateDeploymentConfig.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createDeploymentConfig.isPending || updateDeploymentConfig.isPending ? "Saving..." : editingDeployment ? "Update Config" : "Create Config"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Role Form Modal */}
      {showRoleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                {editingRole ? "Edit User Role" : "New User Role"}
              </h3>
              <button onClick={() => setShowRoleForm(false)} className="text-muted-foreground hover:text-card-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {!editingRole && (
                <>
                  <div>
                    <label className={labelCls}>Search User by Email/Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                        placeholder="Search..."
                        className={inputCls}
                      />
                      <button
                        onClick={searchUsers}
                        className="rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-secondary"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border bg-background">
                        {searchResults.map((user) => (
                          <button
                            key={user.user_id}
                            onClick={() => {
                              setRoleForm(f => ({ ...f, user_id: user.user_id }));
                              setSearchResults([]);
                              setSearchEmail("");
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-secondary"
                          >
                            {user.display_name || user.user_id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>User ID *</label>
                    <input
                      type="text"
                      value={roleForm.user_id}
                      onChange={(e) => setRoleForm(f => ({ ...f, user_id: e.target.value }))}
                      placeholder="00000000-0000-0000-0000-000000000000"
                      className={inputCls}
                    />
                  </div>
                </>
              )}
              <div>
                <label className={labelCls}>Role *</label>
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm(f => ({ ...f, role: e.target.value as UserRole["role"] }))}
                  className={inputCls}
                >
                  <option value="client">Client</option>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="tenant_owner">Tenant Owner</option>
                  <option value="platform_owner">Platform Owner</option>
                </select>
              </div>
              {roleForm.role !== "platform_owner" && (
                <div>
                  <label className={labelCls}>Tenant (optional for platform roles)</label>
                  <select
                    value={roleForm.tenant_id}
                    onChange={(e) => setRoleForm(f => ({ ...f, tenant_id: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">None (Platform-level)</option>
                    {tenants?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleSaveRole}
                disabled={createUserRole.isPending || updateUserRole.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createUserRole.isPending || updateUserRole.isPending ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Platform;
