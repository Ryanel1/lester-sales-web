import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { artGroupRecord, artResourceRows, type ArtResourceInput } from "@/lib/art-publisher";
import { createPortalAdminClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
type Client = NonNullable<ReturnType<typeof createPortalAdminClient>>;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: "Art group not found." }, { status: 404 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Art group request is invalid." }, { status: 400 });
  if (typeof body.action === "string") return lifecycleAction(client, id, body.action);
  try {
    const record = artGroupRecord(body);
    const resources = artResourceRows(Array.isArray(body.resources) ? body.resources as ArtResourceInput[] : []);
    const { data: existing } = await client.from("portal_art_groups").select("id").eq("id", id).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Art group not found." }, { status: 404 });
    const { error } = await client.from("portal_art_groups").update(record).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    const ids: string[] = [];
    for (const resource of resources) {
      const { data: saved, error: resourceError } = await client.from("portal_art_resources").upsert({ ...resource, art_group_id: id }).select("id").single();
      if (resourceError || !saved) return NextResponse.json({ error: resourceError?.message ?? "Unable to save an art resource." }, { status: 409 });
      ids.push(saved.id);
    }
    let stale = client.from("portal_art_resources").delete().eq("art_group_id", id);
    if (ids.length) stale = stale.not("id", "in", `(${ids.join(",")})`);
    const { error: staleError } = await stale;
    return staleError ? NextResponse.json({ error: staleError.message }, { status: 409 }) : NextResponse.json({ id, status: record.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Art group is invalid." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (!isId(id) || body?.action !== "duplicate") return NextResponse.json({ error: "Art group action is invalid." }, { status: 400 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const { data: group } = await client.from("portal_art_groups").select("*,portal_art_resources(*)").eq("id", id).maybeSingle();
  if (!group) return NextResponse.json({ error: "Art group not found." }, { status: 404 });
  const { portal_art_resources: resources, id: _id, created_at: _created, updated_at: _updated, ...copy } = group;
  void _id; void _created; void _updated;
  const title = await availableCopyTitle(client, group.brand_id, group.title);
  const { data: duplicate, error } = await client.from("portal_art_groups").insert({ ...copy, title, status: "draft", published_at: null, archived_at: null, display_order: group.display_order + 1 }).select("id").single();
  if (error || !duplicate) return NextResponse.json({ error: error?.message ?? "Unable to duplicate art group." }, { status: 409 });
  if (resources?.length) {
    const rows = resources.map(({ id: _resourceId, art_group_id: _parentId, created_at: _resourceCreated, updated_at: _resourceUpdated, ...resource }: Record<string, unknown>) => {
      void _resourceId; void _parentId; void _resourceCreated; void _resourceUpdated;
      return { ...resource, art_group_id: duplicate.id };
    });
    const { error: resourcesError } = await client.from("portal_art_resources").insert(rows);
    if (resourcesError) { await client.from("portal_art_groups").delete().eq("id", duplicate.id); return NextResponse.json({ error: resourcesError.message }, { status: 409 }); }
  }
  return NextResponse.json({ id: duplicate.id }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: "Art group not found." }, { status: 404 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const { data: group } = await client.from("portal_art_groups").select("status").eq("id", id).maybeSingle();
  if (!group) return NextResponse.json({ error: "Art group not found." }, { status: 404 });
  if (["published", "scheduled"].includes(group.status)) return NextResponse.json({ error: "Archive or unpublish this group before permanently deleting it." }, { status: 409 });
  const { error } = await client.from("portal_art_groups").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ deleted: true });
}

async function lifecycleAction(client: Client, id: string, action: string) {
  if (action === "publish") {
    const { count } = await client.from("portal_art_resources").select("id", { count: "exact", head: true }).eq("art_group_id", id);
    if (!count) return NextResponse.json({ error: "Add at least one art resource before publishing." }, { status: 409 });
    const { error } = await client.from("portal_art_groups").update({ status: "published", published_at: new Date().toISOString(), archived_at: null }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "published" });
  }
  if (action === "unpublish" || action === "archive") {
    const archived = action === "archive";
    const { error } = await client.from("portal_art_groups").update({ status: archived ? "archived" : "draft", published_at: archived ? undefined : null, archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: archived ? "archived" : "draft" });
  }
  if (action === "move_up" || action === "move_down") return reorder(client, id, action);
  return NextResponse.json({ error: "Art group action is invalid." }, { status: 400 });
}

async function reorder(client: Client, id: string, action: string) {
  const { data: current } = await client.from("portal_art_groups").select("id,brand_id,display_order").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Art group not found." }, { status: 404 });
  let query = client.from("portal_art_groups").select("id,display_order").eq("brand_id", current.brand_id);
  query = action === "move_up" ? query.lt("display_order", current.display_order).order("display_order", { ascending: false }).limit(1) : query.gt("display_order", current.display_order).order("display_order").limit(1);
  const { data: adjacent } = await query;
  if (!adjacent?.[0]) return NextResponse.json({ status: "unchanged" });
  await client.from("portal_art_groups").update({ display_order: current.display_order }).eq("id", adjacent[0].id);
  const { error } = await client.from("portal_art_groups").update({ display_order: adjacent[0].display_order }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "reordered" });
}

async function availableCopyTitle(client: Client, brandId: string, original: string) {
  for (let index = 1; index <= 100; index += 1) {
    const candidate = `${original} copy${index === 1 ? "" : ` ${index}`}`;
    const { count } = await client.from("portal_art_groups").select("id", { count: "exact", head: true }).eq("brand_id", brandId).eq("title", candidate);
    if (!count) return candidate;
  }
  return `${original} copy ${crypto.randomUUID().slice(0, 8)}`;
}

function isId(value: string) { return /^[0-9a-f-]{36}$/i.test(value); }
