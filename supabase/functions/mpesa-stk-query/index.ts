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
  // Preflight: return 200 so gateways/proxies treat as OK (CORS)
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
    const checkoutRequestID = (body?.checkout_request_id ?? "").toString().trim();

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Missing tenant_id", paid: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!checkoutRequestID) {
      return new Response(JSON.stringify({ error: "Missing checkout_request_id", paid: false }), {
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
      return new Response(JSON.stringify({ error: "M-Pesa auth failed", paid: false }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authData = await authRes.json();
    const accessToken = authData.access_token;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No M-Pesa access token", paid: false }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const queryBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID,
    };

    // Daraja STK Push Query: check if customer completed the payment
    const queryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(queryBody),
    });

    const queryData = await queryRes.json().catch(() => ({}));
    if (!queryRes.ok) {
      console.error("M-Pesa STK query failed:", queryRes.status, queryData);
      return new Response(
        JSON.stringify({
          error: (queryData as { errorMessage?: string }).errorMessage || "Could not check payment status",
          paid: false,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ResultCode / ResponseCode 0 = success (payment completed). 1032 = cancelled, 1 = insufficient funds, etc.
    const q = queryData as {
      ResultCode?: number | string;
      ResultDesc?: string;
      ResponseCode?: number | string;
      ResponseDescription?: string;
      Body?: { stkCallback?: { ResultCode?: number | string; ResultDesc?: string } };
    };
    const raw = q.ResultCode ?? q.ResponseCode ?? q.Body?.stkCallback?.ResultCode;
    const resultCode = raw === undefined || raw === null ? undefined : (typeof raw === "string" ? parseInt(raw, 10) : raw);
    const paid = resultCode === 0;
    const resultDesc = q.ResultDesc ?? q.ResponseDescription ?? q.Body?.stkCallback?.ResultDesc ?? "";

    return new Response(
      JSON.stringify({
        paid,
        resultCode: resultCode ?? null,
        resultDesc: resultDesc || (paid ? "Payment successful" : "Payment not completed"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("mpesa-stk-query error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("not configured") || msg.includes("not fully") ? 503 : 500;
    return new Response(JSON.stringify({ error: msg, paid: false }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
