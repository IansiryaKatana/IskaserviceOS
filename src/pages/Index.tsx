import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { useSiteSetting } from "@/hooks/use-site-settings";
import { useTenantPaymentSettings } from "@/hooks/use-tenant-payment-settings";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { X, Clock, ArrowUpRight, ChevronRight, ChevronLeft, MapPin, User, Check, Star, CreditCard, Menu, Smartphone, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TypingText } from "@/components/TypingText";
import { useFeedback } from "@/hooks/use-feedback";

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (s: string) => s.length > 0 && EMAIL_REGEX.test(s.trim());

// Phone: digits only, 9–15 digits (national number)
const PHONE_DIGITS_MIN = 9;
const PHONE_DIGITS_MAX = 15;
const phoneDigitsOnly = (s: string) => s.replace(/\D/g, "");
/** For M-Pesa: 254 + 9 digits. Strip leading 0 after country code if present (e.g. 2540715454537 → 254715454537). */
const normalizeMpesaPhone = (s: string) => {
  const digits = phoneDigitsOnly(s);
  if (digits.startsWith("254") && digits.length === 12 && digits[3] === "0") return digits.slice(0, 3) + digits.slice(4);
  return digits;
};
const isValidPhone = (s: string) => {
  const digits = phoneDigitsOnly(s);
  return digits.length >= PHONE_DIGITS_MIN && digits.length <= PHONE_DIGITS_MAX;
};

