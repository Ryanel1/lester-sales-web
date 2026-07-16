import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { catalogRecord, catalogResourceRows, type CatalogResourceInput } from "@/lib/catalog-publisher";
import { createPortalAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const [brands, catalogs] = await Promise.all([
    client.from("portal_brands").select("id,slug,name").order("display_order"),
    client.from("portal_catalogs")
      .select("id,brand_id,slug,title,season,summary,image_alt,status,display_order,updated_at,cover_source_type,cover_external_url,cover_storage_bucket,cover_storage_path,cover_original_filename,cover_mime_type,cover_byte_size,portal_brands(name),portal_catalog_resources(id,label,kind,source_type,external_url,storage_bucket,storage_path,original_filename,mime_type,byte_size,display_order)")
      .order("display_order")
      .order("updated_at", { ascending: false }),
  ]);
  if (brands.error || catalogs.error) return NextResponse.json({ error: "Unable to load catalogs." }, { status: 503 });
  return NextResponse.json({ brands: brands.data, catalogs: catalogs.data });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Catalog request is invalid." }, { status: 400 });
  let record: ReturnType<typeof catalogRecord>;
  let resources: ReturnType<typeof catalogResourceRows>;
  try {
    record = catalogRecord(body);
    resources = catalogResourceRows(
      (body.catalogResource ?? {}) as CatalogResourceInput,
      Array.isArray(body.attachments) ? body.attachments as CatalogResourceInput[] : [],
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Resource source is invalid." }, { status: 400 });
  }

  const { data: orderRows } = await client.from("portal_catalogs").select("display_order").eq("brand_id", record.brand_id).order("display_order", { ascending: false }).limit(1);
  const displayOrder = (orderRows?.[0]?.display_order ?? 0) + 10;
  const { data: catalog, error: catalogError } = await client.from("portal_catalogs").insert({ ...record, display_order: displayOrder }).select("id").single();
  if (catalogError || !catalog) return NextResponse.json({ error: catalogError?.message ?? "Unable to save catalog." }, { status: 409 });

  const { error: resourceError } = await client.from("portal_catalog_resources").insert(resources.map((resource) => ({ ...resource, catalog_id: catalog.id })));
  if (resourceError) {
    await client.from("portal_catalogs").delete().eq("id", catalog.id);
    return NextResponse.json({ error: resourceError.message }, { status: 409 });
  }
  return NextResponse.json({ id: catalog.id, status: record.status }, { status: 201 });
}
