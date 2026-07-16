import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { createPortalAdminClient } from "@/lib/supabase/server";

type SourceInput = {
  sourceType?: unknown;
  externalUrl?: unknown;
  storageBucket?: unknown;
  storagePath?: unknown;
  originalFilename?: unknown;
  mimeType?: unknown;
  byteSize?: unknown;
};

function sourceFields(source: SourceInput, prefix = "") {
  const sourceType = source.sourceType === "storage_object" ? "storage_object" : "external_url";
  const externalUrl = typeof source.externalUrl === "string" ? source.externalUrl.trim() : "";
  const storageBucket = typeof source.storageBucket === "string" ? source.storageBucket : "";
  const storagePath = typeof source.storagePath === "string" ? source.storagePath : "";
  if (sourceType === "external_url" && !/^https:\/\//i.test(externalUrl)) throw new Error("Company links must begin with https://.");
  if (sourceType === "storage_object" && (!storageBucket || !storagePath)) throw new Error("Finish the file upload before saving.");
  return {
    [`${prefix}source_type`]: sourceType,
    [`${prefix}external_url`]: sourceType === "external_url" ? externalUrl : null,
    [`${prefix}storage_bucket`]: sourceType === "storage_object" ? storageBucket : null,
    [`${prefix}storage_path`]: sourceType === "storage_object" ? storagePath : null,
    [`${prefix}original_filename`]: typeof source.originalFilename === "string" ? source.originalFilename : null,
    [`${prefix}mime_type`]: typeof source.mimeType === "string" ? source.mimeType : null,
    [`${prefix}byte_size`]: typeof source.byteSize === "number" ? source.byteSize : null,
  };
}

export async function GET(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const [brands, catalogs] = await Promise.all([
    client.from("portal_brands").select("id,slug,name").order("display_order"),
    client.from("portal_catalogs").select("id,title,season,status,updated_at,portal_brands(name)").order("updated_at", { ascending: false }),
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
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const status = body.status === "published" ? "published" : "draft";
  if (!/^[0-9a-f-]{36}$/i.test(brandId) || !title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: "Brand, title, and URL slug are required." }, { status: 400 });
  }

  let coverFields: Record<string, unknown>;
  let resourceFields: Record<string, unknown>;
  try {
    coverFields = sourceFields((body.cover ?? {}) as SourceInput, "cover_");
    resourceFields = sourceFields((body.catalogResource ?? {}) as SourceInput);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Resource source is invalid." }, { status: 400 });
  }

  const { data: catalog, error: catalogError } = await client.from("portal_catalogs").insert({
    brand_id: brandId,
    slug,
    title,
    season: typeof body.season === "string" ? body.season.trim() : "",
    summary: typeof body.summary === "string" ? body.summary.trim() : "",
    image_alt: typeof body.imageAlt === "string" ? body.imageAlt.trim() : `Cover of ${title}`,
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    ...coverFields,
  }).select("id").single();
  if (catalogError || !catalog) return NextResponse.json({ error: catalogError?.message ?? "Unable to save catalog." }, { status: 409 });

  const { error: resourceError } = await client.from("portal_catalog_resources").insert({
    catalog_id: catalog.id,
    label: "View catalog",
    kind: "catalog",
    link_status: resourceFields.source_type === "external_url" ? "unchecked" : "available",
    display_order: 10,
    ...resourceFields,
  });
  if (resourceError) {
    await client.from("portal_catalogs").delete().eq("id", catalog.id);
    return NextResponse.json({ error: resourceError.message }, { status: 409 });
  }
  return NextResponse.json({ id: catalog.id, status }, { status: 201 });
}
