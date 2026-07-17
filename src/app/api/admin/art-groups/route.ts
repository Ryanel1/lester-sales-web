import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { artGroupRecord, artResourceRows, type ArtResourceInput } from "@/lib/art-publisher";
import { logServerEvent } from "@/lib/server-log";
import { cleanupManagedObjects, collectManagedObjectRefs } from "@/lib/storage-cleanup";
import { createPortalAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const [brands, groups] = await Promise.all([
    client.from("portal_brands").select("id,slug,name").order("display_order"),
    client.from("portal_art_groups").select("id,brand_id,title,status,publish_at,display_order,updated_at,portal_brands(name),portal_art_resources(id,label,kind,source_type,external_url,storage_bucket,storage_path,original_filename,mime_type,byte_size,display_order)").order("display_order").order("updated_at", { ascending: false }),
  ]);
  if (brands.error || groups.error) return NextResponse.json({ error: "Unable to load art groups." }, { status: 503 });
  return NextResponse.json({ brands: brands.data, groups: groups.data });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Art group request is invalid." }, { status: 400 });
  try {
    const record = artGroupRecord(body);
    const resources = artResourceRows(Array.isArray(body.resources) ? body.resources as ArtResourceInput[] : []);
    const { data: groupId, error } = await client.rpc("portal_save_art_group", { p_id: null, p_record: record, p_resources: resources });
    if (error || typeof groupId !== "string") {
      logServerEvent("error", { event: "portal_art_group_create_failed", error, context: { brandId: record.brand_id } });
      await cleanupManagedObjects(client, collectManagedObjectRefs(null, null, resources), { operation: "art_group_create_rollback" });
      return NextResponse.json({ error: error?.message ?? "Unable to save art group." }, { status: 409 });
    }
    revalidateTag("portal-content", "max");
    return NextResponse.json({ id: groupId, status: record.status }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Art group is invalid." }, { status: 400 });
  }
}
