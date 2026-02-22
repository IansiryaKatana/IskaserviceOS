// Authenticated user claims a tenant created by PayPal webhook (match by current user email).
// POST {} or { "email": "optional override" } -> { "tenant_id": "uuid" }. Adds user_roles (tenant_owner).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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
  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const emailToUse = (user.email ?? "").trim().toLowerCase();
  if (!emailToUse) {
    return new Response(JSON.stringify({ error: "No email on account; cannot match PayPal payment" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("paypal_tenant_claims")
    .select("id, tenant_id")
    .eq("customer_email", emailToUse)
    .is("claimed_by_user_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error("claim-paypal-tenant fetch:", fetchErr);
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!row) {
    return new Response(JSON.stringify({ error: "No unclaimed PayPal payment found for your email. Complete payment first or try again in a moment." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tenantId = (row as { tenant_id: string }).tenant_id;
  const rowId = (row as { id: string }).id;

  const { error: updateErr } = await supabase
    .from("paypal_tenant_claims")
    .update({ claimed_by_user_id: user.id })
    .eq("id", rowId);
  if (updateErr) {
    console.error("claim-paypal-tenant update:", updateErr);
    return new Response(JSON.stringify({ error: "Could not claim tenant" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .eq("role", "tenant_owner")
    .maybeSingle();
  if (!existingRole) {
    const { error: insertErr } = await supabase.from("user_roles").insert({
      user_id: user.id,
      role: "tenant_owner",
      tenant_id: tenantId,
    });
    if (insertErr) {
      console.error("claim-paypal-tenant user_roles insert:", insertErr);
    }
  }

  return new Response(JSON.stringify({ tenant_id: tenantId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
