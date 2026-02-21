import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const MPESA_SANDBOX = "https://sandbox.safaricom.co.ke";
const MPESA_LIVE = "https://api.safaricom.co.ke";

async function getMpesaCredentials(tenantId: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server not configured");
  const supabase = createClient(url, key);
  const { data: rows } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("tenant_id", tenantId)
    .in("key", ["mpesa_consumer_key", "mpesa_consumer_secret", "mpesa_shortcode", "mpesa_passkey"]);
  const get = (k: string) => rows?.find((r: { key: string }) => r.key === k)?.value;
  const consumerKey = get("mpesa_consumer_key");
  const consumerSecret = get("mpesa_consumer_secret");
  const shortcode = get("mpesa_shortcode");
  const passkey = get("mpesa_passkey");
  if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
    throw new Error("Tenant M-Pesa is not fully configured (consumer key, secret, shortcode, passkey)");
  }
  return { consumerKey, consumerSecret, shortcode, passkey };
}

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
    const body = await req.json();
    const tenantId = body?.tenant_id;
    const phoneRaw = (body?.phone ?? "").toString().replace(/\D/g, "");
    const amount = Number(body?.amount ?? 0);

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Missing tenant_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (phoneRaw.length < 9) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { consumerKey, consumerSecret, shortcode, passkey } = await getMpesaCredentials(tenantId);
    const baseUrl = Deno.env.get("MPESA_ENV") === "production" ? MPESA_LIVE : MPESA_SANDBOX;

    const authRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
      },
    });
    if (!authRes.ok) {
      const t = await authRes.text();
      console.error("M-Pesa auth failed:", authRes.status, t);
      return new Response(JSON.stringify({ error: "M-Pesa auth failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authData = await authRes.json();
    const accessToken = authData.access_token;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No M-Pesa access token" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = phoneRaw.startsWith("254") ? phoneRaw : `254${phoneRaw}`;
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: Deno.env.get("MPESA_CALLBACK_URL") || "https://example.com/callback",
      AccountReference: "Booking",
      TransactionDesc: "Booking payment",
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(stkBody),
    });

    const stkData = await stkRes.json().catch(() => ({}));
    if (!stkRes.ok) {
      console.error("M-Pesa STK push failed:", stkRes.status, stkData);
      return new Response(
        JSON.stringify({
          error: stkData.errorMessage || stkData.error || "STK push failed",
          success: false,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutRequestID = stkData.CheckoutRequestID;
    return new Response(
      JSON.stringify({
        success: true,
        checkoutRequestID: checkoutRequestID || null,
        message: "Check your phone to enter M-Pesa PIN",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("mpesa-stk-push error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("not configured") || msg.includes("not fully") ? 503 : 500;
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
