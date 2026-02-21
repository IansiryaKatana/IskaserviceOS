// Remove tenant data for free trial users past grace period
// Call via: POST with Authorization: Bearer <service_role_key>
// Or schedule via pg_cron / external cron

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const GRACE_DAYS = 7;

    const { data: subs } = await supabase
      .from("tenant_subscriptions")
      .select("id, tenant_id, trial_ends_at, plan_type")
      .eq("plan_type", "free")
      .not("trial_ends_at", "is", null);

    if (!subs?.length) {
      return new Response(
        JSON.stringify({ removed: 0, message: "No trial subscriptions to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const now = new Date();
    const toRemove: string[] = [];

    for (const sub of subs) {
      const trialEnd = new Date(sub.trial_ends_at);
      const graceDeadline = new Date(trialEnd);
      graceDeadline.setDate(graceDeadline.getDate() + GRACE_DAYS);
      if (now > graceDeadline) {
        toRemove.push(sub.tenant_id);
      }
    }

    let removed = 0;
    for (const tenantId of toRemove) {
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
      if (!error) removed++;
    }

    return new Response(
      JSON.stringify({ removed, tenantIds: toRemove }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
