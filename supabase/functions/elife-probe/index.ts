import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("ELIFE_SUPABASE_URL")!;
    const key = Deno.env.get("ELIFE_SUPABASE_SERVICE_ROLE_KEY")!;
    const elife = createClient(url, key);

    const out: any = {};
    const tables = [
      "pennyekart_agents",
      "members",
      "program_registrations",
      "old_payments",
      "whatsapp_bot_commands",
      "agents",
    ];
    for (const t of tables) {
      const { data, error, count } = await elife.from(t).select("*", { count: "exact" }).limit(2);
      out[t] = error ? { error: error.message } : { count, sample: data };
    }

    // Search for the mobile across each table & common cols
    const mobile = "9497589094";
    const variants = [mobile, `91${mobile}`, `+91${mobile}`, `0${mobile}`];
    for (const t of ["pennyekart_agents", "members", "program_registrations", "old_payments"]) {
      const cols = ["mobile", "mobile_number", "phone", "whatsapp_number", "contact_number", "contact", "primary_mobile"];
      const orParts: string[] = [];
      for (const c of cols) for (const v of variants) orParts.push(`${c}.eq.${v}`);
      const { data, error } = await elife.from(t).select("*").or(orParts.join(",")).limit(5);
      out[`search_${t}`] = error ? { error: error.message } : { hits: data?.length ?? 0, rows: data };
    }

    return new Response(JSON.stringify(out, null, 2), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
