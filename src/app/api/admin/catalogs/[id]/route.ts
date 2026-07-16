import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { catalogRecord, catalogResourceRows, type CatalogResourceInput } from "@/lib/catalog-publisher";
import { createPortalAdminClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Catalog request is invalid." }, { status: 400 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });

  if (typeof body.action === "string") return lifecycleAction(client, id, body.action);

  let record: ReturnType<typeof catalogRecord>;
  let resources: ReturnType<typeof catalogResourceRows>;
  try {
    record = catalogRecord(body);
    resources = catalogResourceRows(
      (body.catalogResource ?? {}) as CatalogResourceInput,
      Array.isArray(body.attachments) ? body.attachments as CatalogResourceInput[] : [],
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catalog is invalid." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await client.from("portal_catalogs").select("id").eq("id", id).maybeSingle();
  if (existingError || !existing) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });

  const { error: catalogError } = await client.from("portal_catalogs").update(record).eq("id", id);
  if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 409 });

  const resourceIds: string[] = [];
  for (const resource of resources) {
    const { data: saved, error } = await client.from("portal_catalog_resources").upsert({ ...resource, catalog_id: id }).select("id").single();
    if (error || !saved) return NextResponse.json({ error: error?.message ?? "Unable to save a resource." }, { status: 409 });
    resourceIds.push(saved.id);
  }
  let staleQuery = client.from("portal_catalog_resources").delete().eq("catalog_id", id);
  if (resourceIds.length) staleQuery = staleQuery.not("id", "in", `(${resourceIds.join(",")})`);
  const { error: staleError } = await staleQuery;
  if (staleError) return NextResponse.json({ error: staleError.message }, { status: 409 });
  return NextResponse.json({ id, status: record.status });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (body?.action !== "duplicate") return NextResponse.json({ error: "Catalog action is invalid." }, { status: 400 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });

  const { data: catalog, error } = await client.from("portal_catalogs").select("*,portal_catalog_resources(*)").eq("id", id).maybeSingle();
  if (error || !catalog) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });
  const { portal_catalog_resources: resources, id: _id, created_at: _created, updated_at: _updated, ...copy } = catalog;
  void _id; void _created; void _updated;
  const slug = await availableCopySlug(client, catalog.brand_id, catalog.slug);
  const { data: duplicate, error: duplicateError } = await client.from("portal_catalogs").insert({
    ...copy,
    slug,
    title: `${catalog.title} copy`,
    status: "draft",
    published_at: null,
    archived_at: null,
    display_order: catalog.display_order + 1,
  }).select("id").single();
  if (duplicateError || !duplicate) return NextResponse.json({ error: duplicateError?.message ?? "Unable to duplicate catalog." }, { status: 409 });
  if (resources?.length) {
    const rows = resources.map(({ id: _resourceId, catalog_id: _catalogId, created_at: _resourceCreated, updated_at: _resourceUpdated, ...resource }: Record<string, unknown>) => {
      void _resourceId; void _catalogId; void _resourceCreated; void _resourceUpdated;
      return { ...resource, catalog_id: duplicate.id };
    });
    const { error: resourcesError } = await client.from("portal_catalog_resources").insert(rows);
    if (resourcesError) {
      await client.from("portal_catalogs").delete().eq("id", duplicate.id);
      return NextResponse.json({ error: resourcesError.message }, { status: 409 });
    }
  }
  return NextResponse.json({ id: duplicate.id }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await params;
  if (!isId(id)) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const { data: catalog } = await client.from("portal_catalogs").select("status").eq("id", id).maybeSingle();
  if (!catalog) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });
  if (catalog.status === "published" || catalog.status === "scheduled") {
    return NextResponse.json({ error: "Archive or unpublish this catalog before permanently deleting it." }, { status: 409 });
  }
  const { error } = await client.from("portal_catalogs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ deleted: true });
}

async function lifecycleAction(client: NonNullable<ReturnType<typeof createPortalAdminClient>>, id: string, action: string) {
  if (action === "publish") {
    const { error } = await client.from("portal_catalogs").update({ status: "published", published_at: new Date().toISOString(), archived_at: null }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "published" });
  }
  if (action === "unpublish") {
    const { error } = await client.from("portal_catalogs").update({ status: "draft", published_at: null, archived_at: null }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "draft" });
  }
  if (action === "archive") {
    const { error } = await client.from("portal_catalogs").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "archived" });
  }
  if (action === "move_up" || action === "move_down") {
    const { data: current } = await client.from("portal_catalogs").select("id,brand_id,display_order").eq("id", id).maybeSingle();
    if (!current) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });
    let query = client.from("portal_catalogs").select("id,display_order").eq("brand_id", current.brand_id);
    query = action === "move_up"
      ? query.lt("display_order", current.display_order).order("display_order", { ascending: false }).limit(1)
      : query.gt("display_order", current.display_order).order("display_order").limit(1);
    const { data: adjacent } = await query;
    if (!adjacent?.[0]) return NextResponse.json({ status: "unchanged" });
    await client.from("portal_catalogs").update({ display_order: current.display_order }).eq("id", adjacent[0].id);
    const { error } = await client.from("portal_catalogs").update({ display_order: adjacent[0].display_order }).eq("id", current.id);
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ status: "reordered" });
  }
  return NextResponse.json({ error: "Catalog action is invalid." }, { status: 400 });
}

async function availableCopySlug(client: NonNullable<ReturnType<typeof createPortalAdminClient>>, brandId: string, originalSlug: string) {
  for (let index = 1; index <= 100; index += 1) {
    const candidate = `${originalSlug}-copy${index === 1 ? "" : `-${index}`}`;
    const { count } = await client.from("portal_catalogs").select("id", { count: "exact", head: true }).eq("brand_id", brandId).eq("slug", candidate);
    if (!count) return candidate;
  }
  return `${originalSlug}-copy-${crypto.randomUUID().slice(0, 8)}`;
}

function isId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}
