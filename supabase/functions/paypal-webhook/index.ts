// PayPal webhook: PAYMENT.CAPTURE.COMPLETED -> create tenant + subscription, store in paypal_tenant_claims.
// Set PAYPAL_WEBHOOK_ID in Supabase secrets (optional; for future signature verification).
// Return URL for PayPal payment links: https://<your-app>/onboarding?plan=starter or ?plan=lifetime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo",
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

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: { event_type?: string; resource?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resource = event.resource as Record<string, unknown> | undefined;
  if (!resource?.id) {
    return new Response(JSON.stringify({ error: "Missing resource.id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const captureId = String(resource.id);
  const amountObj = resource.amount as { value?: string; currency_code?: string } | undefined;
  const amountValue = amountObj?.value ? parseFloat(amountObj.value) : 0;
  const planType = amountValue >= 500 ? "lifetime" : "starter";

  let customerEmail: string | null = null;
  const payer = resource.payer as { email_address?: string } | undefined;
  if (payer?.email_address) customerEmail = String(payer.email_address).trim().toLowerCase();

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: existing } = await supabase
    .from("paypal_tenant_claims")
    .select("tenant_id")
    .eq("paypal_capture_id", captureId)
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ received: true, tenant_id: (existing as { tenant_id: string }).tenant_id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const slugBase = "biz-paypal-" + captureId.replace(/\W/g, "").slice(0, 16);
  let slug = slugBase;
  for (let i = 0; i < 10; i++) {
    const { data: conflict } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!conflict) break;
    slug = `${slugBase}-${i}`;
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
    console.error("paypal-webhook tenant insert:", tenantErr);
    return new Response(JSON.stringify({ error: "Failed to create tenant" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tenantId = (tenant as { id: string }).id;

  await supabase.from("tenant_subscriptions").insert({
    tenant_id: tenantId,
    plan: planType,
    plan_type: planType,
    status: "active",
  });
  await supabase.from("tenant_deployment_config").insert({
    tenant_id: tenantId,
    deployment_type: "hosted",
  });

  await supabase.from("paypal_tenant_claims").insert({
    paypal_capture_id: captureId,
    tenant_id: tenantId,
    customer_email: customerEmail,
    plan_type: planType,
  });

  return new Response(JSON.stringify({ received: true, tenant_id: tenantId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
