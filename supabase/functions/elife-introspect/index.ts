import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const debugToken = url.searchParams.get("debug_token");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const isDebug = debugToken && serviceKey && debugToken === serviceKey.slice(-16);

    if (!isDebug) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, supabaseAnon, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("is_super_admin, role_id")
        .eq("user_id", claimsData.claims.sub)
        .maybeSingle();

      if (!profile?.is_super_admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Connect to e-Life
    const elifeUrl = Deno.env.get("ELIFE_SUPABASE_URL");
    const elifeKey = Deno.env.get("ELIFE_SUPABASE_SERVICE_ROLE_KEY");
    if (!elifeUrl || !elifeKey) {
      return new Response(JSON.stringify({ error: "e-Life credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use REST introspection — list public tables via PostgREST OpenAPI spec
    const specRes = await fetch(`${elifeUrl}/rest/v1/`, {
      headers: { apikey: elifeKey, Authorization: `Bearer ${elifeKey}` },
    });

    if (!specRes.ok) {
      const text = await specRes.text();
      return new Response(JSON.stringify({ error: "Failed to reach e-Life", details: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spec = await specRes.json();
    const defs = spec.definitions ?? spec.components?.schemas ?? {};
    const tables = Object.keys(defs).sort();

    // Optional: probe specific tables for sample data + columns
    const url = new URL(req.url);
    const probe = url.searchParams.get("probe");
    let probeData: Record<string, any> = {};
    if (probe) {
      const targets = probe.split(",").map((s) => s.trim()).filter(Boolean);
      for (const t of targets) {
        try {
          const r = await fetch(`${elifeUrl}/rest/v1/${t}?limit=3`, {
            headers: { apikey: elifeKey, Authorization: `Bearer ${elifeKey}` },
          });
          const rows = r.ok ? await r.json() : null;
          probeData[t] = {
            columns: Object.keys(defs[t]?.properties ?? {}),
            sample: rows,
            status: r.status,
          };
        } catch (e) {
          probeData[t] = { error: e instanceof Error ? e.message : String(e) };
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, tables, url: elifeUrl, probe: probeData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("elife-introspect error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