// Country codes for phone. Dial code + ISO 3166-1 alpha-2 for flag image (FlagCDN).
const COUNTRY_CODES = [
  { code: "+971", country: "AE" },
  { code: "+966", country: "SA" },
  { code: "+1", country: "US" },
  { code: "+44", country: "GB" },
  { code: "+91", country: "IN" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+61", country: "AU" },
  { code: "+81", country: "JP" },
  { code: "+86", country: "CN" },
  { code: "+234", country: "NG" },
  { code: "+254", country: "KE" },
  { code: "+27", country: "ZA" },
  { code: "+20", country: "EG" },
  { code: "+972", country: "IL" },
  { code: "+90", country: "TR" },
  { code: "+39", country: "IT" },
  { code: "+34", country: "ES" },
  { code: "+31", country: "NL" },
  { code: "+32", country: "BE" },
  { code: "+41", country: "CH" },
  { code: "+43", country: "AT" },
  { code: "+48", country: "PL" },
  { code: "+55", country: "BR" },
  { code: "+52", country: "MX" },
  { code: "+54", country: "AR" },
  { code: "+57", country: "CO" },
  { code: "+60", country: "MY" },
  { code: "+65", country: "SG" },
  { code: "+66", country: "TH" },
  { code: "+84", country: "VN" },
  { code: "+62", country: "ID" },
  { code: "+63", country: "PH" },
  { code: "+64", country: "NZ" },
];

// FlagCDN: free, no API key. 3:2 ratio flag image.
const getFlagSrc = (countryCode: string) =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

// Detect default country from browser locale (e.g. en-AE -> +971). Fallback to UAE.
function getDefaultDialCode(): string {
  if (typeof navigator === "undefined") return "+971";
  const locale = navigator.language || (navigator.languages && navigator.languages[0]) || "";
  const region = locale.split("-")[1]?.toUpperCase();
  const match = COUNTRY_CODES.find((c) => c.country === region);
  return match ? match.code : "+971";
}

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

const STRIPE_BOOKING_PENDING_KEY = "stripe_booking_pending";

function StripePaymentForm({
  onSuccess,
  onCancel,
  onBeforeConfirm,
  amount,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  onBeforeConfirm: () => void;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    onBeforeConfirm();
    const params = new URLSearchParams(window.location.search);
    params.set("payment", "stripe");
    const returnUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: { name: window.location.hostname },
        },
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message || "Payment failed");
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-secondary">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || loading} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

const Index = () => {
  const { tenant, tenantId } = useTenant();
  const { showError } = useFeedback();
  const location = useLocation();
  const { data: services } = useServices(tenantId);
  const { data: locations } = useLocations(tenantId);
  const { data: allStaff } = useStaff(tenantId);
  const { data: categories } = useServiceCategories(tenantId);
  const createBooking = useCreateBooking();
  const tenantPayment = useTenantPaymentSettings(tenantId);

  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [step, setStep] = useState<Step>("location");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [anyProfessional, setAnyProfessional] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [dateWindowOffset, setDateWindowOffset] = useState(0); // days from today for start of 14-day window
  const [bookingForm, setBookingForm] = useState({ name: "", email: "", phone: "" });
  const [phoneCountryCode, setPhoneCountryCode] = useState(getDefaultDialCode);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationSummary, setConfirmationSummary] = useState<{
    serviceName: string;
    staffName: string;
    locationName: string;
    bookingDate: string;
    bookingTime: string;
    totalPrice: number;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string; form?: string }>({});
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const stripePromise = useMemo(
    () => (tenantPayment.stripePublishableKey ? loadStripe(tenantPayment.stripePublishableKey) : null),
    [tenantPayment.stripePublishableKey]
  );
  const [mpesaPending, setMpesaPending] = useState(false);
  const [mpesaCheckoutRequestId, setMpesaCheckoutRequestId] = useState<string | null>(null);
  const [mpesaChecking, setMpesaChecking] = useState(false);
  const [stripePaymentLoading, setStripePaymentLoading] = useState(false);
  const [mpesaPushLoading, setMpesaPushLoading] = useState(false);

  // After Stripe redirect: create booking from saved context and clean URL (once)
  const stripeReturnHandled = useRef(false);
  const locationSearch = location.search || "";
  useEffect(() => {
    const params = new URLSearchParams(locationSearch);
    const payment = params.get("payment");
    const redirectStatus = params.get("redirect_status");
    if (payment !== "stripe" || redirectStatus !== "succeeded" || stripeReturnHandled.current) return;
    const raw = sessionStorage.getItem(STRIPE_BOOKING_PENDING_KEY);
    if (!raw) return;
    stripeReturnHandled.current = true;
    try {
      const payload = JSON.parse(raw) as {
        service_id: string;
        staff_id: string;
        location_id: string;
        customer_name: string;
        customer_email: string | null;
        customer_phone: string | null;
        booking_date: string;
        booking_time: string;
        total_price: number;
        tenant_id: string;
        service_name?: string;
        staff_name?: string;
        location_name?: string;
        tenant_name?: string;
      };
      createBooking.mutateAsync({
        service_id: payload.service_id,
        staff_id: payload.staff_id,
        location_id: payload.location_id,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: payload.customer_phone,
        booking_date: payload.booking_date,
        booking_time: payload.booking_time,
        total_price: payload.total_price,
        tenant_id: payload.tenant_id,
        status: "confirmed",
        notes: null,
        user_id: null,
        metadata: null,
      }).then(() => {
        setShowConfirmation(true);
        setConfirmationSummary({
          serviceName: payload.service_name ?? "Service",
          staffName: payload.staff_name ?? "",
          locationName: payload.location_name ?? "",
          bookingDate: payload.booking_date,
          bookingTime: payload.booking_time,
          totalPrice: payload.total_price,
        });
        sessionStorage.removeItem(STRIPE_BOOKING_PENDING_KEY);
        if (payload.customer_email && "service_name" in payload && "tenant_name" in payload) {
          supabase.functions.invoke("send-booking-confirmation", {
            body: {
              booking: {
                customer_name: payload.customer_name,
                customer_email: payload.customer_email,
                booking_date: payload.booking_date,
                booking_time: payload.booking_time,
                service_name: (payload as { service_name?: string }).service_name,
                staff_name: (payload as { staff_name?: string }).staff_name,
                location_name: (payload as { location_name?: string }).location_name,
                total_price: payload.total_price,
              },
              tenant: { name: (payload as { tenant_name?: string }).tenant_name },
            },
          }).catch(() => {});
        }
        params.delete("payment");
        params.delete("redirect_status");
        params.delete("payment_intent");
        params.delete("payment_intent_client_secret");
        const clean = params.toString() ? `?${params.toString()}` : window.location.pathname;
        window.history.replaceState(null, "", clean);
      }).catch((err: unknown) => {
        showError("Booking failed", err instanceof Error ? err.message : "Could not create booking");
        sessionStorage.removeItem(STRIPE_BOOKING_PENDING_KEY);
        stripeReturnHandled.current = false;
      });
    } catch {
      sessionStorage.removeItem(STRIPE_BOOKING_PENDING_KEY);
      stripeReturnHandled.current = false;
    }
  }, [locationSearch, createBooking, showError]);

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

  // 14-day window; offset moves the window (0 = today..+13, 14 = +14..+27, etc.)
  const dateOptions = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    const startDay = today.getDate() + dateWindowOffset;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), startDay + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, [dateWindowOffset]);

  // Background image - tenant homepage bg from site_settings (if set), else business type / service / defaults
  const { data: tenantHomeDesktop } = useSiteSetting("homepage_bg_desktop", tenantId ?? null);
  const { data: tenantHomeMobile } = useSiteSetting("homepage_bg_mobile", tenantId ?? null);
  const businessTypeBg = getBusinessTypeBackground(tenant?.business_type);
  const bgDesktop = tenantHomeDesktop?.value || selectedService?.desktop_image_url || businessTypeBg.desktop;
  const bgMobile = tenantHomeMobile?.value || selectedService?.mobile_image_url || businessTypeBg.mobile;

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
    setPhoneCountryCode(getDefaultDialCode());
    setFieldErrors({});
    setShowConfirmation(false);
    setConfirmationSummary(null);
    setMpesaPending(false);
    setMpesaCheckoutRequestId(null);
    setMpesaChecking(false);
    setStripePaymentLoading(false);
    setMpesaPushLoading(false);
    setStep("location");
  };

  const handleBooking = async () => {
    const name = bookingForm.name?.trim() ?? "";
    const staff = effectiveStaff ?? selectedStaff;
    const email = bookingForm.email?.trim() ?? "";
    const phoneRaw = bookingForm.phone?.trim() ?? "";
    const errors: typeof fieldErrors = {};
    if (!selectedLocation || !selectedService || !staff || !selectedDate || !selectedTime) {
      errors.form = "Complete all steps above (location, service, specialist, date & time).";
    }
    if (!name) errors.name = "Please enter your name";
    if (email && !isValidEmail(email)) errors.email = "Enter a valid email address";
    if (phoneRaw && !isValidPhone(phoneRaw)) {
      const digits = phoneDigitsOnly(phoneRaw);
      errors.phone = digits.length < PHONE_DIGITS_MIN
        ? `At least ${PHONE_DIGITS_MIN} digits`
        : `No more than ${PHONE_DIGITS_MAX} digits`;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    const fullPhone = phoneRaw
      ? `${phoneCountryCode}${phoneDigitsOnly(phoneRaw)}`
      : null;
    try {
      await createBooking.mutateAsync({
        service_id: selectedService.id,
        staff_id: staff.id,
        location_id: selectedLocation.id,
        customer_name: name,
        customer_email: email || null,
        customer_phone: fullPhone,
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

      // Send confirmation email (fire-and-forget)
      if (email) {
        supabase.functions.invoke("send-booking-confirmation", {
          body: {
            booking: {
              customer_name: name,
              customer_email: email,
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
      setFieldErrors((e) => ({ ...e, form: "Failed to create booking. Try again." }));
    }
  };

  const doCreateBookingAfterPayment = async () => {
    const staff = effectiveStaff ?? selectedStaff;
    if (!selectedService || !staff || !selectedLocation || !selectedDate || !selectedTime || !tenantId) return;
    const email = bookingForm.email?.trim() ?? "";
    const phoneRaw = bookingForm.phone?.trim() ?? "";
    const fullPhone = phoneRaw ? `${phoneCountryCode}${phoneDigitsOnly(phoneRaw)}` : null;
    const customerName = bookingForm.name?.trim() ?? "";
    try {
      await createBooking.mutateAsync({
        service_id: selectedService.id,
        staff_id: staff.id,
        location_id: selectedLocation.id,
        customer_name: customerName,
        customer_email: email || null,
        customer_phone: fullPhone,
        booking_date: selectedDate,
        booking_time: selectedTime,
        status: "confirmed",
        total_price: selectedService.price,
        notes: null,
        user_id: null,
        tenant_id: tenantId,
        metadata: null,
      });
      setShowConfirmation(true);
      if (email) {
        supabase.functions.invoke("send-booking-confirmation", {
          body: {
            booking: {
              customer_name: customerName,
              customer_email: email,
              booking_date: selectedDate,
              booking_time: selectedTime,
              service_name: selectedService.name,
              staff_name: staff.name,
              location_name: selectedLocation.name,
              total_price: selectedService.price,
            },
            tenant: { name: tenant?.name },
          },
        }).catch(() => {});
      }
    } catch (err: unknown) {
      showError("Booking failed", err instanceof Error ? err.message : "Could not create booking");
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
        <nav className="hidden gap-2 rounded-full bg-white/10 backdrop-blur-md shadow-lg px-3 py-2 font-body text-xs font-medium uppercase tracking-widest text-white md:flex">
          <button
            onClick={() => { setPanelOpen(true); setStep("service"); }}
            className={`rounded-full px-4 py-2 uppercase transition-colors ${panelOpen ? "bg-primary text-primary-foreground" : "text-white"}`}
          >
            SERVICES
          </button>
          {tenant?.slug && (
            <Link
              to={`/t/${tenant.slug}/reviews`}
              className={`rounded-full px-4 py-2 flex items-center gap-1 transition-colors ${location.pathname === `/t/${tenant.slug}/reviews` ? "bg-primary text-primary-foreground" : "text-white"}`}
            >
              Reviews
              {ratingStats && ratingStats.average_rating > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <Star className="h-3 w-3 fill-current" />
                  {ratingStats.average_rating.toFixed(1)}
                </span>
              )}
            </Link>
          )}
          <a
            href="/account"
            className={`rounded-full px-4 py-2 transition-colors ${location.pathname === "/account" ? "bg-primary text-primary-foreground" : "text-white"}`}
          >
            Account
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
                onClick={() => { setPanelOpen(true); setStep("service"); setMobileMenuOpen(false); }}
                className="rounded-full bg-primary px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-primary-foreground"
              >
                Services
              </button>
              {tenant?.slug && (
                <Link
                  to={`/t/${tenant.slug}/reviews`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-full px-4 py-3 text-sm font-medium uppercase ${location.pathname === `/t/${tenant.slug}/reviews` ? "bg-primary text-primary-foreground" : "text-foreground"}`}
                >
                  Reviews
                </Link>
              )}
              <a
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-full px-4 py-3 text-sm font-medium uppercase ${location.pathname === "/account" ? "bg-primary text-primary-foreground" : "text-foreground"}`}
              >
                Account
              </a>
              <button
                onClick={() => { setPanelOpen(true); setStep("location"); setMobileMenuOpen(false); }}
                className="rounded-full bg-primary px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-primary-foreground"
              >
                Book appointment
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Hero Content - same container padding as header, generous bottom spacing */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col justify-end px-6 pb-12 sm:px-10 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold leading-tight text-hero-foreground sm:text-5xl lg:text-6xl">
            <TypingText
              text={getTenantTitle(tenant?.business_type)}
              speed={42}
              cursor
              className="inline"
            />
          </h1>
          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-hero-muted sm:text-sm animate-fade-in-up-delay-desc">
            {getTenantDescription(tenant?.business_type)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 animate-fade-in-up-delay-btn">
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
            {/* Panel header: location step = title left; other steps = back left, title centered */}
            {step === "location" ? (
              <div className="flex min-w-0 shrink-0 items-center justify-between overflow-hidden p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                    {STEP_LABELS[step]}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="relative flex min-w-0 shrink-0 items-center justify-between overflow-hidden p-4 sm:p-5">
                <div className="flex w-10 shrink-0 items-center sm:w-12">
                  {!showConfirmation && stepIdx > 0 && (
                    <button onClick={goBack} className="rounded-lg bg-muted p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-card-foreground">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {!showConfirmation && (
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
                    <h3 className="font-display text-base font-bold text-card-foreground sm:text-lg">
                      {STEP_LABELS[step]}
                    </h3>
                  </div>
                )}
                <div className="w-10 shrink-0 sm:w-12" aria-hidden />
              </div>
            )}

            {/* Panel content - uniform padding matching left */}
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]" style={{ scrollbarGutter: "stable" }}>
              {/* Confirmation view (inside same dialog) */}
              {showConfirmation && (selectedService || confirmationSummary) ? (
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
                    <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{confirmationSummary?.serviceName ?? selectedService?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Specialist</span><span className="font-medium">{confirmationSummary?.staffName ?? effectiveStaff?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{confirmationSummary?.locationName ?? selectedLocation?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{(confirmationSummary?.bookingDate || selectedDate) && new Date((confirmationSummary?.bookingDate || selectedDate) + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{confirmationSummary?.bookingTime ? formatTime12(confirmationSummary.bookingTime) : (selectedTime && formatTime12(selectedTime))}</span></div>
                    <div className="flex justify-between border-t border-border pt-2"><span className="font-bold">Total</span><span className="font-bold">${Number(confirmationSummary?.totalPrice ?? selectedService?.price ?? 0).toFixed(0)}</span></div>
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
                      onClick={() => setSelectedLocation(loc)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:p-4 ${
                        selectedLocation?.id === loc.id
                          ? "border-primary bg-primary text-primary-foreground [&_.text-card-foreground]:text-primary-foreground [&_.text-primary]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/90"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedLocation?.id === loc.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-card-foreground">{loc.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{loc.address}, {loc.city}</p>
                        {loc.phone && <p className="text-[10px] text-muted-foreground">{loc.phone}</p>}
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
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
                              ? "shrink-0 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors text-primary-foreground"
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
                      <div className="rounded-xl border border-primary bg-primary text-primary-foreground p-3 sm:p-4 [&_.text-card-foreground]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/90">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-card-foreground">{selectedService.name}</p>
                              <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase text-primary-foreground opacity-90"
                                style={{ backgroundColor: "hsl(var(--primary-foreground) / 0.25)" }}
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
                            <button onClick={() => setSelectedService(null)} className="rounded-full p-1 text-muted-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
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
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    Choose your specialist
                  </p>
                  {/* Any Professional option */}
                  <button
                    onClick={() => { setAnyProfessional(true); setSelectedStaff(null); }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:p-4 ${
                      anyProfessional
                        ? "border-primary bg-primary text-primary-foreground [&_.text-card-foreground]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/90"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ${anyProfessional ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-card-foreground">Any Professional</p>
                      <p className="text-[11px] text-muted-foreground">We&apos;ll assign based on availability</p>
                    </div>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${anyProfessional ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"}`}>
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </button>
                  {filteredStaff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setAnyProfessional(false); setSelectedStaff(s); }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:p-4 ${
                        selectedStaff?.id === s.id
                          ? "border-primary bg-primary text-primary-foreground [&_.text-card-foreground]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/90 [&_.bg-secondary]:bg-primary-foreground/20 [&_.bg-secondary]:text-primary-foreground"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ${selectedStaff?.id === s.id ? "bg-primary-foreground/20" : "bg-primary/10"}`}>
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <User className={`h-4 w-4 ${selectedStaff?.id === s.id ? "text-primary-foreground" : "text-primary"}`} />
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
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selectedStaff?.id === s.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 4: Date & Time Slots */}
              {step === "datetime" && (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDateWindowOffset((o) => Math.max(0, o - 14))}
                      disabled={dateWindowOffset === 0}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 disabled:opacity-40 disabled:pointer-events-none"
                      aria-label="Previous dates"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-muted-foreground text-center">Select a date</p>
                    <button
                      type="button"
                      onClick={() => setDateWindowOffset((o) => o + 14)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
                      aria-label="Next dates"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
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
                      <p className="text-xs text-muted-foreground mb-2 text-center">Available time slots</p>
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

                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Details & Confirm */}
              {step === "details" && (
                <div className="animate-fade-in">
                  {fieldErrors.form && (
                    <p className="mb-3 text-xs text-destructive">{fieldErrors.form}</p>
                  )}
                  {/* Summary */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-3 sm:p-4 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">Booking summary</p>
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
                    <div>
                      <input
                        type="text"
                        placeholder="Your name *"
                        value={bookingForm.name}
                        onChange={(e) => { setBookingForm((f) => ({ ...f, name: e.target.value })); setFieldErrors((e) => ({ ...e, name: undefined })); }}
                        className={`w-full rounded-lg border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 sm:text-sm ${fieldErrors.name ? "border-destructive" : "border-border focus:ring-primary"}`}
                      />
                      {fieldErrors.name && <p className="mt-1 text-[10px] text-destructive">{fieldErrors.name}</p>}
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email"
                        value={bookingForm.email}
                        onChange={(e) => { setBookingForm((f) => ({ ...f, email: e.target.value })); setFieldErrors((e) => ({ ...e, email: undefined })); }}
                        className={`w-full rounded-lg border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 sm:text-sm ${fieldErrors.email ? "border-destructive" : "border-border focus:ring-primary"}`}
                      />
                      {fieldErrors.email && <p className="mt-1 text-[10px] text-destructive">{fieldErrors.email}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                        <SelectTrigger className="flex h-10 w-[130px] shrink-0 cursor-pointer flex-row items-center rounded-lg border border-border bg-background px-2 py-2.5 text-xs sm:text-sm [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-2 [&>span:first-child]:flex-row">
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent className="z-[200] max-h-[min(16rem,70vh)]" position="popper" sideOffset={4}>
                          {COUNTRY_CODES.map(({ code, country }) => (
                            <SelectItem key={code} value={code} className="cursor-pointer text-xs sm:text-sm">
                              <span className="flex w-full flex-row items-center gap-2 whitespace-nowrap pl-0">
                                <img src={getFlagSrc(country)} alt="" className="h-4 w-6 shrink-0 rounded object-cover" />
                                <span className="shrink-0">{code}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Phone (digits only)"
                        value={bookingForm.phone}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, PHONE_DIGITS_MAX);
                          setBookingForm((f) => ({ ...f, phone: v }));
                          setFieldErrors((e) => ({ ...e, phone: undefined }));
                        }}
                        className={`min-w-0 flex-1 rounded-lg border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 sm:text-sm ${fieldErrors.phone ? "border-destructive" : "border-border focus:ring-primary"}`}
                      />
                    </div>
                    {(fieldErrors.phone || (bookingForm.phone && !isValidPhone(bookingForm.phone))) && (
                      <p className="text-[10px] text-destructive">
                        {fieldErrors.phone || `Enter ${PHONE_DIGITS_MIN}–${PHONE_DIGITS_MAX} digits`}
                      </p>
                    )}
                  </div>

                  {/* Pay with PayPal / Stripe / M-Pesa or pay at venue */}
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Payment</p>
                    {tenantPayment.hasAnyPayment ? (
                      <div className="space-y-3">
                    {tenantPayment.paypalClientId ? (
                      <PayPalScriptProvider
                        options={{
                          clientId: tenantPayment.paypalClientId,
                          currency: "USD",
                          intent: "capture",
                        }}
                      >
                        <PayPalButtons
                          style={{ layout: "vertical", label: "paypal", color: "gold" }}
                          createOrder={async () => {
                            const name = bookingForm.name?.trim() ?? "";
                            if (!name) {
                              setFieldErrors((e) => ({ ...e, name: "Please enter your name" }));
                              return Promise.reject(new Error("Please enter your name"));
                            }
                            const amount = Number(selectedService?.price) ?? 0;
                            if (!amount || amount <= 0) return Promise.reject(new Error("Invalid amount"));
                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                            const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                            const res = await fetch(`${supabaseUrl}/functions/v1/create-paypal-order`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${anonKey}`,
                              },
                              body: JSON.stringify({ amount, currency: "USD", tenant_id: tenantId }),
                            });
                            const body = await res.json().catch(() => ({} as { orderID?: string; error?: string }));
                            if (!res.ok) return Promise.reject(new Error((body as { error?: string }).error ?? `Request failed (${res.status})`));
                            const orderID = (body as { orderID?: string }).orderID;
                            if (!orderID) return Promise.reject(new Error("No order ID"));
                            return orderID;
                          }}
                          onApprove={async (data) => {
                            const { data: captureData, error: captureError } = await supabase.functions.invoke(
                              "capture-paypal-order",
                              { body: { orderId: data.orderID, tenant_id: tenantId } }
                            );
                            if (captureError || !captureData?.success) {
                              showError("Payment failed", captureData?.error || captureError?.message || "Could not capture payment");
                              return;
                            }
                            const staff = effectiveStaff ?? selectedStaff;
                            const email = bookingForm.email?.trim() ?? "";
                            const phoneRaw = bookingForm.phone?.trim() ?? "";
                            const fullPhone = phoneRaw ? `${phoneCountryCode}${phoneDigitsOnly(phoneRaw)}` : null;
                            try {
                              const customerName = bookingForm.name?.trim() ?? "";
                              await createBooking.mutateAsync({
                                service_id: selectedService!.id,
                                staff_id: staff!.id,
                                location_id: selectedLocation!.id,
                                customer_name: customerName,
                                customer_email: email || null,
                                customer_phone: fullPhone,
                                booking_date: selectedDate,
                                booking_time: selectedTime,
                                status: "confirmed",
                                total_price: selectedService!.price,
                                notes: null,
                                user_id: null,
                                tenant_id: tenantId,
                                metadata: null,
                              });
                              setShowConfirmation(true);
                              if (email) {
                                supabase.functions.invoke("send-booking-confirmation", {
                                  body: {
                                    booking: {
                                      customer_name: customerName,
                                      customer_email: email,
                                      booking_date: selectedDate,
                                      booking_time: selectedTime,
                                      service_name: selectedService?.name,
                                      staff_name: staff?.name,
                                      location_name: selectedLocation?.name,
                                      total_price: selectedService?.price,
                                    },
                                    tenant: { name: tenant?.name },
                                  },
                                }).catch(() => {});
                              }
                            } catch (err: unknown) {
                              showError("Booking failed", err instanceof Error ? err.message : "Could not create booking");
                            }
                          }}
                          onError={(err) => {
                            const msg = err?.message || "";
                            if (msg.includes("Please enter your name") || msg.includes("Invalid amount")) return;
                            showError("Payment error", msg || "Something went wrong");
                          }}
                        />
                      </PayPalScriptProvider>
                    ) : null}
                    {tenantPayment.stripePublishableKey && (
                      stripeClientSecret && selectedService && stripePromise ? (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Pay with Card</p>
                          <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: "stripe" } }}>
                            <StripePaymentForm
                              amount={Number(selectedService.price) ?? 0}
                              onBeforeConfirm={() => {
                                const staff = effectiveStaff ?? selectedStaff;
                                if (!staff || !selectedLocation) return;
                                const fullPhone = bookingForm.phone?.trim()
                                  ? `${phoneCountryCode}${phoneDigitsOnly(bookingForm.phone)}`
                                  : null;
                                const payload = {
                                  service_id: selectedService.id,
                                  staff_id: staff.id,
                                  location_id: selectedLocation.id,
                                  customer_name: bookingForm.name?.trim() ?? "",
                                  customer_email: bookingForm.email?.trim() || null,
                                  customer_phone: fullPhone,
                                  booking_date: selectedDate,
                                  booking_time: selectedTime,
                                  total_price: selectedService.price,
                                  tenant_id: tenantId ?? "",
                                  service_name: selectedService.name,
                                  staff_name: staff.name,
                                  location_name: selectedLocation.name,
                                  tenant_name: tenant?.name ?? "",
                                };
                                sessionStorage.setItem(STRIPE_BOOKING_PENDING_KEY, JSON.stringify(payload));
                              }}
                              onSuccess={async () => {
                                setStripeClientSecret(null);
                                await doCreateBookingAfterPayment();
                              }}
                              onCancel={() => setStripeClientSecret(null)}
                            />
                          </Elements>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={stripePaymentLoading}
                          onClick={async () => {
                            const name = bookingForm.name?.trim() ?? "";
                            if (!name) {
                              setFieldErrors((e) => ({ ...e, name: "Please enter your name" }));
                              return;
                            }
                            const amount = Number(selectedService?.price) ?? 0;
                            if (!amount || amount <= 0) return;
                            setStripePaymentLoading(true);
                            try {
                              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                              const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                              const res = await fetch(`${supabaseUrl}/functions/v1/create-stripe-payment-intent`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
                                body: JSON.stringify({ amount, currency: "usd", tenant_id: tenantId }),
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                showError("Payment", (data as { error?: string }).error ?? "Could not start payment");
                                return;
                              }
                              setStripeClientSecret((data as { clientSecret?: string }).clientSecret ?? null);
                            } finally {
                              setStripePaymentLoading(false);
                            }
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 disabled:hover:brightness-100 sm:text-base"
                          style={{ backgroundColor: "#635BFF" }}
                        >
                          {stripePaymentLoading ? (
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <CreditCard className="h-5 w-5 shrink-0" />
                          )}
                          {stripePaymentLoading ? "Loading…" : "Pay with Card"}
                        </button>
                      )
                    )}
                    {tenantPayment.mpesaConfigured && (
                      <div className="space-y-2">
                        {!mpesaPending ? (
                          <button
                            type="button"
                            disabled={mpesaPushLoading}
                            onClick={async () => {
                              const name = bookingForm.name?.trim() ?? "";
                              if (!name) {
                                setFieldErrors((e) => ({ ...e, name: "Please enter your name" }));
                                return;
                              }
                              const amount = Number(selectedService?.price) ?? 0;
                              if (!amount || amount <= 0) return;
                              const phone = phoneDigitsOnly(bookingForm.phone ?? "");
                              if (phone.length < 9) {
                                showError("M-Pesa", "Enter a valid phone number for M-Pesa");
                                return;
                              }
                              setMpesaPushLoading(true);
                              try {
                                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                                const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                                const res = await fetch(`${supabaseUrl}/functions/v1/mpesa-stk-push`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
                                  body: JSON.stringify({ tenant_id: tenantId, amount, phone: normalizeMpesaPhone(phoneCountryCode + (bookingForm.phone ?? "")) }),
                                });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok || !(data as { success?: boolean }).success) {
                                  showError("M-Pesa", (data as { error?: string }).error ?? "Could not send prompt");
                                  return;
                                }
                                const cid = (data as { checkoutRequestID?: string }).checkoutRequestID ?? null;
                                setMpesaCheckoutRequestId(cid);
                                setMpesaPending(true);
                              } finally {
                                setMpesaPushLoading(false);
                              }
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 disabled:hover:brightness-100 sm:text-base"
                            style={{ backgroundColor: "#00A650" }}
                          >
                            {mpesaPushLoading ? (
                              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                            ) : (
                              <Smartphone className="h-5 w-5 shrink-0" />
                            )}
                            {mpesaPushLoading ? "Sending…" : "Pay with M-Pesa"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!mpesaCheckoutRequestId || mpesaChecking}
                            onClick={async () => {
                              if (!mpesaCheckoutRequestId || mpesaChecking) return;
                              setMpesaChecking(true);
                              try {
                                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                                const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                                const res = await fetch(`${supabaseUrl}/functions/v1/mpesa-stk-query`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
                                  body: JSON.stringify({ tenant_id: tenantId, checkout_request_id: mpesaCheckoutRequestId }),
                                });
                                const data = await res.json().catch(() => ({}));
                                const paid = (data as { paid?: boolean }).paid === true;
                                if (!paid) {
                                  showError(
                                    "M-Pesa",
                                    (data as { error?: string }).error ?? (data as { resultDesc?: string }).resultDesc ?? "Payment not received yet. Complete the M-Pesa prompt on your phone, then try again."
                                  );
                                  return;
                                }
                                setMpesaPending(false);
                                setMpesaCheckoutRequestId(null);
                                await doCreateBookingAfterPayment();
                              } finally {
                                setMpesaChecking(false);
                              }
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 disabled:hover:brightness-100 sm:text-sm"
                          >
                            {mpesaChecking ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            {mpesaChecking ? "Checking payment…" : "I've paid – confirm booking"}
                          </button>
                        )}
                      </div>
                    )}
                    {tenantPayment.payAtVenueEnabled && (
                      <button
                        onClick={handleBooking}
                        disabled={createBooking.isPending || !bookingForm.name?.trim()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 disabled:hover:brightness-100 sm:text-sm"
                      >
                        {createBooking.isPending ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {createBooking.isPending ? "Booking…" : "Request booking (pay at venue)"}
                      </button>
                    )}
                      </div>
                    ) : tenantPayment.payAtVenueEnabled ? (
                      <>
                        <p className="mb-3 text-xs text-muted-foreground">
                          Online payment is not set up. You can request a booking and pay at the venue.
                        </p>
                        <button
                          onClick={handleBooking}
                          disabled={createBooking.isPending || !bookingForm.name?.trim()}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 disabled:hover:brightness-100 sm:text-sm"
                        >
                          {createBooking.isPending ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          {createBooking.isPending ? "Booking…" : "Request booking (pay at venue)"}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No payment options are available for this business. Please contact them to book.
                      </p>
                    )}
                  </div>
                </div>
              )}
              </>
              )}
            </div>

            {/* Bottom: building summary + Next (steps location → datetime only) */}
            {!showConfirmation && step !== "details" && (
              <div className="relative flex shrink-0 flex-col gap-3 bg-card/98 p-4 sm:p-5 pt-6 sm:pt-7">
                <div className="pointer-events-none absolute left-0 right-0 top-0 h-8 bg-gradient-to-b from-transparent to-card/98" aria-hidden />
                <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs sm:p-4 sm:text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Your order</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium text-card-foreground">{selectedLocation?.name ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium text-card-foreground">{selectedService?.name ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Specialist</span>
                      <span className="font-medium text-card-foreground">
                        {anyProfessional ? "Any available" : selectedStaff?.name ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date & Time</span>
                      <span className="font-medium text-card-foreground">
                        {selectedDate && selectedTime
                          ? `${new Date(selectedDate + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })} at ${formatTime12(selectedTime)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5">
                      <span className="font-bold text-card-foreground">Total</span>
                      <span className="font-bold text-card-foreground">
                        {selectedService ? `$${Number(selectedService.price).toFixed(0)}` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={goNext}
                  disabled={
                    (step === "location" && !selectedLocation) ||
                    (step === "service" && !selectedService) ||
                    (step === "staff" && !anyProfessional && !selectedStaff) ||
                    (step === "datetime" && (!selectedTime || !(effectiveStaff || selectedStaff)))
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 sm:text-sm"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
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
