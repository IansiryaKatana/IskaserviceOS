import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { Navigate } from "react-router-dom";
import {
  useAllServices, useCreateService, useUpdateService, useDeleteService,
  useBookings, useUpdateBooking, useDeleteBooking,
  useAllLocations, useCreateLocation, useUpdateLocation, useDeleteLocation,
  useAllStaff, useCreateStaff, useUpdateStaff, useDeleteStaff,
  useAllServiceCategories, useCreateServiceCategory, useUpdateServiceCategory, useDeleteServiceCategory,
  useAllStaffSchedules, useCreateStaffSchedule, useUpdateStaffSchedule, useDeleteStaffSchedule,
  uploadServiceImage,
  type Service, type Location, type Staff, type ServiceCategory, type StaffSchedule,
} from "@/hooks/use-salon-data";
import { useTenantAnalytics } from "@/hooks/use-analytics";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, type Client } from "@/hooks/use-clients";
import { usePayments, useCreatePayment, useUpdatePayment, usePaymentStats, type Payment } from "@/hooks/use-payments";
import { useStockItems, useCreateStockItem, useUpdateStockItem, useDeleteStockItem, useStockAdjustment, useStockTransactions, type StockItem } from "@/hooks/use-inventory";
import { usePosSales, useCompletePosSale, usePosSaleStats, type PosCartItem } from "@/hooks/use-pos";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Plus, Edit2, Trash2, LogOut, Scissors, Calendar, Menu, X, ChevronDown, MapPin, Users, Upload, Tag, Clock, BarChart3, UserCircle, CreditCard, Package, ShoppingCart, Minus } from "lucide-react";
import { toast } from "sonner";

