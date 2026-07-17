import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { checkExternalLink } from "@/lib/link-health";
import { createPortalAdminClient } from "@/lib/supabase/server";

const sources = ["portal_catalog_resources", "portal_prebook_resources", "portal_art_resources"] as const;
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const results = await Promise.all(sources.map((table) => client.from(table).select("id,link_status,link_checked_at").eq("source_type", "external_url")));
  if (results.some((result) => result.error)) return NextResponse.json({ error: "Unable to read link health." }, { status: 503 });
  const rows = results.flatMap((result) => result.data ?? []);
  return NextResponse.json(summarize(rows));
}

export async function POST(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const queryResults = await Promise.all(sources.map((table) => client.from(table).select("id,external_url").eq("source_type", "external_url")));
  if (queryResults.some((result) => result.error)) return NextResponse.json({ error: "Unable to read external links." }, { status: 503 });
  const jobs = queryResults.flatMap((result, index) => (result.data ?? []).map((row) => ({ table: sources[index], ...row })));
  const checkedAt = new Date().toISOString();
  const checked: Array<{ status: string; httpStatus: number | null }> = [];
  for (let index = 0; index < jobs.length; index += 6) {
    const batch = jobs.slice(index, index + 6);
    const results = await Promise.all(batch.map(async (job) => ({ job, result: await checkExternalLink(job.external_url ?? "") })));
    for (const { job, result } of results) {
      await client.from(job.table).update({ link_status: result.status, link_checked_at: checkedAt, source_note: `Automated check: ${result.httpStatus ?? "connection failed"}` }).eq("id", job.id);
      checked.push(result);
    }
  }
  return NextResponse.json({ ...summarize(checked.map((row) => ({ link_status: row.status, link_checked_at: checkedAt }))), checked: jobs.length });
}

function summarize(rows: Array<{ link_status: string; link_checked_at: string | null }>) {
  return {
    total: rows.length,
    available: rows.filter((row) => row.link_status === "available").length,
    warning: rows.filter((row) => row.link_status === "warning").length,
    unavailable: rows.filter((row) => row.link_status === "unavailable").length,
    unchecked: rows.filter((row) => row.link_status === "unchecked").length,
    lastCheckedAt: rows.map((row) => row.link_checked_at).filter(Boolean).sort().at(-1) ?? null,
  };
}
