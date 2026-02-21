import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const PAYPAL_API_BASE =
  Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPayPalCredentials(tenantId: string | null | undefined): Promise<{ clientId: string; clientSecret: string }> {
  if (tenantId) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const supabase = createClient(url, key);
      const { data: rows } = await supabase
        .from("site_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", ["paypal_client_id", "paypal_client_secret"]);
      const clientId = rows?.find((r: { key: string }) => r.key === "paypal_client_id")?.value;
      const clientSecret = rows?.find((r: { key: string }) => r.key === "paypal_client_secret")?.value;
      if (clientId && clientSecret) return { clientId, clientSecret };
    }
  }
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (clientId && clientSecret) return { clientId, clientSecret };
  throw new Error(tenantId ? "Tenant PayPal is not configured" : "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set");
}

async function getAccessToken(tenantId: string | null | undefined): Promise<string> {
  const { clientId, clientSecret } = await getPayPalCredentials(tenantId);
  const auth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.access_token;
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
    const amount = Number(body?.amount ?? 0);
    const currency = (body?.currency ?? "USD") as string;
    const tenantId = body?.tenant_id ?? null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const value = amount.toFixed(2);
    let token: string;
    try {
      token = await getAccessToken(tenantId);
    } catch (credErr) {
      const msg = credErr instanceof Error ? credErr.message : "PayPal not configured";
      const isNotConfigured = msg.includes("not configured") || msg.includes("must be set");
      return new Response(
        JSON.stringify({ error: msg }),
        {
          status: isNotConfigured ? 503 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const createRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        application_context: {
          shipping_preference: "NO_SHIPPING",
        },
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value,
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("PayPal create order failed:", createRes.status, err);
      return new Response(
        JSON.stringify({ error: "Failed to create PayPal order" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = await createRes.json();
    const orderId = order.id;
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "No order ID from PayPal" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ orderID: orderId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-paypal-order error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