type Tab = "analytics" | "services" | "bookings" | "locations" | "staff" | "categories" | "schedules" | "clients" | "payments" | "inventory" | "pos";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Admin = () => {
  const { user, loading, signOut } = useAuth();
  const { tenant, tenantId } = useTenant();

  const { data: services, isLoading: loadingServices } = useAllServices(tenantId);
  const { data: bookings, isLoading: loadingBookings } = useBookings(tenantId);
  const { data: locations, isLoading: loadingLocations } = useAllLocations(tenantId);
  const { data: staff, isLoading: loadingStaff } = useAllStaff(tenantId);
  const { data: categories, isLoading: loadingCategories } = useAllServiceCategories(tenantId);
  const { data: schedules, isLoading: loadingSchedules } = useAllStaffSchedules(tenantId);

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocationMut = useDeleteLocation();
  const createStaff = useCreateStaff();
  const updateStaffMut = useUpdateStaff();
  const deleteStaffMut = useDeleteStaff();
  const createCategory = useCreateServiceCategory();
  const updateCategory = useUpdateServiceCategory();
  const deleteCategory = useDeleteServiceCategory();
  const createSchedule = useCreateStaffSchedule();
  const updateSchedule = useUpdateStaffSchedule();
  const deleteSchedule = useDeleteStaffSchedule();

  const [tab, setTab] = useState<Tab>("services");
  const [mobileMenu, setMobileMenu] = useState(false);

  // Service form
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: "", description: "", duration_minutes: 30, price: 0, category: "",
    is_active: true, sort_order: 0, image_url: "", desktop_image_url: "", mobile_image_url: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location form
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: "", address: "", city: "", phone: "", email: "", is_active: true, sort_order: 0, image_url: "",
  });

  // Staff form
  const [editingStaffMember, setEditingStaffMember] = useState<Staff | null>(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "", title: "", category: "", bio: "", specialties: "",
    is_active: true, sort_order: 0, image_url: "", location_id: "",
  });

  // Category form
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "", slug: "", description: "", tag_color: "#3b82f6", is_active: true, sort_order: 0,
  });

  // Schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    staff_id: "", day_of_week: 1, start_time: "09:00", end_time: "17:00", is_available: true,
  });
  const [editingSchedule, setEditingSchedule] = useState<StaffSchedule | null>(null);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const tenantName = tenant?.name || "Iska Service OS";

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadServiceImage(file);
      setServiceForm((f) => ({ ...f, [field]: url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Service handlers
  const openNewService = () => {
    setEditingService(null);
    const defaultCat = categories?.[0]?.slug || "";
    setServiceForm({ name: "", description: "", duration_minutes: 30, price: 0, category: defaultCat, is_active: true, sort_order: 0, image_url: "", desktop_image_url: "", mobile_image_url: "" });
    setShowServiceForm(true);
  };
  const openEditService = (s: Service) => {
    setEditingService(s);
    setServiceForm({
      name: s.name, description: s.description || "", duration_minutes: s.duration_minutes,
      price: Number(s.price), category: s.category, is_active: s.is_active, sort_order: s.sort_order,
      image_url: s.image_url || "", desktop_image_url: s.desktop_image_url || "", mobile_image_url: s.mobile_image_url || "",
    });
    setShowServiceForm(true);
  };
  const handleSaveService = async () => {
    if (!serviceForm.name) { toast.error("Name required"); return; }
    try {
      const payload = { ...serviceForm, image_url: serviceForm.image_url || null, desktop_image_url: serviceForm.desktop_image_url || null, mobile_image_url: serviceForm.mobile_image_url || null, tenant_id: tenantId, metadata: null, category_id: null };
      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, ...payload });
        toast.success("Updated");
      } else {
        await createService.mutateAsync(payload);
        toast.success("Created");
      }
      setShowServiceForm(false);
    } catch { toast.error("Failed"); }
  };

  // Location handlers
  const openNewLocation = () => {
    setEditingLocation(null);
    setLocationForm({ name: "", address: "", city: "", phone: "", email: "", is_active: true, sort_order: 0, image_url: "" });
    setShowLocationForm(true);
  };
  const openEditLocation = (l: Location) => {
    setEditingLocation(l);
    setLocationForm({ name: l.name, address: l.address || "", city: l.city || "", phone: l.phone || "", email: l.email || "", is_active: l.is_active, sort_order: l.sort_order, image_url: l.image_url || "" });
    setShowLocationForm(true);
  };
  const handleSaveLocation = async () => {
    if (!locationForm.name) { toast.error("Name required"); return; }
    try {
      const payload = { ...locationForm, address: locationForm.address || null, city: locationForm.city || null, phone: locationForm.phone || null, email: locationForm.email || null, image_url: locationForm.image_url || null, tenant_id: tenantId, metadata: null };
      if (editingLocation) {
        await updateLocation.mutateAsync({ id: editingLocation.id, ...payload });
      } else {
        await createLocation.mutateAsync(payload);
      }
      toast.success("Saved");
      setShowLocationForm(false);
    } catch { toast.error("Failed"); }
  };

  // Staff handlers
  const openNewStaff = () => {
    setEditingStaffMember(null);
    const defaultCat = categories?.[0]?.slug || "";
    setStaffForm({ name: "", title: "", category: defaultCat, bio: "", specialties: "", is_active: true, sort_order: 0, image_url: "", location_id: "" });
    setShowStaffForm(true);
  };
  const openEditStaff = (s: Staff) => {
    setEditingStaffMember(s);
    setStaffForm({ name: s.name, title: s.title, category: s.category, bio: s.bio || "", specialties: s.specialties?.join(", ") || "", is_active: s.is_active, sort_order: s.sort_order, image_url: s.image_url || "", location_id: s.location_id || "" });
    setShowStaffForm(true);
  };
  const handleSaveStaff = async () => {
    if (!staffForm.name) { toast.error("Name required"); return; }
    try {
      const payload = {
        name: staffForm.name, title: staffForm.title, category: staffForm.category,
        bio: staffForm.bio || null, specialties: staffForm.specialties ? staffForm.specialties.split(",").map(s => s.trim()).filter(Boolean) : null,
        is_active: staffForm.is_active, sort_order: staffForm.sort_order,
        image_url: staffForm.image_url || null, location_id: staffForm.location_id || null, user_id: null,
        tenant_id: tenantId, metadata: null,
      };
      if (editingStaffMember) {
        await updateStaffMut.mutateAsync({ id: editingStaffMember.id, ...payload });
      } else {
        await createStaff.mutateAsync(payload);
      }
      toast.success("Saved");
      setShowStaffForm(false);
    } catch { toast.error("Failed"); }
  };

  // Category handlers
  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", slug: "", description: "", tag_color: "#3b82f6", is_active: true, sort_order: 0 });
    setShowCategoryForm(true);
  };
  const openEditCategory = (c: ServiceCategory) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, slug: c.slug, description: c.description || "", tag_color: c.tag_color || "#3b82f6", is_active: c.is_active, sort_order: c.sort_order });
    setShowCategoryForm(true);
  };
  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) { toast.error("Name and slug required"); return; }
    try {
      const payload = { ...categoryForm, description: categoryForm.description || null, tag_color: categoryForm.tag_color || null, tenant_id: tenantId };
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...payload });
      } else {
        await createCategory.mutateAsync(payload);
      }
      toast.success("Saved");
      setShowCategoryForm(false);
    } catch { toast.error("Failed"); }
  };

  // Schedule handlers
  const openNewSchedule = () => {
    setEditingSchedule(null);
    setScheduleForm({ staff_id: staff?.[0]?.id || "", day_of_week: 1, start_time: "09:00", end_time: "17:00", is_available: true });
    setShowScheduleForm(true);
  };
  const openEditSchedule = (s: StaffSchedule) => {
    setEditingSchedule(s);
    setScheduleForm({ staff_id: s.staff_id, day_of_week: s.day_of_week, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5), is_available: s.is_available });
    setShowScheduleForm(true);
  };
  const handleSaveSchedule = async () => {
    if (!scheduleForm.staff_id) { toast.error("Staff required"); return; }
    try {
      const payload = { ...scheduleForm, tenant_id: tenantId };
      if (editingSchedule) {
        await updateSchedule.mutateAsync({ id: editingSchedule.id, ...payload });
      } else {
        await createSchedule.mutateAsync(payload);
      }
      toast.success("Saved");
      setShowScheduleForm(false);
    } catch { toast.error("Failed"); }
  };

  const handleBookingStatus = async (id: string, status: string) => {
    try { await updateBooking.mutateAsync({ id, status }); toast.success(`Booking ${status}`); } catch { toast.error("Failed"); }
  };

  // Analytics
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"day" | "week" | "month">("month");
  const { data: analytics, isLoading: loadingAnalytics } = useTenantAnalytics(tenantId, analyticsPeriod);

  // Clients
  const { data: clients, isLoading: loadingClients } = useClients(tenantId);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({
    email: "", phone: "", first_name: "", last_name: "", notes: "",
  });

  // Payments
  const { data: payments, isLoading: loadingPayments } = usePayments(tenantId);
  const { data: paymentStats } = usePaymentStats(tenantId, analyticsPeriod);
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    booking_id: "", client_id: "", amount: 0, payment_method: "cash", status: "succeeded" as Payment["status"],
  });

  // Inventory
  const { data: stockItems, isLoading: loadingStock } = useStockItems(tenantId);
  const { data: stockTransactions } = useStockTransactions(tenantId);
  const createStockItem = useCreateStockItem();
  const updateStockItem = useUpdateStockItem();
  const deleteStockItem = useDeleteStockItem();
  const stockAdjustment = useStockAdjustment();
  const [showStockForm, setShowStockForm] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [stockForm, setStockForm] = useState({
    name: "", sku: "", description: "", quantity: 0, unit: "each", cost_price: 0, sell_price: 0, min_stock: 0, category: "", is_active: true,
  });
  const [adjustForm, setAdjustForm] = useState({ quantity_delta: 0, type: "purchase" as "purchase" | "sale" | "adjustment" | "return", notes: "" });

  // POS
  const { data: posSales, isLoading: loadingPos } = usePosSales(tenantId);
  const { data: posStats } = usePosSaleStats(tenantId, "day");
  const completePosSale = useCompletePosSale();
  const { data: posStockItems } = useStockItems(tenantId, { activeOnly: true });
  const [posCart, setPosCart] = useState<PosCartItem[]>([]);
  const [posClientId, setPosClientId] = useState<string>("");
  const [posPaymentMethod, setPosPaymentMethod] = useState<string>("cash");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: "services", label: "Services", icon: <Scissors className="h-3.5 w-3.5" /> },
    { key: "categories", label: "Categories", icon: <Tag className="h-3.5 w-3.5" /> },
    { key: "bookings", label: "Bookings", icon: <Calendar className="h-3.5 w-3.5" /> },
    { key: "clients", label: "Clients", icon: <UserCircle className="h-3.5 w-3.5" /> },
    { key: "payments", label: "Payments", icon: <CreditCard className="h-3.5 w-3.5" /> },
    { key: "inventory", label: "Inventory", icon: <Package className="h-3.5 w-3.5" /> },
    { key: "pos", label: "POS", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    { key: "locations", label: "Locations", icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: "staff", label: "Staff", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "schedules", label: "Schedules", icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  const inputCls = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm";
  const labelCls = "text-[11px] font-medium text-muted-foreground";

  const getCategoryColor = (slug: string) => categories?.find(c => c.slug === slug)?.tag_color;

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={tenantName} className="h-7 sm:h-8" />
            ) : (
              <img src="/iska systems logos.png" alt={tenantName} className="h-7 sm:h-8" />
            )}
          </a>
          <span className="hidden rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline">Admin</span>
          <TenantSwitcher />
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 text-xs font-medium ${tab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"><LogOut className="h-3.5 w-3.5" />Logout</button>
        </div>
        <button onClick={() => setMobileMenu(!mobileMenu)} className="sm:hidden text-foreground">{mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </header>

      {mobileMenu && (
        <div className="border-b border-border bg-card px-4 py-3 sm:hidden animate-fade-in">
          <div className="flex flex-col gap-3">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setMobileMenu(false); }} className={`flex items-center gap-2 text-xs font-medium ${tab === t.key ? "text-primary" : "text-muted-foreground"}`}>
                {t.icon}{t.label}
              </button>
            ))}
            <button onClick={() => signOut()} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive"><LogOut className="h-3.5 w-3.5" />Logout</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">

        {/* ========= ANALYTICS ========= */}
        {tab === "analytics" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Analytics</h2>
              <select
                value={analyticsPeriod}
                onChange={(e) => setAnalyticsPeriod(e.target.value as "day" | "week" | "month")}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            {loadingAnalytics ? (
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            ) : analytics ? (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Total Revenue</p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">${analytics.totalRevenue.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Total Bookings</p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">{analytics.totalBookings}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Avg Booking Value</p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">${analytics.averageBookingValue.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Confirmed</p>
                    <p className="mt-1 text-2xl font-bold text-card-foreground">{analytics.confirmedBookings}</p>
                  </div>
                </div>

                {/* Revenue Chart */}
                {analytics.revenueByPeriod.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="mb-4 text-sm font-semibold text-card-foreground">Revenue Trend</h3>
                    <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }}>
                      <LineChart data={analytics.revenueByPeriod}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-[10px]" />
                        <YAxis className="text-[10px]" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                )}

                {/* Top Services */}
                {analytics.topServices.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="mb-4 text-sm font-semibold text-card-foreground">Top Services</h3>
                    <div className="space-y-2">
                      {analytics.topServices.slice(0, 5).map((s) => (
                        <div key={s.service_id} className="flex items-center justify-between rounded-lg border border-border bg-background p-2">
                          <span className="text-xs font-medium text-foreground">{s.service_name}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">{s.booking_count} bookings</span>
                            <span className="font-bold text-card-foreground">${s.revenue.toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Staff */}
                {analytics.topStaff.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="mb-4 text-sm font-semibold text-card-foreground">Top Staff</h3>
                    <div className="space-y-2">
                      {analytics.topStaff.slice(0, 5).map((s) => (
                        <div key={s.staff_id} className="flex items-center justify-between rounded-lg border border-border bg-background p-2">
                          <span className="text-xs font-medium text-foreground">{s.staff_name}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">{s.booking_count} bookings</span>
                            <span className="font-bold text-card-foreground">${s.revenue.toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No analytics data available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ========= CLIENTS ========= */}
        {tab === "clients" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Clients</h2>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setClientForm({ email: "", phone: "", first_name: "", last_name: "", notes: "" });
                  setShowClientForm(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"
              >
                <Plus className="h-3.5 w-3.5" />Add Client
              </button>
            </div>
            {loadingClients ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !clients?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <UserCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No clients yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((c) => (
                  <div key={c.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-card-foreground">
                          {c.first_name || c.last_name ? `${c.first_name || ""} ${c.last_name || ""}`.trim() : "Unnamed Client"}
                        </h3>
                        {c.email && <p className="text-[11px] text-muted-foreground">{c.email}</p>}
                        {c.phone && <p className="text-[11px] text-muted-foreground">{c.phone}</p>}
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{c.total_bookings} bookings</span>
                          <span>${c.total_spent.toFixed(0)} spent</span>
                          {c.loyalty_points > 0 && <span>{c.loyalty_points} points</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingClient(c);
                            setClientForm({
                              email: c.email || "",
                              phone: c.phone || "",
                              first_name: c.first_name || "",
                              last_name: c.last_name || "",
                              notes: c.notes || "",
                            });
                            setShowClientForm(true);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this client?"))
                              deleteClient.mutateAsync({ id: c.id, tenantId: c.tenant_id }).then(() => toast.success("Deleted")).catch(() => toast.error("Failed"));
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========= INVENTORY ========= */}
        {tab === "inventory" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Inventory</h2>
              <button
                onClick={() => {
                  setEditingStock(null);
                  setStockForm({ name: "", sku: "", description: "", quantity: 0, unit: "each", cost_price: 0, sell_price: 0, min_stock: 0, category: "", is_active: true });
                  setShowStockForm(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"
              >
                <Plus className="h-3.5 w-3.5" />Add Item
              </button>
            </div>
            {loadingStock ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !stockItems?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No stock items yet. Add your first product.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockItems.map((item) => {
                  const isLow = item.min_stock > 0 && item.quantity <= item.min_stock;
                  return (
                    <div key={item.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-card-foreground">{item.name}</h3>
                            {item.sku && <span className="text-[10px] text-muted-foreground">({item.sku})</span>}
                            {isLow && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Low stock</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Qty: {Number(item.quantity)} {item.unit} · Sell: ${Number(item.sell_price).toFixed(2)}</p>
                          {item.category && <span className="inline-block mt-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.category}</span>}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustForm({ quantity_delta: 0, type: "purchase", notes: "" });
                              setShowAdjustForm(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Adjust stock"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingStock(item);
                              setStockForm({
                                name: item.name,
                                sku: item.sku || "",
                                description: item.description || "",
                                quantity: Number(item.quantity),
                                unit: item.unit,
                                cost_price: Number(item.cost_price),
                                sell_price: Number(item.sell_price),
                                min_stock: Number(item.min_stock),
                                category: item.category || "",
                                is_active: item.is_active,
                              });
                              setShowStockForm(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this stock item?")) deleteStockItem.mutateAsync({ id: item.id, tenantId: item.tenant_id }).then(() => toast.success("Deleted")).catch(() => toast.error("Failed"));
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

        {/* ========= POS ========= */}
        {tab === "pos" && (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <h2 className="mb-4 font-display text-lg font-bold text-foreground sm:text-xl">Point of Sale</h2>
              {posStats && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[10px] font-medium text-muted-foreground">Today&apos;s Sales</p>
                    <p className="mt-1 text-lg font-bold text-card-foreground">{posStats.count}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[10px] font-medium text-muted-foreground">Today&apos;s Revenue</p>
                    <p className="mt-1 text-lg font-bold text-card-foreground">${posStats.total.toFixed(0)}</p>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-card-foreground">Products</h3>
                {!posStockItems?.length ? (
                  <p className="text-sm text-muted-foreground">No active stock items. Add items in Inventory first.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {posStockItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          const existing = posCart.find((c) => c.stock_item_id === item.id);
                          if (existing) {
                            setPosCart((cart) =>
                              cart.map((c) =>
                                c.stock_item_id === item.id
                                  ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price }
                                  : c
                              )
                            );
                          } else {
                            const price = Number(item.sell_price);
                            setPosCart((cart) => [...cart, { stock_item_id: item.id, item_name: item.name, quantity: 1, unit_price: price, total: price }]);
                          }
                        }}
                        className="flex flex-col items-center rounded-lg border border-border bg-background p-3 text-left hover:bg-secondary/50 transition-colors"
                      >
                        <span className="text-xs font-medium text-foreground line-clamp-1">{item.name}</span>
                        <span className="mt-1 text-xs font-bold text-primary">${Number(item.sell_price).toFixed(0)}</span>
                        <span className="text-[10px] text-muted-foreground">Qty: {Number(item.quantity)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="w-full lg:w-80 shrink-0">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-card-foreground">Cart</h3>
                {posCart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Cart is empty</p>
                ) : (
                  <>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {posCart.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-border bg-background p-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">{line.item_name}</p>
                            <p className="text-[10px] text-muted-foreground">${line.unit_price.toFixed(2)} × {line.quantity}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-card-foreground">${line.total.toFixed(2)}</span>
                            <button
                              onClick={() => {
                                if (line.quantity <= 1) setPosCart((c) => c.filter((_, i) => i !== idx));
                                else setPosCart((c) => c.map((item, i) => (i === idx ? { ...item, quantity: item.quantity - 1, total: (item.quantity - 1) * item.unit_price } : item)));
                              }}
                              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="flex justify-between text-sm font-bold text-card-foreground">
                        Total <span>${posCart.reduce((s, i) => s + i.total, 0).toFixed(2)}</span>
                      </p>
                      <div className="mt-2">
                        <label className={labelCls}>Client (optional)</label>
                        <select value={posClientId} onChange={(e) => setPosClientId(e.target.value)} className={inputCls}>
                          <option value="">Walk-in</option>
                          {clients?.map((c) => (
                            <option key={c.id} value={c.id}>{c.first_name || c.last_name ? `${c.first_name || ""} ${c.last_name || ""}`.trim() : c.email || "Unnamed"}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2">
                        <label className={labelCls}>Payment Method</label>
                        <select value={posPaymentMethod} onChange={(e) => setPosPaymentMethod(e.target.value)} className={inputCls}>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await completePosSale.mutateAsync({
                              tenant_id: tenantId!,
                              client_id: posClientId || null,
                              items: posCart,
                              payment_method: posPaymentMethod,
                            });
                            setPosCart([]);
                            setPosClientId("");
                            toast.success("Sale completed!");
                          } catch (err: any) {
                            toast.error(err.message || "Sale failed");
                          }
                        }}
                        disabled={completePosSale.isPending || posCart.length === 0}
                        className="mt-3 w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
                      >
                        {completePosSale.isPending ? "Processing..." : "Complete Sale"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========= RECENT POS SALES ========= */}
        {tab === "pos" && posSales && posSales.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 font-display text-sm font-semibold text-foreground">Recent Sales</h3>
            <div className="space-y-2">
              {posSales.slice(0, 10).map((sale: any) => (
                <div key={sale.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">${Number(sale.total).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sale.clients ? `${sale.clients.first_name || ""} ${sale.clients.last_name || ""}`.trim() || sale.clients.email : "Walk-in"} · {new Date(sale.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{sale.payment_method}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========= PAYMENTS ========= */}
        {tab === "payments" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Payments</h2>
              <button
                onClick={() => {
                  setEditingPayment(null);
                  setPaymentForm({ booking_id: "", client_id: "", amount: 0, payment_method: "cash", status: "succeeded" });
                  setShowPaymentForm(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"
              >
                <Plus className="h-3.5 w-3.5" />Add Payment
              </button>
            </div>
            {paymentStats && (
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">Total Revenue</p>
                  <p className="mt-1 text-lg font-bold text-card-foreground">${paymentStats.totalRevenue.toFixed(0)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">Refunds</p>
                  <p className="mt-1 text-lg font-bold text-card-foreground">${paymentStats.totalRefunds.toFixed(0)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">Net Revenue</p>
                  <p className="mt-1 text-lg font-bold text-card-foreground">${paymentStats.netRevenue.toFixed(0)}</p>
                </div>
              </div>
            )}
            {loadingPayments ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !payments?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <CreditCard className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-card-foreground">${Number(p.amount).toFixed(2)}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            p.status === "succeeded" ? "bg-primary/10 text-primary" :
                            p.status === "failed" ? "bg-destructive/10 text-destructive" :
                            p.status === "refunded" ? "bg-secondary text-secondary-foreground" :
                            "bg-muted text-muted-foreground"
                          }`}>{p.status}</span>
                        </div>
                        {p.payment_method && <p className="text-[11px] text-muted-foreground">{p.payment_method}</p>}
                        {p.bookings && <p className="text-[10px] text-muted-foreground">Booking: {p.bookings.customer_name}</p>}
                        {p.clients && <p className="text-[10px] text-muted-foreground">Client: {p.clients.first_name} {p.clients.last_name}</p>}
                        <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingPayment(p);
                            setPaymentForm({
                              booking_id: p.booking_id || "",
                              client_id: p.client_id || "",
                              amount: Number(p.amount),
                              payment_method: p.payment_method || "cash",
                              status: p.status,
                            });
                            setShowPaymentForm(true);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========= SERVICES ========= */}
        {tab === "services" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Services</h2>
              <button onClick={openNewService} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
            {loadingServices ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services?.map((s) => (
                  <div key={s.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    {s.image_url && <div className="mb-2 h-24 overflow-hidden rounded-lg"><img src={s.image_url} alt={s.name} className="h-full w-full object-cover" /></div>}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-card-foreground truncate">{s.name}</h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{s.description}</p>
                      </div>
                      <div className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditService(s)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm("Delete?")) deleteService.mutateAsync(s.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed")); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-secondary-foreground">${Number(s.price).toFixed(0)}</span>
                      <span className="text-muted-foreground">{s.duration_minutes}min</span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                        style={{ backgroundColor: getCategoryColor(s.category) || "hsl(var(--primary))" }}
                      >{s.category}</span>
                      {!s.is_active && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Inactive</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========= CATEGORIES ========= */}
        {tab === "categories" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Service Categories</h2>
              <button onClick={openNewCategory} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
            {loadingCategories ? <p className="text-sm text-muted-foreground">Loading...</p> : !categories?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Tag className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No categories yet. Create your first service category.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((c) => (
                  <div key={c.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.tag_color || "hsl(var(--primary))" }} />
                        <div>
                          <h3 className="text-sm font-semibold text-card-foreground">{c.name}</h3>
                          <p className="text-[10px] text-muted-foreground">slug: {c.slug}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditCategory(c)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm("Delete?")) deleteCategory.mutateAsync(c.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed")); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {c.description && <p className="mt-2 text-[11px] text-muted-foreground">{c.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Order: {c.sort_order}</span>
                      {!c.is_active && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Inactive</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========= BOOKINGS ========= */}
        {tab === "bookings" && (
          <div>
            <h2 className="mb-4 font-display text-lg font-bold text-foreground sm:mb-6 sm:text-xl">Bookings</h2>
            {loadingBookings ? <p className="text-sm text-muted-foreground">Loading...</p> : !bookings?.length ? <p className="text-sm text-muted-foreground">No bookings yet.</p> : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const svc = services?.find((s) => s.id === b.service_id);
                  const stf = staff?.find((s) => s.id === b.staff_id);
                  const loc = locations?.find((l) => l.id === b.location_id);
                  return (
                    <div key={b.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-card-foreground">{b.customer_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {svc?.name || "—"} · {b.booking_date} at {b.booking_time}
                          </p>
                          {stf && <p className="text-[10px] text-muted-foreground">with {stf.name}</p>}
                          {loc && <p className="text-[10px] text-muted-foreground">@ {loc.name}</p>}
                          {b.customer_email && <p className="text-[10px] text-muted-foreground">{b.customer_email}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            b.status === "confirmed" ? "bg-primary/10 text-primary" : b.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"
                          }`}>{b.status}</span>
                          {b.total_price && <span className="text-xs font-bold text-card-foreground">${Number(b.total_price).toFixed(0)}</span>}
                          <div className="relative group/actions">
                            <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><ChevronDown className="h-3.5 w-3.5" /></button>
                            <div className="absolute right-0 top-full z-10 hidden min-w-[120px] rounded-lg border border-border bg-card p-1 shadow-lg group-hover/actions:block">
                              <button onClick={() => handleBookingStatus(b.id, "confirmed")} className="w-full rounded-md px-3 py-1.5 text-left text-[11px] hover:bg-secondary">Confirm</button>
                              <button onClick={() => handleBookingStatus(b.id, "cancelled")} className="w-full rounded-md px-3 py-1.5 text-left text-[11px] hover:bg-secondary">Cancel</button>
                              <button onClick={() => { if (confirm("Delete?")) deleteBooking.mutateAsync(b.id).then(() => toast.success("Deleted")); }} className="w-full rounded-md px-3 py-1.5 text-left text-[11px] text-destructive hover:bg-destructive/10">Delete</button>
                            </div>
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

        {/* ========= LOCATIONS ========= */}
        {tab === "locations" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Locations</h2>
              <button onClick={openNewLocation} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
            {loadingLocations ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {locations?.map((l) => (
                  <div key={l.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-card-foreground">{l.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{l.address}, {l.city}</p>
                        {l.phone && <p className="text-[10px] text-muted-foreground">{l.phone}</p>}
                      </div>
                      <div className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditLocation(l)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm("Delete?")) deleteLocationMut.mutateAsync(l.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed")); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {!l.is_active && <span className="mt-2 inline-block rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Inactive</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========= STAFF ========= */}
        {tab === "staff" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Staff</h2>
              <button onClick={openNewStaff} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
            {loadingStaff ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {staff?.map((s) => (
                  <div key={s.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                        {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" /> : <Users className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-card-foreground">{s.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{s.title}</p>
                        <span
                          className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                          style={{ backgroundColor: getCategoryColor(s.category) || "hsl(var(--primary))" }}
                        >{s.category}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditStaff(s)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm("Delete?")) deleteStaffMut.mutateAsync(s.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed")); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {s.specialties && <div className="mt-2 flex flex-wrap gap-1">{s.specialties.map((sp) => <span key={sp} className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{sp}</span>)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========= SCHEDULES ========= */}
        {tab === "schedules" && (
          <div>
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Staff Schedules</h2>
              <button onClick={openNewSchedule} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform sm:px-4 sm:text-xs"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
            {loadingSchedules ? <p className="text-sm text-muted-foreground">Loading...</p> : !schedules?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No schedules yet. Add working hours for your staff.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s) => {
                  const staffMember = staff?.find(st => st.id === s.staff_id);
                  return (
                    <div key={s.id} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">{staffMember?.name || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {DAYS[s.day_of_week]} · {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!s.is_available && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Unavailable</span>}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditSchedule(s)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => { if (confirm("Delete?")) deleteSchedule.mutateAsync(s.id).then(() => toast.success("Deleted")).catch(() => toast.error("Failed")); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
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
      </main>

      {/* ========= SERVICE FORM MODAL ========= */}
      {showServiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">{editingService ? "Edit Service" : "New Service"}</h3>
              <button onClick={() => setShowServiceForm(false)} className="text-muted-foreground hover:text-card-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>Name *</label><input type="text" value={serviceForm.name} onChange={(e) => setServiceForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Description</label><textarea value={serviceForm.description} onChange={(e) => setServiceForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Duration (min)</label><input type="number" value={serviceForm.duration_minutes} onChange={(e) => setServiceForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                <div><label className={labelCls}>Price ($)</label><input type="number" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={serviceForm.category} onChange={(e) => setServiceForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {categories?.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    {(!categories || categories.length === 0) && <option value="">No categories</option>}
                  </select>
                </div>
                <div><label className={labelCls}>Sort Order</label><input type="number" value={serviceForm.sort_order} onChange={(e) => setServiceForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
              </div>

              {/* Image fields with upload */}
              {(["image_url", "desktop_image_url", "mobile_image_url"] as const).map((field) => {
                const label = field === "image_url" ? "Thumbnail Image" : field === "desktop_image_url" ? "Desktop Background" : "Mobile Background";
                return (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="url"
                        value={serviceForm[field]}
                        onChange={(e) => setServiceForm(f => ({ ...f, [field]: e.target.value }))}
                        placeholder="URL or upload"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                        <Upload className="h-3 w-3" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, field)} />
                      </label>
                    </div>
                    {serviceForm[field] && (
                      <div className="mt-1 h-16 overflow-hidden rounded-lg border border-border">
                        <img src={serviceForm[field]} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={serviceForm.is_active} onChange={(e) => setServiceForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                <label htmlFor="is_active" className="text-xs text-card-foreground">Active</label>
              </div>
              <button onClick={handleSaveService} disabled={createService.isPending || updateService.isPending} className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm">
                {createService.isPending || updateService.isPending ? "Saving..." : editingService ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= LOCATION FORM MODAL ========= */}
      {showLocationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">{editingLocation ? "Edit Location" : "New Location"}</h3>
              <button onClick={() => setShowLocationForm(false)} className="text-muted-foreground hover:text-card-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>Name *</label><input type="text" value={locationForm.name} onChange={(e) => setLocationForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Address</label><input type="text" value={locationForm.address} onChange={(e) => setLocationForm(f => ({ ...f, address: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>City</label><input type="text" value={locationForm.city} onChange={(e) => setLocationForm(f => ({ ...f, city: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Phone</label><input type="tel" value={locationForm.phone} onChange={(e) => setLocationForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Email</label><input type="email" value={locationForm.email} onChange={(e) => setLocationForm(f => ({ ...f, email: e.target.value }))} className={inputCls} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="loc_active" checked={locationForm.is_active} onChange={(e) => setLocationForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                <label htmlFor="loc_active" className="text-xs text-card-foreground">Active</label>
              </div>
              <button onClick={handleSaveLocation} className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm">
                {editingLocation ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= STAFF FORM MODAL ========= */}
      {showStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">{editingStaffMember ? "Edit Staff" : "New Staff"}</h3>
              <button onClick={() => setShowStaffForm(false)} className="text-muted-foreground hover:text-card-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>Name *</label><input type="text" value={staffForm.name} onChange={(e) => setStaffForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Title</label><input type="text" value={staffForm.title} onChange={(e) => setStaffForm(f => ({ ...f, title: e.target.value }))} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={staffForm.category} onChange={(e) => setStaffForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {categories?.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    {(!categories || categories.length === 0) && <option value="">No categories</option>}
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Bio</label><textarea value={staffForm.bio} onChange={(e) => setStaffForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inputCls} /></div>
              <div><label className={labelCls}>Specialties (comma-separated)</label><input type="text" value={staffForm.specialties} onChange={(e) => setStaffForm(f => ({ ...f, specialties: e.target.value }))} placeholder="Fades, Beard, etc." className={inputCls} /></div>
              <div><label className={labelCls}>Image URL</label><input type="url" value={staffForm.image_url} onChange={(e) => setStaffForm(f => ({ ...f, image_url: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Location</label>
                <select value={staffForm.location_id} onChange={(e) => setStaffForm(f => ({ ...f, location_id: e.target.value }))} className={inputCls}>
                  <option value="">Any location</option>
                  {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="staff_active" checked={staffForm.is_active} onChange={(e) => setStaffForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                <label htmlFor="staff_active" className="text-xs text-card-foreground">Active</label>
              </div>
              <button onClick={handleSaveStaff} className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm">
                {editingStaffMember ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= CATEGORY FORM MODAL ========= */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">{editingCategory ? "Edit Category" : "New Category"}</h3>
              <button onClick={() => setShowCategoryForm(false)} className="text-muted-foreground hover:text-card-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>Name *</label><input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }))} className={inputCls} /></div>
              <div><label className={labelCls}>Slug *</label><input type="text" value={categoryForm.slug} onChange={(e) => setCategoryForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Description</label><textarea value={categoryForm.description} onChange={(e) => setCategoryForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tag Color</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="color" value={categoryForm.tag_color} onChange={(e) => setCategoryForm(f => ({ ...f, tag_color: e.target.value }))} className="h-8 w-8 cursor-pointer rounded border border-border" />
                    <input type="text" value={categoryForm.tag_color} onChange={(e) => setCategoryForm(f => ({ ...f, tag_color: e.target.value }))} className={inputCls} />
                  </div>
                </div>
                <div><label className={labelCls}>Sort Order</label><input type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cat_active" checked={categoryForm.is_active} onChange={(e) => setCategoryForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                <label htmlFor="cat_active" className="text-xs text-card-foreground">Active</label>
              </div>
              <button onClick={handleSaveCategory} className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm">
                {editingCategory ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= SCHEDULE FORM MODAL ========= */}
      {showScheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">{editingSchedule ? "Edit Schedule" : "New Schedule"}</h3>
              <button onClick={() => setShowScheduleForm(false)} className="text-muted-foreground hover:text-card-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Staff *</label>
                <select value={scheduleForm.staff_id} onChange={(e) => setScheduleForm(f => ({ ...f, staff_id: e.target.value }))} className={inputCls}>
                  <option value="">Select staff</option>
                  {staff?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Day of Week</label>
                <select value={scheduleForm.day_of_week} onChange={(e) => setScheduleForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))} className={inputCls}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Start Time</label><input type="time" value={scheduleForm.start_time} onChange={(e) => setScheduleForm(f => ({ ...f, start_time: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>End Time</label><input type="time" value={scheduleForm.end_time} onChange={(e) => setScheduleForm(f => ({ ...f, end_time: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sched_avail" checked={scheduleForm.is_available} onChange={(e) => setScheduleForm(f => ({ ...f, is_available: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                <label htmlFor="sched_avail" className="text-xs text-card-foreground">Available</label>
              </div>
              <button onClick={handleSaveSchedule} className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm">
                {editingSchedule ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {showClientForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                {editingClient ? "Edit Client" : "New Client"}
              </h3>
              <button onClick={() => setShowClientForm(false)} className="text-muted-foreground hover:text-card-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name</label>
                  <input
                    type="text"
                    value={clientForm.first_name}
                    onChange={(e) => setClientForm(f => ({ ...f, first_name: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input
                    type="text"
                    value={clientForm.last_name}
                    onChange={(e) => setClientForm(f => ({ ...f, last_name: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm(f => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  value={clientForm.notes}
                  onChange={(e) => setClientForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className={inputCls}
                />
              </div>
              <button
                onClick={async () => {
                  if (!clientForm.email && !clientForm.phone) {
                    toast.error("Email or phone required");
                    return;
                  }
                  try {
                    if (editingClient) {
                      await updateClient.mutateAsync({ id: editingClient.id, ...clientForm, tenant_id: editingClient.tenant_id });
                      toast.success("Client updated");
                    } else {
                      await createClient.mutateAsync({ ...clientForm, tenant_id: tenantId! });
                      toast.success("Client created");
                    }
                    setShowClientForm(false);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to save client");
                  }
                }}
                disabled={createClient.isPending || updateClient.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createClient.isPending || updateClient.isPending ? "Saving..." : editingClient ? "Update Client" : "Create Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Item Form Modal */}
      {showStockForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:mb-0">
          <div className="animate-slide-in-right w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-5 shadow-2xl sm:p-6 max-h-[90vh] overflow-y-auto mb-0">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">{editingStock ? "Edit Item" : "New Stock Item"}</h3>
              <button onClick={() => setShowStockForm(false)} className="text-muted-foreground hover:text-card-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>Name *</label><input type="text" value={stockForm.name} onChange={(e) => setStockForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Product name" /></div>
              <div><label className={labelCls}>SKU</label><input type="text" value={stockForm.sku} onChange={(e) => setStockForm(f => ({ ...f, sku: e.target.value }))} className={inputCls} placeholder="Optional" /></div>
              <div><label className={labelCls}>Description</label><textarea value={stockForm.description} onChange={(e) => setStockForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Quantity</label><input type="number" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} className={inputCls} disabled={!!editingStock} /></div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <select value={stockForm.unit} onChange={(e) => setStockForm(f => ({ ...f, unit: e.target.value }))} className={inputCls}>
                    <option value="each">each</option>
                    <option value="box">box</option>
                    <option value="bottle">bottle</option>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Cost Price ($)</label><input type="number" step="0.01" value={stockForm.cost_price} onChange={(e) => setStockForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} className={inputCls} /></div>
                <div><label className={labelCls}>Sell Price ($) *</label><input type="number" step="0.01" value={stockForm.sell_price} onChange={(e) => setStockForm(f => ({ ...f, sell_price: parseFloat(e.target.value) || 0 }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Min Stock (alert when below)</label><input type="number" step="0.01" value={stockForm.min_stock} onChange={(e) => setStockForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))} className={inputCls} /></div>
              <div><label className={labelCls}>Category</label><input type="text" value={stockForm.category} onChange={(e) => setStockForm(f => ({ ...f, category: e.target.value }))} className={inputCls} placeholder="e.g. salon, spa" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="stock_active" checked={stockForm.is_active} onChange={(e) => setStockForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                <label htmlFor="stock_active" className="text-xs text-card-foreground">Active (visible in POS)</label>
              </div>
              <button
                onClick={async () => {
                  if (!stockForm.name) { toast.error("Name required"); return; }
                  if (stockForm.sell_price < 0) { toast.error("Sell price must be >= 0"); return; }
                  try {
                    if (editingStock) {
                      await updateStockItem.mutateAsync({ id: editingStock.id, ...stockForm, quantity: editingStock.quantity });
                      toast.success("Updated");
                    } else {
                      await createStockItem.mutateAsync({ ...stockForm, tenant_id: tenantId! });
                      toast.success("Created");
                    }
                    setShowStockForm(false);
                  } catch { toast.error("Failed"); }
                }}
                disabled={createStockItem.isPending || updateStockItem.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createStockItem.isPending || updateStockItem.isPending ? "Saving..." : editingStock ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustForm && adjustItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:mb-0">
          <div className="animate-slide-in-right w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-5 shadow-2xl sm:p-6 mb-0">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">Adjust: {adjustItem.name}</h3>
              <button onClick={() => setShowAdjustForm(false)} className="text-muted-foreground hover:text-card-foreground"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Current: {Number(adjustItem.quantity)} {adjustItem.unit}</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Type</label>
                <select value={adjustForm.type} onChange={(e) => setAdjustForm(f => ({ ...f, type: e.target.value as any }))} className={inputCls}>
                  <option value="purchase">Purchase (add stock)</option>
                  <option value="adjustment">Adjustment (add/subtract)</option>
                  <option value="return">Return (add stock)</option>
                  <option value="sale">Sale (subtract - use POS instead)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Quantity {adjustForm.type === "purchase" || adjustForm.type === "return" ? "(positive)" : "(+ to add, - to subtract)"}</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustForm.quantity_delta}
                  onChange={(e) => setAdjustForm(f => ({ ...f, quantity_delta: parseFloat(e.target.value) || 0 }))}
                  className={inputCls}
                  placeholder={adjustForm.type === "purchase" ? "e.g. 10" : "e.g. 5 or -3"}
                />
              </div>
              <div><label className={labelCls}>Notes</label><input type="text" value={adjustForm.notes} onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
              <button
                onClick={async () => {
                  const delta = adjustForm.type === "purchase" || adjustForm.type === "return" ? Math.abs(adjustForm.quantity_delta) : adjustForm.quantity_delta;
                  if (delta === 0) { toast.error("Enter quantity"); return; }
                  if ((adjustForm.type === "sale" || adjustForm.type === "adjustment") && delta < 0 && Math.abs(delta) > Number(adjustItem.quantity)) {
                    toast.error("Insufficient stock"); return;
                  }
                  try {
                    const delta = adjustForm.type === "purchase" || adjustForm.type === "return"
                      ? Math.abs(adjustForm.quantity_delta)
                      : adjustForm.type === "sale"
                        ? -Math.abs(adjustForm.quantity_delta)
                        : adjustForm.quantity_delta;
                    await stockAdjustment.mutateAsync({
                      tenant_id: tenantId!,
                      stock_item_id: adjustItem.id,
                      quantity_delta: delta,
                      type: adjustForm.type === "sale" ? "sale" : adjustForm.type,
                      notes: adjustForm.notes || null,
                    });
                    toast.success("Stock adjusted");
                    setShowAdjustForm(false);
                  } catch (err: any) { toast.error(err.message || "Failed"); }
                }}
                disabled={stockAdjustment.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {stockAdjustment.isPending ? "Saving..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-slide-in-right w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                {editingPayment ? "Edit Payment" : "New Payment"}
              </h3>
              <button onClick={() => setShowPaymentForm(false)} className="text-muted-foreground hover:text-card-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm(f => ({ ...f, status: e.target.value as Payment["status"] }))}
                    className={inputCls}
                  >
                    <option value="pending">Pending</option>
                    <option value="succeeded">Succeeded</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!paymentForm.amount || paymentForm.amount <= 0) {
                    toast.error("Amount required");
                    return;
                  }
                  try {
                    if (editingPayment) {
                      await updatePayment.mutateAsync({ id: editingPayment.id, ...paymentForm });
                      toast.success("Payment updated");
                    } else {
                      await createPayment.mutateAsync({
                        ...paymentForm,
                        tenant_id: tenantId!,
                        booking_id: paymentForm.booking_id || null,
                        client_id: paymentForm.client_id || null,
                      });
                      toast.success("Payment created");
                    }
                    setShowPaymentForm(false);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to save payment");
                  }
                }}
                disabled={createPayment.isPending || updatePayment.isPending}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:scale-[1.02] transition-transform disabled:opacity-50 sm:text-sm"
              >
                {createPayment.isPending || updatePayment.isPending ? "Saving..." : editingPayment ? "Update Payment" : "Create Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" className="hidden" />
    </div>
  );
};

export default Admin;
