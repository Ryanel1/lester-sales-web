import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { prebookRecord, prebookResourceRows, type PrebookResourceInput } from "@/lib/prebook-publisher";
import { logServerEvent } from "@/lib/server-log";
import { cleanupManagedObjects, collectManagedObjectRefs } from "@/lib/storage-cleanup";
import { createPortalAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const [brands, prebooks] = await Promise.all([
    client.from("portal_brands").select("id,slug,name").order("display_order"),
    client.from("portal_prebooks")
      .select("id,brand_id,slug,title,season,image_alt,deadline,ship_date,minimums,details,status,publish_at,display_order,updated_at,hero_source_type,hero_external_url,hero_storage_bucket,hero_storage_path,hero_original_filename,hero_mime_type,hero_byte_size,portal_brands(name),portal_prebook_resources(id,label,kind,source_type,external_url,storage_bucket,storage_path,original_filename,mime_type,byte_size,display_order)")
      .order("display_order").order("updated_at", { ascending: false }),
  ]);
  if (brands.error || prebooks.error) return NextResponse.json({ error: "Unable to load prebooks." }, { status: 503 });
  return NextResponse.json({ brands: brands.data, prebooks: prebooks.data });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Prebook request is invalid." }, { status: 400 });
  try {
    const record = prebookRecord(body);
    const resources = prebookResourceRows(Array.isArray(body.resources) ? body.resources as PrebookResourceInput[] : []);
    const { data: prebookId, error } = await client.rpc("portal_save_prebook", { p_id: null, p_record: record, p_resources: resources });
    if (error || typeof prebookId !== "string") {
      logServerEvent("error", { event: "portal_prebook_create_failed", error, context: { brandId: record.brand_id } });
      await cleanupManagedObjects(client, collectManagedObjectRefs(record, "hero_", resources), { operation: "prebook_create_rollback" });
      return NextResponse.json({ error: error?.message ?? "Unable to save prebook." }, { status: 409 });
    }
    revalidateTag("portal-content", "max");
    return NextResponse.json({ id: prebookId, status: record.status }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prebook is invalid." }, { status: 400 });
  }
}
