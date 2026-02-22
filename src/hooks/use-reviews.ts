import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as defaultSupabase } from "@/integrations/supabase/client";
import { useSupabase } from "@/integrations/supabase/supabase-context";

export interface Review {
  id: string;
  tenant_id: string;
  client_id: string | null;
  booking_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  is_verified: boolean;
  is_approved: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface TenantRatingStats {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
}

export function useTenantReviews(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-reviews", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_approved", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!tenantId,
  });
}

export function useTenantRatingStats(tenantId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["tenant-rating-stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase.rpc("get_tenant_rating_stats", {
        tenant_uuid: tenantId,
      });
      if (error) throw error;
      return (data?.[0] as TenantRatingStats) || null;
    },
    enabled: !!tenantId,
  });
}

export function useCreateReview() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      tenant_id: string;
      rating: number;
      reviewer_name: string;
      reviewer_email?: string | null;
      title?: string | null;
      comment?: string | null;
      client_id?: string | null;
      booking_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          ...review,
          is_verified: !!review.booking_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tenant-reviews", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["tenant-rating-stats", data.tenant_id] });
    },
  });
}

export function usePlatformReviews() {
  return useQuery({
    queryKey: ["platform-reviews"],
    queryFn: async () => {
      const { data, error } = await defaultSupabase
        .from("reviews")
        .select("*, tenants(name, slug, business_type)")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });
}
