import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const tables = ["portal_catalog_resources", "portal_prebook_resources", "portal_art_resources"];
const checkedAt = new Date().toISOString();
const totals = { available: 0, warning: 0, unavailable: 0 };

async function check(url) {
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8_000) });
    if ([403, 405].includes(response.status)) response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "follow", signal: AbortSignal.timeout(8_000) });
    if (response.status >= 200 && response.status < 400) return { status: "available", httpStatus: response.status };
    if ([401, 403, 405, 429].includes(response.status)) return { status: "warning", httpStatus: response.status };
    return { status: "unavailable", httpStatus: response.status };
  } catch { return { status: "unavailable", httpStatus: null }; }
}

for (const table of tables) {
  const { data, error } = await supabase.from(table).select("id,external_url").eq("source_type", "external_url");
  if (error) throw error;
  for (let index = 0; index < data.length; index += 6) {
    const batch = data.slice(index, index + 6);
    const results = await Promise.all(batch.map(async (row) => ({ row, result: await check(row.external_url) })));
    for (const { row, result } of results) {
      totals[result.status] += 1;
      const { error: updateError } = await supabase.from(table).update({ link_status: result.status, link_checked_at: checkedAt, source_note: `Automated check: ${result.httpStatus ?? "connection failed"}` }).eq("id", row.id);
      if (updateError) throw updateError;
    }
  }
}

console.log(JSON.stringify({ checkedAt, ...totals, total: totals.available + totals.warning + totals.unavailable }));
