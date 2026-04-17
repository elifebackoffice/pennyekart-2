// Temporary debug helper — internal-only. Calls e-Life REST directly using the service key,
// returns lists of tables matching keywords + sample data for specific tables.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const elifeUrl = Deno.env.get("ELIFE_SUPABASE_URL")!;
  const elifeKey = Deno.env.get("ELIFE_SUPABASE_SERVICE_ROLE_KEY")!;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").toLowerCase();
  const probe = (url.searchParams.get("probe") || "").split(",").map((s) => s.trim()).filter(Boolean);

  const specRes = await fetch(`${elifeUrl}/rest/v1/`, {
    headers: { apikey: elifeKey, Authorization: `Bearer ${elifeKey}` },
  });
  const spec = await specRes.json();
  const defs = spec.definitions ?? spec.components?.schemas ?? {};
  const allTables = Object.keys(defs).sort();
  const matched = search
    ? allTables.filter((t) => search.split(/[,\s]+/).filter(Boolean).some((kw) => t.toLowerCase().includes(kw)))
    : allTables;

  const probeData: Record<string, any> = {};
  for (const t of probe) {
    try {
      const r = await fetch(`${elifeUrl}/rest/v1/${t}?limit=3`, {
        headers: { apikey: elifeKey, Authorization: `Bearer ${elifeKey}` },
      });
      probeData[t] = {
        columns: Object.keys(defs[t]?.properties ?? {}),
        sample: r.ok ? await r.json() : await r.text(),
        status: r.status,
      };
    } catch (e) {
      probeData[t] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return new Response(
    JSON.stringify({ matched, total_tables: allTables.length, probe: probeData }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
