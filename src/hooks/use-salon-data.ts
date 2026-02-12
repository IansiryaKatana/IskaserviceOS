import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Default tenant for backward compat
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string;
  image_url: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  is_active: boolean;
  sort_order: number;
  tenant_id: string | null;
  metadata: Json | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  tenant_id: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string | null;
  image_url: string | null;
  specialties: string[] | null;
  is_active: boolean;
  sort_order: number;
  location_id: string | null;
  user_id: string | null;
  tenant_id: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface StaffSchedule {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  tenant_id: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  service_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number | null;
  notes: string | null;
  staff_id: string | null;
  location_id: string | null;
  user_id: string | null;
  tenant_id: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  tenant_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  tag_color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Service Categories
export function useServiceCategories(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["service-categories", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .eq("tenant_id", tid)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ServiceCategory[];
    },
  });
}

// Services
export function useServices(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["services", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .eq("tenant_id", tid)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Service[];
    },
  });
}

export function useAllServices(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["all-services", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tid)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Service[];
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: Omit<Service, "id" | "created_at" | "updated_at">) => {
      const payload = { ...service, tenant_id: service.tenant_id || DEFAULT_TENANT_ID };
      const { data, error } = await supabase.from("services").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["all-services"] });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase.from("services").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["all-services"] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["all-services"] });
    },
  });
}

// Locations
export function useLocations(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["locations", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .eq("tenant_id", tid)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function useAllLocations(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["all-locations", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("tenant_id", tid)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loc: Omit<Location, "id" | "created_at" | "updated_at">) => {
      const payload = { ...loc, tenant_id: loc.tenant_id || DEFAULT_TENANT_ID };
      const { data, error } = await supabase.from("locations").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["all-locations"] });
    },
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Location> & { id: string }) => {
      const { data, error } = await supabase.from("locations").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["all-locations"] });
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["all-locations"] });
    },
  });
}

// Staff
export function useStaff(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["staff", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("is_active", true)
        .eq("tenant_id", tid)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Staff[];
    },
  });
}

export function useAllStaff(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["all-staff", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("tenant_id", tid)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Staff[];
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Omit<Staff, "id" | "created_at" | "updated_at">) => {
      const payload = { ...s, tenant_id: s.tenant_id || DEFAULT_TENANT_ID };
      const { data, error } = await supabase.from("staff").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["all-staff"] });
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      const { data, error } = await supabase.from("staff").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["all-staff"] });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["all-staff"] });
    },
  });
}

// Staff Schedules
export function useStaffSchedules(staffId?: string) {
  return useQuery({
    queryKey: ["staff-schedules", staffId],
    queryFn: async () => {
      let query = supabase.from("staff_schedules").select("*");
      if (staffId) query = query.eq("staff_id", staffId);
      const { data, error } = await query.order("day_of_week", { ascending: true });
      if (error) throw error;
      return data as StaffSchedule[];
    },
    enabled: !!staffId || staffId === undefined,
  });
}

// Bookings
export function useBookings(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["bookings", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", tid)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });
}

export function useBookingsByDate(date?: string, staffId?: string) {
  return useQuery({
    queryKey: ["bookings-by-date", date, staffId],
    queryFn: async () => {
      let query = supabase.from("bookings").select("*").eq("booking_date", date!);
      if (staffId) query = query.eq("staff_id", staffId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!date,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (booking: Omit<Booking, "id" | "created_at" | "updated_at">) => {
      const payload = { ...booking, tenant_id: booking.tenant_id || DEFAULT_TENANT_ID };
      
      // Try to find or create client
      let clientId: string | null = null;
      if (booking.customer_email || booking.customer_phone) {
        try {
          // Check if client exists
          let query = supabase.from("clients").select("id").eq("tenant_id", payload.tenant_id);
          if (booking.customer_email) {
            query = query.eq("email", booking.customer_email);
          } else if (booking.customer_phone) {
            query = query.eq("phone", booking.customer_phone);
          }
          
          const { data: existingClient } = await query.maybeSingle();
          
          if (existingClient) {
            clientId = existingClient.id;
            // Update client stats
            await supabase.rpc("increment_client_bookings", {
              client_id: clientId,
              amount: Number(booking.total_price) || 0,
            }).catch(() => {}); // Silent fail
          } else {
            // Create new client
            const { data: newClient } = await supabase
              .from("clients")
              .insert({
                tenant_id: payload.tenant_id,
                email: booking.customer_email || null,
                phone: booking.customer_phone || null,
                first_name: booking.customer_name.split(" ")[0] || null,
                last_name: booking.customer_name.split(" ").slice(1).join(" ") || null,
                total_bookings: 1,
                total_spent: Number(booking.total_price) || 0,
                last_booking_date: booking.booking_date,
              })
              .select("id")
              .single();
            
            if (newClient) clientId = newClient.id;
          }
        } catch (err) {
          console.error("Error creating/finding client:", err);
          // Continue with booking creation even if client creation fails
        }
      }
      
      // Create booking with client_id
      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...payload, client_id: clientId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-by-date"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Booking> & { id: string }) => {
      const { data, error } = await supabase.from("bookings").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-by-date"] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings-by-date"] });
    },
  });
}

// Service Category mutations
export function useCreateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: Omit<ServiceCategory, "id" | "created_at" | "updated_at">) => {
      const payload = { ...cat, tenant_id: cat.tenant_id || DEFAULT_TENANT_ID };
      const { data, error } = await supabase.from("service_categories").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-categories"] }); },
  });
}

export function useUpdateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceCategory> & { id: string }) => {
      const { data, error } = await supabase.from("service_categories").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-categories"] }); },
  });
}

export function useDeleteServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-categories"] }); },
  });
}

export function useAllServiceCategories(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["all-service-categories", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .eq("tenant_id", tid)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ServiceCategory[];
    },
  });
}

// Staff Schedule mutations
export function useAllStaffSchedules(tenantId?: string) {
  const tid = tenantId || DEFAULT_TENANT_ID;
  return useQuery({
    queryKey: ["all-staff-schedules", tid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("tenant_id", tid)
        .order("staff_id")
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return data as StaffSchedule[];
    },
  });
}

export function useCreateStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: Omit<StaffSchedule, "id" | "created_at">) => {
      const payload = { ...schedule, tenant_id: schedule.tenant_id || DEFAULT_TENANT_ID };
      const { data, error } = await supabase.from("staff_schedules").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      qc.invalidateQueries({ queryKey: ["all-staff-schedules"] });
    },
  });
}

export function useUpdateStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffSchedule> & { id: string }) => {
      const { data, error } = await supabase.from("staff_schedules").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      qc.invalidateQueries({ queryKey: ["all-staff-schedules"] });
    },
  });
}

export function useDeleteStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-schedules"] });
      qc.invalidateQueries({ queryKey: ["all-staff-schedules"] });
    },
  });
}

// Image upload
export async function uploadServiceImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("service-images").upload(fileName, file);
  if (error) throw error;
  const { data } = supabase.storage.from("service-images").getPublicUrl(fileName);
  return data.publicUrl;
}
