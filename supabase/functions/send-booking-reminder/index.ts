// Send "Reminder: your appointment is tomorrow" for bookings in the next 24 hours.
// Invoke via cron (e.g. daily). Optional POST body: { hours_ahead?: 24 } to override window.
// Uses RESEND_API_KEY and RESEND_FROM_EMAIL when set.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !key) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, key);

    let hoursAhead = 24;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const parsed = (body as { hours_ahead?: number }).hours_ahead;
      if (typeof parsed === "number" && parsed >= 0) hoursAhead = parsed;
    }

    const now = new Date();
    const start = new Date(now.getTime());
    const end = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    // Fetch bookings in the window: booking_date between start and end, and (date+time) in window
    const { data: allInRange, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, tenant_id, customer_email, customer_name, booking_date, booking_time, service_id, staff_id, location_id")
      .gte("booking_date", startDate)
      .lte("booking_date", endDate)
      .in("status", ["confirmed", "pending"]);

    if (fetchErr) {
      console.error("send-booking-reminder fetch:", fetchErr);
      return new Response(JSON.stringify({ error: "Fetch failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toSend: { booking: Record<string, unknown>; tenantName: string }[] = [];
    for (const b of allInRange || []) {
      const booking = b as {
        id: string;
        tenant_id: string | null;
        customer_email: string | null;
        customer_name: string | null;
        booking_date: string;
        booking_time: string;
        service_id: string | null;
        staff_id: string | null;
        location_id: string | null;
      };
      if (!booking.customer_email) continue;
      const appointmentAt = new Date(`${booking.booking_date}T${booking.booking_time}`);
      if (appointmentAt.getTime() < start.getTime() || appointmentAt.getTime() > end.getTime()) continue;

      const { data: tenantRow } = await supabase.from("tenants").select("name").eq("id", booking.tenant_id).single();
      const tenantName = (tenantRow as { name?: string } | null)?.name || "Our Business";
      let serviceName: string | null = null;
      let staffName: string | null = null;
      let locationName: string | null = null;
      if (booking.service_id) {
        const { data: s } = await supabase.from("services").select("name").eq("id", booking.service_id).single();
        serviceName = (s as { name?: string } | null)?.name ?? null;
      }
      if (booking.staff_id) {
        const { data: st } = await supabase.from("staff").select("name").eq("id", booking.staff_id).single();
        staffName = (st as { name?: string } | null)?.name ?? null;
      }
      if (booking.location_id) {
        const { data: loc } = await supabase.from("locations").select("name").eq("id", booking.location_id).single();
        locationName = (loc as { name?: string } | null)?.name ?? null;
      }

      const bookingDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      toSend.push({
        booking: {
          customer_email: booking.customer_email,
          customer_name: booking.customer_name,
          booking_date: bookingDate,
          booking_time: booking.booking_time,
          service_name: serviceName,
          staff_name: staffName,
          location_name: locationName,
        },
        tenantName,
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "bookings@resend.dev";
    let sent = 0;
    for (const { booking, tenantName } of toSend) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Reminder: Your appointment</h2>
          <p>Hi ${booking.customer_name ?? "there"},</p>
          <p>This is a reminder that you have an upcoming appointment at <strong>${tenantName}</strong>.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 12px; margin: 16px 0;">
            ${booking.service_name ? `<p style="margin: 4px 0;"><strong>Service:</strong> ${booking.service_name}</p>` : ""}
            ${booking.staff_name ? `<p style="margin: 4px 0;"><strong>With:</strong> ${booking.staff_name}</p>` : ""}
            ${booking.location_name ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${booking.location_name}</p>` : ""}
            <p style="margin: 4px 0;"><strong>Date:</strong> ${booking.booking_date}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${formatTime(booking.booking_time as string)}</p>
          </div>
          <p style="color: #666; font-size: 14px;">We look forward to seeing you!</p>
          <p style="color: #999; font-size: 12px;">— ${tenantName}</p>
        </div>
      `;
      const to = String(booking.customer_email);
      const subject = `Reminder: Your appointment - ${tenantName}`;

      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({ from: fromEmail, to: [to], subject, html }),
        });
        if (res.ok) sent++;
        else console.warn("Resend reminder failed for", to, await res.text());
      } else {
        console.log(`📧 Reminder (no RESEND_API_KEY): To: ${to}, Subject: ${subject}`);
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: toSend.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-booking-reminder error:", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
