import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  useServices,
  useLocations,
  useStaff,
  useStaffSchedules,
  useBookingsByDate,
  useCreateBooking,
  useServiceCategories,
  type Service,
  type Location,
  type Staff,
} from "@/hooks/use-salon-data";
import { useTenant } from "@/hooks/use-tenant";
import { useTenantRatingStats } from "@/hooks/use-reviews";
import { X, Clock, ChevronRight, ChevronLeft, MapPin, User, Check, Star, CreditCard } from "lucide-react";
import { SiApplepay, SiGooglepay, SiAfterpay } from "react-icons/si";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useFeedback } from "@/hooks/use-feedback";

const defaultDesktopBg = "/images/hero-1.jpg";
const defaultMobileBg = "/images/hero-2.jpg";

// Map business types to background images
const getBusinessTypeBackground = (businessType: string | undefined) => {
  const bgMap: Record<string, { desktop: string; mobile: string }> = {
    salon: { desktop: "/images/tenant-salon.jpg", mobile: "/images/tenant-salon.jpg" },
    spa: { desktop: "/images/tenant-spa.jpg", mobile: "/images/tenant-spa.jpg" },
    mechanic: { desktop: "/images/tenant-mechanic.jpg", mobile: "/images/tenant-mechanic.jpg" },
    clinic: { desktop: "/images/tenant-clinic.jpg", mobile: "/images/tenant-clinic.jpg" },
    fitness: { desktop: "/images/tenant-fitness.jpg", mobile: "/images/tenant-fitness.jpg" },
  };
  return bgMap[businessType || ""] || { desktop: defaultDesktopBg, mobile: defaultMobileBg };
};

// Map business types to titles (47 characters each)
const getTenantTitle = (businessType: string | undefined): string => {
  const titleMap: Record<string, string> = {
    salon: "Elevated barbering and styling for all human kind.",
    spa: "Serene wellness experiences for mind and body.",
    mechanic: "Expert auto service and repair for every vehicle.",
    clinic: "Comprehensive healthcare services for your wellness.",
    fitness: "Transform your body and mind through fitness.",
  };
  return titleMap[businessType || ""] || "Elevated barbering and styling for all human kind.";
};

// Map business types to descriptions (48 characters each)
const getTenantDescription = (businessType: string | undefined): string => {
  const descMap: Record<string, string> = {
    salon: "A fresh take on barbering & hairdressing since 1996.",
    spa: "Relaxation and rejuvenation tailored just for you.",
    mechanic: "Trusted mechanics keeping your car running smooth.",
    clinic: "Professional medical care when you need it most.",
    fitness: "Personal training and classes to reach your goals.",
  };
  return descMap[businessType || ""] || "A fresh take on barbering & hairdressing since 1996.";
};

const STEPS = ["location", "service", "staff", "datetime", "details"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABELS: Record<Step, string> = {
  location: "Location",
  service: "Service",
  staff: "Specialist",
  datetime: "Time",
  details: "Confirm",
};

function generateSlots(start: string, end: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endM = eh * 60 + em;
  while (cur + durationMin <= endM) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += durationMin;
  }
  return slots;
}

function formatTime12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

