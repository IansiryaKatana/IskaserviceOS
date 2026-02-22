import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const cancelToken = (body?.cancel_token ?? body?.token ?? "").toString().trim();
    if (!cancelToken) {
      return new Response(JSON.stringify({ error: "Missing cancel_token", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !key) {
      return new Response(JSON.stringify({ error: "Server not configured", success: false }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, key);

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status, tenant_id, booking_date, booking_time")
      .eq("cancel_token", cancelToken)
      .maybeSingle();

    if (fetchErr) {
      console.error("cancel-booking fetch:", fetchErr);
      return new Response(JSON.stringify({ error: "Lookup failed", success: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found", success: false }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (booking.status === "cancelled") {
      return new Response(JSON.stringify({ success: true, message: "Already cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce cancel-by-hours policy
    if (booking.tenant_id && booking.booking_date && booking.booking_time) {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", booking.tenant_id)
        .eq("key", "cancel_by_hours")
        .maybeSingle();
      const cancelByHours = Math.max(0, parseInt((setting as { value?: string } | null)?.value ?? "24", 10) || 24);
      const appointmentAt = new Date(`${booking.booking_date}T${booking.booking_time}`);
      const cutoff = new Date(appointmentAt.getTime() - cancelByHours * 60 * 60 * 1000);
      if (Date.now() > cutoff.getTime()) {
        return new Response(
          JSON.stringify({
            error: `Cancellation is only allowed at least ${cancelByHours} hour${cancelByHours === 1 ? "" : "s"} before your appointment. Please contact the business.`,
            success: false,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", booking.id);

    if (updateErr) {
      console.error("cancel-booking update:", updateErr);
      return new Response(JSON.stringify({ error: "Could not cancel booking", success: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send cancellation email if customer has email
    const { data: fullBooking } = await supabase
      .from("bookings")
      .select("customer_email, customer_name, booking_date, booking_time")
      .eq("id", booking.id)
      .single();
    if (fullBooking?.customer_email && booking.tenant_id) {
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", booking.tenant_id)
        .single();
      const fnUrl = `${supabaseUrl}/functions/v1/send-booking-cancellation`;
      try {
        await fetch(fnUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            booking: fullBooking,
            tenant: tenantRow ? { name: (tenantRow as { name: string }).name } : { name: "Our Business" },
          }),
        });
      } catch (e) {
        console.warn("Cancellation email invoke failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Booking cancelled" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cancel-booking error:", e);
    return new Response(JSON.stringify({ error: "Server error", success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
