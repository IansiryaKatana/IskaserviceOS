// Stripe webhook: checkout.session.completed and payment_intent.succeeded -> create tenant + subscription, store in stripe_checkout_tenants.
// Set STRIPE_WEBHOOK_SECRET in Supabase Dashboard (Secrets). For Payment Links use session_id: /onboarding?plan=starter&session_id={CHECKOUT_SESSION_ID}
// For embedded PaymentIntent flow, redirect to /onboarding?plan=starter&session_id=pi_xxx (payment intent id).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function ensureTenantFromStripeCheckout(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  customerEmail: string | null,
  planType: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
) {
  const { data: existing } = await supabase
    .from("stripe_checkout_tenants")
    .select("tenant_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (existing) {
    return (existing as { tenant_id: string }).tenant_id;
  }

  const baseSlug = "biz-" + sessionId.replace(/\W/g, "").slice(0, 22);
  let slug = baseSlug;
  let attempts = 0;
  while (attempts < 10) {
    const { data: conflict } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!conflict) break;
    slug = `${baseSlug}-${++attempts}`;
  }
  const name = customerEmail ? customerEmail.split("@")[0] + "'s Business" : "My Business";

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      name,
      slug,
      business_type: "salon",
      deployment_type: "hosted",
      status: "active",
      subscription_plan: planType,
      onboarding_status: "pending",
    })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    throw new Error(tenantErr?.message ?? "Failed to create tenant");
  }

  const tenantId = (tenant as { id: string }).id;

  const { error: subErr } = await supabase.from("tenant_subscriptions").insert({
    tenant_id: tenantId,
    plan: planType,
    plan_type: planType,
    status: "active",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
  });
  if (subErr) {
    await supabase.from("tenants").delete().eq("id", tenantId);
    throw new Error(subErr.message);
  }

  await supabase.from("tenant_deployment_config").insert({
    tenant_id: tenantId,
    deployment_type: "hosted",
  });

  const { error: linkErr } = await supabase.from("stripe_checkout_tenants").insert({
    stripe_session_id: sessionId,
    tenant_id: tenantId,
    customer_email: customerEmail,
    plan_type: planType,
  });
  if (linkErr) {
    console.error("stripe_checkout_tenants insert:", linkErr);
  }

  return tenantId;
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

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2024-11-20.acacia", httpClient: Stripe.createFetchHttpClient() });
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("Stripe webhook signature error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const meta = (pi.metadata ?? {}) as Record<string, string>;
    const planType = (meta.plan ?? "").toLowerCase();
    const customerEmail = (meta.customer_email ?? "").trim() || null;
    if (planType !== "starter" && planType !== "lifetime") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const tenantId = await ensureTenantFromStripeCheckout(
        supabase,
        pi.id,
        customerEmail,
        planType,
        typeof pi.customer === "string" ? pi.customer : null,
        null
      );
      return new Response(JSON.stringify({ received: true, tenant_id: tenantId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("payment_intent.succeeded handler:", e);
      return new Response(JSON.stringify({ error: "Failed to create tenant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  const customerEmail = typeof session.customer_email === "string" ? session.customer_email : session.customer_details?.email ?? null;
  const amountTotal = session.amount_total ?? 0;

  const metadata = session.metadata as Record<string, string> | null;
  let planType = (metadata?.plan_type ?? "").toLowerCase();
  if (planType !== "starter" && planType !== "lifetime") {
    planType = amountTotal >= 50000 ? "lifetime" : "starter";
  }

  try {
    const tenantId = await ensureTenantFromStripeCheckout(
      supabase,
      sessionId,
      customerEmail,
      planType,
      session.customer as string ?? null,
      (session.subscription as string) ?? null
    );
    return new Response(JSON.stringify({ received: true, tenant_id: tenantId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("checkout.session.completed handler:", e);
    return new Response(JSON.stringify({ error: "Failed to create tenant" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
