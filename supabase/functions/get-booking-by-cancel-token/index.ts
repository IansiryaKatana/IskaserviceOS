import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !key) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, key);

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, booking_date, booking_time, customer_name, status, tenant_id, service_id, staff_id, location_id")
      .eq("cancel_token", token)
      .maybeSingle();

    if (error) {
      console.error("get-booking-by-cancel-token:", error);
      return new Response(JSON.stringify({ error: "Lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!booking || booking.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Booking not found or already cancelled" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = booking.tenant_id;
    const { data: tenant } = tenantId
      ? await supabase.from("tenants").select("name, slug").eq("id", tenantId).single()
      : { data: null };
    const { data: service } = booking.service_id
      ? await supabase.from("services").select("name").eq("id", booking.service_id).single()
      : { data: null };
    const { data: staff } = booking.staff_id
      ? await supabase.from("staff").select("name").eq("id", booking.staff_id).single()
      : { data: null };
    const { data: location } = booking.location_id
      ? await supabase.from("locations").select("name").eq("id", booking.location_id).single()
      : { data: null };

    // Cancel-by-hours: cancellation allowed only if at least X hours before appointment
    let cancelAllowed = true;
    let cancelMessage: string | null = null;
    if (tenantId && booking.booking_date && booking.booking_time) {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "cancel_by_hours")
        .maybeSingle();
      const cancelByHours = Math.max(0, parseInt((setting as { value?: string } | null)?.value ?? "24", 10) || 24);
      const appointmentAt = new Date(`${booking.booking_date}T${booking.booking_time}`);
      const cutoff = new Date(appointmentAt.getTime() - cancelByHours * 60 * 60 * 1000);
      if (Date.now() > cutoff.getTime()) {
        cancelAllowed = false;
        cancelMessage = `Cancellation is only allowed at least ${cancelByHours} hour${cancelByHours === 1 ? "" : "s"} before your appointment. Please contact the business to change your booking.`;
      }
    }

    return new Response(
      JSON.stringify({
        booking: {
          id: booking.id,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          customer_name: booking.customer_name,
          status: booking.status,
          service_name: (service as { name?: string } | null)?.name ?? null,
          staff_name: (staff as { name?: string } | null)?.name ?? null,
          location_name: (location as { name?: string } | null)?.name ?? null,
        },
        tenant_name: (tenant as { name?: string } | null)?.name ?? null,
        tenant_slug: (tenant as { slug?: string } | null)?.slug ?? null,
        cancel_allowed: cancelAllowed,
        cancel_message: cancelMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-booking-by-cancel-token error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
