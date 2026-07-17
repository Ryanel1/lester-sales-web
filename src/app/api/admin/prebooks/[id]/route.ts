import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { prebookRecord, prebookResourceRows, type PrebookResourceInput } from "@/lib/prebook-publisher";
import { createPortalAdminClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
type Client = NonNullable<ReturnType<typeof createPortalAdminClient>>;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: "Prebook not found." }, { status: 404 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Prebook request is invalid." }, { status: 400 });
  if (typeof body.action === "string") return lifecycleAction(client, id, body.action);
  try {
    const record = prebookRecord(body);
    const resources = prebookResourceRows(Array.isArray(body.resources) ? body.resources as PrebookResourceInput[] : []);
    const { data: existing } = await client.from("portal_prebooks").select("id").eq("id", id).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Prebook not found." }, { status: 404 });
    const { error } = await client.from("portal_prebooks").update(record).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    const resourceIds: string[] = [];
    for (const resource of resources) {
      const { data: saved, error: resourceError } = await client.from("portal_prebook_resources").upsert({ ...resource, prebook_id: id }).select("id").single();
      if (resourceError || !saved) return NextResponse.json({ error: resourceError?.message ?? "Unable to save a resource." }, { status: 409 });
      resourceIds.push(saved.id);
    }
    let stale = client.from("portal_prebook_resources").delete().eq("prebook_id", id);
    if (resourceIds.length) stale = stale.not("id", "in", `(${resourceIds.join(",")})`);
    const { error: staleError } = await stale;
    return staleError ? NextResponse.json({ error: staleError.message }, { status: 409 }) : NextResponse.json({ id, status: record.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prebook is invalid." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (!isId(id) || body?.action !== "duplicate") return NextResponse.json({ error: "Prebook action is invalid." }, { status: 400 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const { data: prebook } = await client.from("portal_prebooks").select("*,portal_prebook_resources(*)").eq("id", id).maybeSingle();
  if (!prebook) return NextResponse.json({ error: "Prebook not found." }, { status: 404 });
  const { portal_prebook_resources: resources, id: _id, created_at: _created, updated_at: _updated, ...copy } = prebook;
  void _id; void _created; void _updated;
  const slug = await availableCopySlug(client, prebook.brand_id, prebook.slug);
  const { data: duplicate, error } = await client.from("portal_prebooks").insert({ ...copy, slug, title: `${prebook.title} copy`, status: "draft", published_at: null, archived_at: null, display_order: prebook.display_order + 1 }).select("id").single();
  if (error || !duplicate) return NextResponse.json({ error: error?.message ?? "Unable to duplicate prebook." }, { status: 409 });
  if (resources?.length) {
    const rows = resources.map(({ id: _resourceId, prebook_id: _parentId, created_at: _resourceCreated, updated_at: _resourceUpdated, ...resource }: Record<string, unknown>) => {
      void _resourceId; void _parentId; void _resourceCreated; void _resourceUpdated;
      return { ...resource, prebook_id: duplicate.id };
    });
    const { error: resourcesError } = await client.from("portal_prebook_resources").insert(rows);
    if (resourcesError) { await client.from("portal_prebooks").delete().eq("id", duplicate.id); return NextResponse.json({ error: resourcesError.message }, { status: 409 }); }
  }
  return NextResponse.json({ id: duplicate.id }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: "Prebook not found." }, { status: 404 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const { data: prebook } = await client.from("portal_prebooks").select("status").eq("id", id).maybeSingle();
  if (!prebook) return NextResponse.json({ error: "Prebook not found." }, { status: 404 });
  if (["published", "scheduled"].includes(prebook.status)) return NextResponse.json({ error: "Archive or unpublish this prebook before permanently deleting it." }, { status: 409 });
  const { error } = await client.from("portal_prebooks").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ deleted: true });
}

async function lifecycleAction(client: Client, id: string, action: string) {
  if (action === "publish") {
    const { data: prebook } = await client.from("portal_prebooks").select("deadline,portal_prebook_resources(kind)").eq("id", id).maybeSingle();
    const kinds = new Set((prebook?.portal_prebook_resources ?? []).map((row: { kind: string }) => row.kind));
    if (!prebook || Date.parse(prebook.deadline) <= Date.now() || !["catalog", "pricing", "workbook"].every((kind) => kinds.has(kind))) return NextResponse.json({ error: "An open prebook needs a future deadline, catalog, price list, and workbook." }, { status: 409 });
    const { error } = await client.from("portal_prebooks").update({ status: "published", published_at: new Date().toISOString(), archived_at: null }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "published" });
  }
  if (action === "unpublish" || action === "archive") {
    const archived = action === "archive";
    const { error } = await client.from("portal_prebooks").update({ status: archived ? "archived" : "draft", published_at: archived ? undefined : null, archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: archived ? "archived" : "draft" });
  }
  if (action === "move_up" || action === "move_down") return reorder(client, id, action);
  return NextResponse.json({ error: "Prebook action is invalid." }, { status: 400 });
}

async function reorder(client: Client, id: string, action: string) {
  const { data: current } = await client.from("portal_prebooks").select("id,brand_id,display_order").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Prebook not found." }, { status: 404 });
  let query = client.from("portal_prebooks").select("id,display_order").eq("brand_id", current.brand_id);
  query = action === "move_up" ? query.lt("display_order", current.display_order).order("display_order", { ascending: false }).limit(1) : query.gt("display_order", current.display_order).order("display_order").limit(1);
  const { data: adjacent } = await query;
  if (!adjacent?.[0]) return NextResponse.json({ status: "unchanged" });
  await client.from("portal_prebooks").update({ display_order: current.display_order }).eq("id", adjacent[0].id);
  const { error } = await client.from("portal_prebooks").update({ display_order: adjacent[0].display_order }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "reordered" });
}

async function availableCopySlug(client: Client, brandId: string, original: string) {
  for (let index = 1; index <= 100; index += 1) {
    const candidate = `${original}-copy${index === 1 ? "" : `-${index}`}`;
    const { count } = await client.from("portal_prebooks").select("id", { count: "exact", head: true }).eq("brand_id", brandId).eq("slug", candidate);
    if (!count) return candidate;
  }
  return `${original}-copy-${crypto.randomUUID().slice(0, 8)}`;
}

function isId(value: string) { return /^[0-9a-f-]{36}$/i.test(value); }
