import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

async function getStripeSecretKey(tenantId: string | null | undefined): Promise<string> {
  if (tenantId) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const supabase = createClient(url, key);
      const { data: row } = await supabase
        .from("site_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "stripe_secret_key")
        .maybeSingle();
      if (row?.value) return row.value;
    }
  }
  const env = Deno.env.get("STRIPE_SECRET_KEY");
  if (env) return env;
  throw new Error(tenantId ? "Tenant Stripe is not configured" : "STRIPE_SECRET_KEY must be set");
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
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown> ?? {};
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Missing request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const plan = (body.plan ?? "").toString().toLowerCase();
    const emailRaw = body.customer_email ?? body.customerEmail;
    const customerEmail = typeof emailRaw === "string" ? emailRaw.trim() : null;
    let amount = Number(body.amount ?? 0);
    const currency = (body.currency ?? "usd").toString().toLowerCase();
    let tenantId = body.tenant_id ?? null;

    if (plan === "starter" || plan === "lifetime") {
      amount = plan === "lifetime" ? 500 : 45;
      tenantId = null;
      if (!customerEmail) {
        return new Response(JSON.stringify({ error: "Email required for plan payment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let stripeSecret: string;
    try {
      stripeSecret = await getStripeSecretKey(tenantId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe not configured";
      return new Response(JSON.stringify({ error: msg }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(amount * 100);
    const params: Record<string, string> = {
      amount: String(amountCents),
      currency: currency.slice(0, 3),
      "automatic_payment_methods[enabled]": "true",
    };
    if (plan && customerEmail) {
      params["metadata[plan]"] = plan;
      params["metadata[customer_email]"] = customerEmail;
    }
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${stripeSecret}`,
      },
      body: new URLSearchParams(params),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Stripe create payment_intent failed:", res.status, err);
      return new Response(JSON.stringify({ error: "Failed to create payment" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const clientSecret = data.client_secret;
    if (!clientSecret) {
      return new Response(JSON.stringify({ error: "No client secret from Stripe" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const out: { clientSecret: string; paymentIntentId?: string } = { clientSecret };
    if (plan && data.id) out.paymentIntentId = data.id;

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-stripe-payment-intent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
