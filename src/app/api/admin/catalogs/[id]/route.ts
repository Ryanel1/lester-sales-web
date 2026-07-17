import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { catalogRecord, catalogResourceRows, type CatalogResourceInput } from "@/lib/catalog-publisher";
import { logServerEvent } from "@/lib/server-log";
import { cleanupManagedObjects, collectManagedObjectRefs, staleManagedObjectRefs } from "@/lib/storage-cleanup";
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

  const { data: existing, error: existingError } = await client.from("portal_catalogs")
    .select("id,cover_source_type,cover_storage_bucket,cover_storage_path,portal_catalog_resources(source_type,storage_bucket,storage_path)")
    .eq("id", id).maybeSingle();
  if (existingError || !existing) return NextResponse.json({ error: "Catalog not found." }, { status: 404 });

  const previousRefs = collectManagedObjectRefs(existing, "cover_", existing.portal_catalog_resources ?? []);
  const currentRefs = collectManagedObjectRefs(record, "cover_", resources);
  const { error: saveError } = await client.rpc("portal_save_catalog", { p_id: id, p_record: record, p_resources: resources });
  if (saveError) {
    logServerEvent("error", { event: "portal_catalog_update_failed", error: saveError, context: { catalogId: id } });
    await cleanupManagedObjects(client, staleManagedObjectRefs(currentRefs, previousRefs), { operation: "catalog_update_rollback", catalogId: id });
    return NextResponse.json({ error: saveError.message }, { status: 409 });
  }
  await cleanupManagedObjects(client, staleManagedObjectRefs(previousRefs, currentRefs), { operation: "catalog_update", catalogId: id });
  revalidateTag("portal-content", "max");
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
    publish_at: null,
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
  revalidateTag("portal-content", "max");
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
  const { data: stored } = await client.from("portal_catalogs")
    .select("cover_source_type,cover_storage_bucket,cover_storage_path,portal_catalog_resources(source_type,storage_bucket,storage_path)")
    .eq("id", id).maybeSingle();
  const { error } = await client.from("portal_catalogs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (stored) await cleanupManagedObjects(client, collectManagedObjectRefs(stored, "cover_", stored.portal_catalog_resources ?? []), { operation: "catalog_delete", catalogId: id });
  revalidateTag("portal-content", "max");
  return NextResponse.json({ deleted: true });
}

async function lifecycleAction(client: NonNullable<ReturnType<typeof createPortalAdminClient>>, id: string, action: string) {
  if (action === "publish") {
    const { error } = await client.from("portal_catalogs").update({ status: "published", publish_at: null, published_at: new Date().toISOString(), archived_at: null }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    revalidateTag("portal-content", "max");
    return NextResponse.json({ status: "published" });
  }
  if (action === "unpublish") {
    const { error } = await client.from("portal_catalogs").update({ status: "draft", publish_at: null, published_at: null, archived_at: null }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    revalidateTag("portal-content", "max");
    return NextResponse.json({ status: "draft" });
  }
  if (action === "archive") {
    const { error } = await client.from("portal_catalogs").update({ status: "archived", publish_at: null, archived_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    revalidateTag("portal-content", "max");
    return NextResponse.json({ status: "archived" });
  }
  if (action === "move_up" || action === "move_down") {
    const { data: status, error } = await client.rpc("portal_reorder_catalog", { p_id: id, p_direction: action === "move_up" ? "up" : "down" });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    if (status === "reordered") revalidateTag("portal-content", "max");
    return NextResponse.json({ status });
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
