// Send "Your appointment was cancelled" email when a booking is cancelled.
// POST body: { booking: { customer_email, customer_name, booking_date, booking_time, service_name? }, tenant: { name } }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  try {
    const body = await req.json().catch(() => ({}));
    const { booking, tenant } = body as { booking?: Record<string, unknown>; tenant?: Record<string, unknown> };

    if (!booking?.customer_email) {
      return new Response(
        JSON.stringify({ success: true, message: "No email provided, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantName = (tenant?.name as string) || "Our Business";
    const bookingDate = booking.booking_date
      ? new Date(String(booking.booking_date) + "T00:00:00").toLocaleDateString("en", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";
    const formatTime = (t: unknown) => {
      if (!t || typeof t !== "string") return "—";
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const hr = h % 12 || 12;
      return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Appointment Cancelled</h2>
        <p>Hi ${booking.customer_name ?? "there"},</p>
        <p>Your appointment at <strong>${tenantName}</strong> has been cancelled.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 12px; margin: 16px 0;">
          ${booking.service_name ? `<p style="margin: 4px 0;"><strong>Service:</strong> ${booking.service_name}</p>` : ""}
          <p style="margin: 4px 0;"><strong>Date:</strong> ${bookingDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${formatTime(booking.booking_time)}</p>
        </div>
        <p style="color: #666; font-size: 14px;">If you did not request this cancellation or wish to rebook, please contact ${tenantName}.</p>
        <p style="color: #999; font-size: 12px;">— ${tenantName}</p>
      </div>
    `;

    const to = String(booking.customer_email);
    const subject = `Appointment Cancelled - ${tenantName}`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "bookings@resend.dev",
          to: [to],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Resend error:", err);
        return new Response(JSON.stringify({ error: "Failed to send email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log(`📧 Cancellation email (no RESEND_API_KEY): To: ${to}, Subject: ${subject}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Cancellation email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-booking-cancellation error:", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
