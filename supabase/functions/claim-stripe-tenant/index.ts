// Authenticated user claims the tenant created by Stripe webhook for their checkout session.
// POST { "session_id": "cs_xxx" } -> { "tenant_id": "uuid" }. Adds user_roles (tenant_owner) for this user.

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

  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sessionId = (body.session_id ?? body.sessionId ?? "").toString().trim();
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing session_id" }), {
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
  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("stripe_checkout_tenants")
    .select("tenant_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (fetchErr) {
    console.error("claim-stripe-tenant fetch:", fetchErr);
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!row) {
    return new Response(JSON.stringify({ error: "Session not found or not yet processed. Try again in a moment." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tenantId = (row as { tenant_id: string }).tenant_id;

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
      console.error("claim-stripe-tenant user_roles insert:", insertErr);
      return new Response(JSON.stringify({ error: "Could not assign tenant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ tenant_id: tenantId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
