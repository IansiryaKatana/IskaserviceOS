// Resolve tenant slug by custom domain. Public (no auth) so visitors on custom domains can load the correct tenant.
// GET ?host=salon.example.com or POST { "host": "salon.example.com" } -> { "slug": "main-street-salon" }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let host = "";
  if (req.method === "GET") {
    const url = new URL(req.url);
    host = (url.searchParams.get("host") ?? "").trim();
  } else {
    try {
      const body = await req.json();
      host = (body?.host ?? "").toString().trim();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!host) {
    return new Response(JSON.stringify({ error: "Missing host" }), {
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

  const { data: row, error } = await supabase
    .from("tenants")
    .select("slug")
    .not("custom_domain", "is", null)
    .ilike("custom_domain", host)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("get-tenant-by-domain:", error);
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const slug = row ? (row as { slug: string }).slug : null;

  if (!slug) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ slug }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
