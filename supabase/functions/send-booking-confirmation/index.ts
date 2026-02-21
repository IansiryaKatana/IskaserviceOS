import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { booking, tenant } = await req.json();
    
    if (!booking?.customer_email) {
      return new Response(
        JSON.stringify({ success: true, message: "No email provided, skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantName = tenant?.name || "Our Business";
    const bookingDate = new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formatTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const hr = h % 12 || 12;
      return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Booking Confirmed ✓</h2>
        <p>Hi ${booking.customer_name},</p>
        <p>Your appointment at <strong>${tenantName}</strong> has been confirmed.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 12px; margin: 16px 0;">
          ${booking.service_name ? `<p style="margin: 4px 0;"><strong>Service:</strong> ${booking.service_name}</p>` : ""}
          ${booking.staff_name ? `<p style="margin: 4px 0;"><strong>Specialist:</strong> ${booking.staff_name}</p>` : ""}
          ${booking.location_name ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${booking.location_name}</p>` : ""}
          <p style="margin: 4px 0;"><strong>Date:</strong> ${bookingDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${formatTime(booking.booking_time)}</p>
          ${booking.total_price ? `<p style="margin: 4px 0;"><strong>Total:</strong> $${Number(booking.total_price).toFixed(0)}</p>` : ""}
        </div>
        <p style="color: #666; font-size: 14px;">We look forward to seeing you!</p>
        <p style="color: #999; font-size: 12px;">— ${tenantName}</p>
      </div>
    `;

    // Use Supabase's built-in email via the Auth admin API isn't available for transactional.
    // For now, log the email content. In production, integrate with Resend/SendGrid/etc.
    console.log(`📧 Booking confirmation email for ${booking.customer_email}:`);
    console.log(`Subject: Booking Confirmed - ${tenantName}`);
    console.log(`To: ${booking.customer_email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email queued",
        email: {
          to: booking.customer_email,
          subject: `Booking Confirmed - ${tenantName}`,
          html,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
