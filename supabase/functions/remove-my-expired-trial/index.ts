// Called by authenticated user when their trial is past grace period.
// Removes their tenant (and subscription) so they are redirected to Pricing.
// verify_jwt = true

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRACE_DAYS = 3;

Deno.serve(async (req) => {
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", removed: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server not configured", removed: false }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized", removed: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("role", "tenant_owner")
      .limit(1)
      .maybeSingle();
    const tenantId = (roleRow as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ removed: false, message: "No tenant" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub } = await serviceClient
      .from("tenant_subscriptions")
      .select("plan_type, trial_ends_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!sub || (sub as { plan_type?: string }).plan_type !== "free") {
      return new Response(JSON.stringify({ removed: false, message: "Not a free trial tenant" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const trialEndsAt = (sub as { trial_ends_at?: string }).trial_ends_at;
    if (!trialEndsAt) {
      return new Response(JSON.stringify({ removed: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const trialEnd = new Date(trialEndsAt);
    const graceDeadline = new Date(trialEnd);
    graceDeadline.setDate(graceDeadline.getDate() + GRACE_DAYS);
    if (new Date() <= graceDeadline) {
      return new Response(JSON.stringify({ removed: false, message: "Still in grace period" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await serviceClient.from("tenant_subscriptions").delete().eq("tenant_id", tenantId);
    const { error: delErr } = await serviceClient.from("tenants").delete().eq("id", tenantId);
    if (delErr) {
      console.error("remove-my-expired-trial delete:", delErr);
      return new Response(JSON.stringify({ error: "Could not remove tenant", removed: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ removed: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remove-my-expired-trial error:", e);
    return new Response(JSON.stringify({ error: String(e), removed: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
