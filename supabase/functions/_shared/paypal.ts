import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_API_BASE =
  Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const TENANT_KEYS = { paypal_client_id: "paypal_client_id", paypal_client_secret: "paypal_client_secret" };

export async function getPayPalCredentials(tenantId: string | null | undefined): Promise<{ clientId: string; clientSecret: string }> {
  if (tenantId) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const supabase = createClient(url, key);
      const { data: rows } = await supabase
        .from("site_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", [TENANT_KEYS.paypal_client_id, TENANT_KEYS.paypal_client_secret]);
      const clientId = rows?.find((r: { key: string }) => r.key === TENANT_KEYS.paypal_client_id)?.value;
      const clientSecret = rows?.find((r: { key: string }) => r.key === TENANT_KEYS.paypal_client_secret)?.value;
      if (clientId && clientSecret) return { clientId, clientSecret };
    }
  }
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (clientId && clientSecret) return { clientId, clientSecret };
  throw new Error(tenantId ? "Tenant PayPal is not configured" : "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set");
}

export async function getAccessToken(tenantId: string | null | undefined): Promise<string> {
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

export function getPayPalApiBase(): string {
  return PAYPAL_API_BASE;
}