const Index = () => {
  const { tenant, tenantId } = useTenant();
  const { showSuccess, showError } = useFeedback();
  const { data: services } = useServices(tenantId);
  const { data: locations } = useLocations(tenantId);
  const { data: allStaff } = useStaff(tenantId);
  const { data: categories } = useServiceCategories(tenantId);
  const createBooking = useCreateBooking();

  const [panelOpen, setPanelOpen] = useState(false);
  const [step, setStep] = useState<Step>("location");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [anyProfessional, setAnyProfessional] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingForm, setBookingForm] = useState({ name: "", email: "", phone: "" });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  // Set first category as active when loaded
  const effectiveCategory = activeCategory || categories?.[0]?.slug || null;

  // Staff schedules - all when anyProfessional, else selected staff
  const { data: schedules } = useStaffSchedules(anyProfessional ? undefined : selectedStaff?.id);
  // Existing bookings for selected date - all when anyProfessional, else filtered by staff
  const { data: existingBookings } = useBookingsByDate(selectedDate || undefined, anyProfessional ? undefined : selectedStaff?.id);

  // Filter staff by category of selected service
  const filteredStaff = useMemo(() => {
    if (!allStaff || !selectedService) return [];
    return allStaff.filter((s) => s.category === selectedService.category);
  }, [allStaff, selectedService]);

  // Filter services by active category
  const filteredServices = useMemo(() => {
    if (!services || !effectiveCategory) return services || [];
    return services.filter((s) => s.category === effectiveCategory);
  }, [services, effectiveCategory]);

  // Get available slots - when anyProfessional, merge slots from all staff
  const availableSlots = useMemo((): { time: string; booked: boolean; availableStaffIds?: string[] }[] => {
    if (!selectedDate || !selectedService || !schedules) return [];
    const dateObj = new Date(selectedDate + "T00:00:00");
    const dow = dateObj.getDay();
    if (anyProfessional) {
      const slotToStaffIds = new Map<string, string[]>();
      for (const staff of filteredStaff) {
        const schedule = schedules.find((s: { staff_id: string; day_of_week: number; is_available: boolean }) => s.staff_id === staff.id && s.day_of_week === dow && s.is_available);
        if (!schedule) continue;
        const staffBookings = existingBookings?.filter((b) => b.staff_id === staff.id && b.status !== "cancelled") ?? [];
        const bookedTimes = new Set(staffBookings.map((b) => b.booking_time.slice(0, 5)));
        const slots = generateSlots(schedule.start_time, schedule.end_time, selectedService.duration_minutes);
        for (const slot of slots) {
          if (!bookedTimes.has(slot)) {
            const list = slotToStaffIds.get(slot) ?? [];
            list.push(staff.id);
            slotToStaffIds.set(slot, list);
          }
        }
      }
      return Array.from(slotToStaffIds.entries()).map(([time, staffIds]) => ({ time, booked: false, availableStaffIds: staffIds }));
    }
    if (!selectedStaff) return [];
    const schedule = schedules.find((s: { staff_id?: string; day_of_week: number; is_available: boolean }) => s.day_of_week === dow && s.is_available);
    if (!schedule) return [];
    const allSlots = generateSlots(schedule.start_time, schedule.end_time, selectedService.duration_minutes);
    const bookedTimes = new Set(existingBookings?.filter(b => b.status !== "cancelled").map((b) => b.booking_time.slice(0, 5)) || []);
    return allSlots.map((slot) => ({ time: slot, booked: bookedTimes.has(slot) }));
  }, [selectedDate, selectedStaff, selectedService, schedules, existingBookings, anyProfessional, filteredStaff]);

  // Auto-select first available staff when anyProfessional + date + time chosen
  const effectiveStaff = useMemo(() => {
    if (selectedStaff) return selectedStaff;
    if (!anyProfessional || !selectedDate || !selectedTime || !filteredStaff.length) return null;
    const slotInfo = availableSlots.find((s) => s.time === selectedTime && s.availableStaffIds?.length);
    const staffIds = slotInfo?.availableStaffIds;
    if (!staffIds?.length) return null;
    return filteredStaff.find((s) => staffIds.includes(s.id)) ?? null;
  }, [selectedStaff, anyProfessional, selectedDate, selectedTime, filteredStaff, availableSlots]);

  // Next 14 days
  const dateOptions = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, []);

  // Background image - use business type background, fallback to service images or defaults
  const businessTypeBg = getBusinessTypeBackground(tenant?.business_type);
  const bgDesktop = selectedService?.desktop_image_url || businessTypeBg.desktop;
  const bgMobile = selectedService?.mobile_image_url || businessTypeBg.mobile;

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const clearSelection = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setAnyProfessional(false);
    setSelectedDate("");
    setSelectedTime("");
    setBookingForm({ name: "", email: "", phone: "" });
    setPaymentMethod("");
    setShowConfirmation(false);
    setStep("location");
  };

  const handleBooking = async () => {
    const staff = effectiveStaff;
    if (!selectedService || !staff || !selectedLocation || !bookingForm.name || !selectedDate || !selectedTime) {
      showError("Required", "Please complete all required fields");
      return;
    }
    if (!paymentMethod) {
      showError("Payment", "Please select a payment method");
      return;
    }
    try {
      await createBooking.mutateAsync({
        service_id: selectedService.id,
        staff_id: staff.id,
        location_id: selectedLocation.id,
        customer_name: bookingForm.name,
        customer_email: bookingForm.email || null,
        customer_phone: bookingForm.phone || null,
        booking_date: selectedDate,
        booking_time: selectedTime,
        status: "pending",
        total_price: selectedService.price,
        notes: null,
        user_id: null,
        tenant_id: tenantId,
        metadata: null,
      });
      setShowConfirmation(true);
      showSuccess("Booking confirmed", "Your booking has been confirmed.");

      // Send confirmation email (fire-and-forget)
      if (bookingForm.email) {
        supabase.functions.invoke("send-booking-confirmation", {
          body: {
            booking: {
              customer_name: bookingForm.name,
              customer_email: bookingForm.email,
              booking_date: selectedDate,
              booking_time: selectedTime,
              total_price: selectedService.price,
              service_name: selectedService.name,
              staff_name: staff.name,
              location_name: selectedLocation.name,
            },
            tenant: { name: tenant?.name },
          },
        }).catch(() => {}); // silent fail for email
      }
    } catch {
      showError("Failed", "Failed to create booking");
    }
  };

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m ? `${h}hr ${m}min` : `${h}hr`;
    }
    return `${mins}min`;
  };

  const getCategoryColor = (slug: string) => {
    const cat = categories?.find(c => c.slug === slug);
    return cat?.tag_color || undefined;
  };

  const stepIdx = STEPS.indexOf(step);
  const tenantName = tenant?.name || "Iska Service OS";
  const { data: ratingStats } = useTenantRatingStats(tenantId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero font-body">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
        <picture>
          <source media="(max-width: 767px)" srcSet={bgMobile} />
          <img
            src={bgDesktop}
            alt={tenantName}
            className="h-full w-full object-cover transition-all duration-700 grayscale-hero"
          />
        </picture>
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6 lg:px-12">
        <a href="/">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenantName} className="h-8 sm:h-10" />
          ) : (
            <img src="/iska systems logos.png" alt={tenantName} className="h-8 sm:h-10" />
          )}
        </a>
        <nav className="hidden gap-2 rounded-full bg-white/10 backdrop-blur-md shadow-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-widest text-hero-muted md:flex">
          <button onClick={() => { setPanelOpen(true); setStep("service"); }} className="rounded-full px-4 py-2 uppercase hover:text-hero-foreground transition-colors">SERVICES</button>
          {tenant?.slug && (
            <Link to={`/t/${tenant.slug}/reviews`} className="rounded-full px-4 py-2 hover:text-hero-foreground transition-colors flex items-center gap-1">
              Reviews
              {ratingStats && ratingStats.average_rating > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <Star className="h-3 w-3 fill-current" />
                  {ratingStats.average_rating.toFixed(1)}
                </span>
              )}
            </Link>
          )}
          <a href="/account" className="rounded-full px-4 py-2 hover:text-hero-foreground transition-colors">Account</a>
        </nav>
        <button
          onClick={() => setPanelOpen(true)}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-105 md:hidden"
        >
          Book
        </button>
      </header>

      {/* Hero Content - same container padding as header, generous bottom spacing */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col justify-end px-6 pb-12 sm:px-10 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold leading-tight text-hero-foreground sm:text-5xl lg:text-6xl">
            {getTenantTitle(tenant?.business_type)}
          </h1>
          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-hero-muted sm:text-sm">
            {getTenantDescription(tenant?.business_type)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setPanelOpen(true)}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-105"
            >
              Book appointment
            </button>
          </div>
        </div>
      </main>

      {/* Dialog: triggered by Book appointment button */}
      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent hideOverlay closeButtonClassName="absolute right-4 top-4 sm:right-5 rounded-lg bg-muted p-1.5 hover:bg-muted/80 data-[state=open]:!bg-muted" className="booking-dialog animate-none left-auto right-6 top-20 bottom-6 z-[100] flex w-full max-w-[calc(28rem-60px)] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-l-xl border-0 border-l bg-card p-0 shadow-2xl sm:right-10 sm:top-24 sm:bottom-8 sm:max-w-[calc(32rem-60px)] md:top-32 md:bottom-10 lg:right-12 lg:top-36 lg:bottom-12">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex min-w-0 shrink-0 items-center justify-between overflow-hidden p-4 sm:p-5">
              <div className="flex items-center gap-2">
                {!showConfirmation && stepIdx > 0 && (
                  <button onClick={goBack} className="rounded-lg bg-muted p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-card-foreground">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                  {showConfirmation ? "Confirmed" : STEP_LABELS[step]}
                </h3>
              </div>
            </div>

            {/* Panel content - uniform padding matching left */}
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]" style={{ scrollbarGutter: "stable" }}>
              {/* Confirmation view (inside same dialog) */}
              {showConfirmation && selectedService ? (
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Check className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground sm:text-base">Booking confirmed!</p>
                      <p className="text-[11px] text-muted-foreground">We&apos;ll see you soon</p>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3 text-xs sm:p-4 sm:text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{selectedService.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Specialist</span><span className="font-medium">{effectiveStaff?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{selectedLocation?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{selectedDate && new Date(selectedDate + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{selectedTime && formatTime12(selectedTime)}</span></div>
                    <div className="flex justify-between border-t border-border pt-2"><span className="font-bold">Total</span><span className="font-bold">${Number(selectedService.price).toFixed(0)}</span></div>
                  </div>
                  <button onClick={clearSelection} className="w-full rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] sm:text-sm">
                    Done
                  </button>
                </div>
              ) : (
              <>
              {/* STEP 1: Location */}
              {step === "location" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Choose your preferred location</p>
                  {locations?.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => { setSelectedLocation(loc); goNext(); }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:p-4 ${
                        selectedLocation?.id === loc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-card-foreground">{loc.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{loc.address}, {loc.city}</p>
                        {loc.phone && <p className="text-[10px] text-muted-foreground">{loc.phone}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2: Service */}
              {step === "service" && (
                <div>
                  {/* Dynamic category tabs */}
                  {categories && categories.length > 0 && (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => { setActiveCategory(cat.slug); setSelectedService(null); }}
                          className={
                            effectiveCategory === cat.slug
                              ? "shrink-0 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors text-white"
                              : "shrink-0 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors bg-secondary text-muted-foreground hover:text-foreground"
                          }
                          style={
                            effectiveCategory === cat.slug
                              ? { backgroundColor: cat.tag_color || "hsl(var(--primary))" }
                              : undefined
                          }
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected service or service list */}
                  {selectedService ? (
                    <div className="animate-fade-in">
                      <div className="rounded-xl border border-primary bg-primary/5 p-3 sm:p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-card-foreground">{selectedService.name}</p>
                              <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase text-white"
                                style={{ backgroundColor: getCategoryColor(selectedService.category) || "hsl(var(--primary))" }}
                              >
                                {selectedService.category}
                              </span>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />{formatDuration(selectedService.duration_minutes)}
                            </p>
                            {selectedService.description && (
                              <p className="mt-1 text-[11px] text-muted-foreground">{selectedService.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-card-foreground">${Number(selectedService.price).toFixed(0)}</span>
                            <button onClick={() => setSelectedService(null)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-card-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={goNext}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] sm:text-sm"
                      >
                        Choose specialist <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {filteredServices.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className="flex flex-col rounded-xl border border-border p-3 text-left transition-all hover:border-primary/40 sm:p-4"
                        >
                          {service.image_url && (
                            <div className="mb-2 h-16 w-full overflow-hidden rounded-lg sm:h-20">
                              <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold sm:text-sm">{service.name}</span>
                          </div>
                          <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                            <Clock className="h-3 w-3" />{formatDuration(service.duration_minutes)}
                          </span>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground sm:text-xs">
                              ${Number(service.price).toFixed(0)}
                            </span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                              style={{ backgroundColor: getCategoryColor(service.category) || "hsl(var(--primary))" }}
                            >
                              {service.category}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Staff */}
              {step === "staff" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose your specialist
                  </p>
                  {/* Any Professional option */}
                  <button
                    onClick={() => { setAnyProfessional(true); setSelectedStaff(null); goNext(); }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:p-4 ${
                      anyProfessional ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-l-xl bg-secondary text-muted-foreground">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-card-foreground">Any Professional</p>
                      <p className="text-[11px] text-muted-foreground">We&apos;ll assign based on availability</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                  {filteredStaff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setAnyProfessional(false); setSelectedStaff(s); goNext(); }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:p-4 ${
                        selectedStaff?.id === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-l-xl bg-primary/10">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-card-foreground">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.title}</p>
                        {s.specialties && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.specialties.slice(0, 3).map((sp) => (
                              <span key={sp} className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{sp}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 4: Date & Time Slots */}
              {step === "datetime" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Select a date</p>
                  <div className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                    {dateOptions.map((d) => {
                      const dateObj = new Date(d + "T00:00:00");
                      const dayName = dateObj.toLocaleDateString("en", { weekday: "short" });
                      const dayNum = dateObj.getDate();
                      const monthName = dateObj.toLocaleDateString("en", { month: "short" });
                      return (
                        <button
                          key={d}
                          onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                          className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-all ${
                            selectedDate === d ? "border-primary bg-primary text-primary-foreground" : "border-border text-card-foreground hover:border-primary/40"
                          }`}
                        >
                          <span className="text-[10px] font-medium uppercase">{dayName}</span>
                          <span className="text-lg font-bold">{dayNum}</span>
                          <span className="text-[10px]">{monthName}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate && (
                    <div className="animate-fade-in">
                      <p className="text-xs text-muted-foreground mb-2">Available time slots</p>
                      {availableSlots.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">No available slots for this date</p>
                      ) : (
                        <div className="grid max-w-full grid-cols-2 gap-2 sm:grid-cols-3">
                          {availableSlots.map(({ time, booked }) => (
                            <button
                              key={time}
                              onClick={() => !booked && setSelectedTime(time)}
                              disabled={booked}
                              className={`min-w-0 rounded-lg border px-3 py-2 text-center text-[11px] font-medium transition-all sm:text-xs whitespace-nowrap ${
                                booked
                                  ? "border-border bg-secondary/50 text-muted-foreground/40 line-through cursor-not-allowed"
                                  : selectedTime === time
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-card-foreground hover:border-primary/40"
                              }`}
                            >
                              {formatTime12(time)}
                              {booked && <span className="block text-[9px] no-underline">Reserved</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedTime && (effectiveStaff || selectedStaff) && (
                        <button
                          onClick={goNext}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] sm:text-sm"
                        >
                          Continue <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Details & Confirm */}
              {step === "details" && (
                <div className="animate-fade-in">
                  {/* Summary */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Booking summary</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium text-card-foreground">{selectedLocation?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium text-card-foreground">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Specialist</span>
                        <span className="font-medium text-card-foreground">{effectiveStaff?.name ?? (anyProfessional ? "Any available" : "")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date & Time</span>
                        <span className="font-medium text-card-foreground">
                          {selectedDate && new Date(selectedDate + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                          {selectedTime && ` at ${formatTime12(selectedTime)}`}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5">
                        <span className="font-bold text-card-foreground">Total</span>
                        <span className="font-bold text-card-foreground">${selectedService ? Number(selectedService.price).toFixed(0) : 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact form */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Your name *"
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>

                  {/* Payment method */}
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Payment method</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[
                        { id: "apple_pay", label: "Apple Pay", Icon: SiApplepay },
                        { id: "google_pay", label: "Google Pay", Icon: SiGooglepay },
                        { id: "card", label: "Card", Icon: CreditCard },
                        { id: "tabby", label: "Tabby", Icon: SiAfterpay },
                        { id: "tamara", label: "Tamara", Icon: SiAfterpay },
                      ].map((pm) => {
                        const Icon = pm.Icon;
                        return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-[11px] font-medium transition-all sm:text-xs ${
                            paymentMethod === pm.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          {pm.label}
                        </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleBooking}
                    disabled={createBooking.isPending || !bookingForm.name || !paymentMethod}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 sm:text-sm"
                  >
                    {createBooking.isPending ? "Booking..." : "Confirm booking"}
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              )}
              </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile bottom bar */}
      {!panelOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-hero-muted/20 bg-hero/90 px-6 py-3 backdrop-blur-md md:hidden sm:px-10">
          <p className="text-[10px] font-medium uppercase tracking-wider text-hero-muted">{tenantName}</p>
          <button
            onClick={() => setPanelOpen(true)}
            className="rounded-full bg-primary px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground"
          >
            Book now
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
