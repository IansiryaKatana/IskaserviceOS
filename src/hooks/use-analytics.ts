import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  average: number;
}

export interface ServiceStats {
  service_id: string;
  service_name: string;
  booking_count: number;
  revenue: number;
}

export interface StaffStats {
  staff_id: string;
  staff_name: string;
  booking_count: number;
  revenue: number;
}

export interface LocationStats {
  location_id: string;
  location_name: string;
  booking_count: number;
  revenue: number;
}

export interface TenantAnalytics {
  totalRevenue: number;
  totalBookings: number;
  averageBookingValue: number;
  confirmedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  revenueByPeriod: RevenueData[];
  topServices: ServiceStats[];
  topStaff: StaffStats[];
  locationStats: LocationStats[];
}

// Get period start date
function getPeriodStart(period: "day" | "week" | "month"): string {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(now.setHours(0, 0, 0, 0)).toISOString().split("T")[0];
    case "week":
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart.toISOString().split("T")[0];
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    default:
      return new Date(now.setHours(0, 0, 0, 0)).toISOString().split("T")[0];
  }
}

// Tenant Analytics
export function useTenantAnalytics(tenantId: string | undefined, period: "day" | "week" | "month" = "month") {
  return useQuery({
    queryKey: ["tenant-analytics", tenantId, period],
    queryFn: async (): Promise<TenantAnalytics> => {
      if (!tenantId) throw new Error("Tenant ID required");

      const periodStart = getPeriodStart(period);

      // Get all bookings for the period
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("*, services(name), staff(name), locations(name)")
        .eq("tenant_id", tenantId)
        .gte("booking_date", periodStart)
        .order("booking_date", { ascending: true });

      if (bookingsError) throw bookingsError;

      const bookingsData = bookings || [];

      // Calculate totals
      const confirmedBookings = bookingsData.filter((b) => b.status === "confirmed");
      const cancelledBookings = bookingsData.filter((b) => b.status === "cancelled");
      const pendingBookings = bookingsData.filter((b) => b.status === "pending");

      const totalRevenue = confirmedBookings.reduce(
        (sum, b) => sum + (Number(b.total_price) || 0),
        0
      );
      const totalBookings = bookingsData.length;
      const averageBookingValue =
        confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0;

      // Revenue by period (daily breakdown)
      const revenueByDate = new Map<string, { revenue: number; count: number }>();
      confirmedBookings.forEach((b) => {
        const date = b.booking_date;
        const existing = revenueByDate.get(date) || { revenue: 0, count: 0 };
        revenueByDate.set(date, {
          revenue: existing.revenue + (Number(b.total_price) || 0),
          count: existing.count + 1,
        });
      });

      const revenueByPeriod: RevenueData[] = Array.from(revenueByDate.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          bookings: data.count,
          average: data.count > 0 ? data.revenue / data.count : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top services
      const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
      confirmedBookings.forEach((b) => {
        if (b.service_id && b.services) {
          const existing = serviceMap.get(b.service_id) || {
            name: (b.services as any).name,
            count: 0,
            revenue: 0,
          };
          serviceMap.set(b.service_id, {
            name: existing.name,
            count: existing.count + 1,
            revenue: existing.revenue + (Number(b.total_price) || 0),
          });
        }
      });

      const topServices: ServiceStats[] = Array.from(serviceMap.entries())
        .map(([service_id, data]) => ({
          service_id,
          service_name: data.name,
          booking_count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Top staff
      const staffMap = new Map<string, { name: string; count: number; revenue: number }>();
      confirmedBookings.forEach((b) => {
        if (b.staff_id && b.staff) {
          const existing = staffMap.get(b.staff_id) || {
            name: (b.staff as any).name,
            count: 0,
            revenue: 0,
          };
          staffMap.set(b.staff_id, {
            name: existing.name,
            count: existing.count + 1,
            revenue: existing.revenue + (Number(b.total_price) || 0),
          });
        }
      });

      const topStaff: StaffStats[] = Array.from(staffMap.entries())
        .map(([staff_id, data]) => ({
          staff_id,
          staff_name: data.name,
          booking_count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Location stats
      const locationMap = new Map<string, { name: string; count: number; revenue: number }>();
      confirmedBookings.forEach((b) => {
        if (b.location_id && b.locations) {
          const existing = locationMap.get(b.location_id) || {
            name: (b.locations as any).name,
            count: 0,
            revenue: 0,
          };
          locationMap.set(b.location_id, {
            name: existing.name,
            count: existing.count + 1,
            revenue: existing.revenue + (Number(b.total_price) || 0),
          });
        }
      });

      const locationStats: LocationStats[] = Array.from(locationMap.entries())
        .map(([location_id, data]) => ({
          location_id,
          location_name: data.name,
          booking_count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalRevenue,
        totalBookings,
        averageBookingValue,
        confirmedBookings: confirmedBookings.length,
        cancelledBookings: cancelledBookings.length,
        pendingBookings: pendingBookings.length,
        revenueByPeriod,
        topServices,
        topStaff,
        locationStats,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Platform-level analytics
export function usePlatformAnalytics(period: "day" | "week" | "month" = "month") {
  return useQuery({
    queryKey: ["platform-analytics", period],
    queryFn: async () => {
      const periodStart = getPeriodStart(period);

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("tenant_id, total_price, status, booking_date")
        .gte("booking_date", periodStart);

      if (error) throw error;

      const bookingsData = bookings || [];
      const confirmed = bookingsData.filter((b) => b.status === "confirmed");

      const totalRevenue = confirmed.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
      const totalBookings = bookingsData.length;

      // Revenue by tenant
      const tenantRevenue = new Map<string, number>();
      confirmed.forEach((b) => {
        if (b.tenant_id) {
          const existing = tenantRevenue.get(b.tenant_id) || 0;
          tenantRevenue.set(b.tenant_id, existing + (Number(b.total_price) || 0));
        }
      });

      return {
        totalRevenue,
        totalBookings,
        confirmedBookings: confirmed.length,
        tenantRevenue: Array.from(tenantRevenue.entries()).map(([tenant_id, revenue]) => ({
          tenant_id,
          revenue,
        })),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
