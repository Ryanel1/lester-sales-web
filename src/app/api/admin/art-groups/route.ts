import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { artGroupRecord, artResourceRows, type ArtResourceInput } from "@/lib/art-publisher";
import { createPortalAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Publisher unavailable." }, { status: 503 });
  const [brands, groups] = await Promise.all([
    client.from("portal_brands").select("id,slug,name").order("display_order"),
    client.from("portal_art_groups").select("id,brand_id,title,status,display_order,updated_at,portal_brands(name),portal_art_resources(id,label,kind,source_type,external_url,storage_bucket,storage_path,original_filename,mime_type,byte_size,display_order)").order("display_order").order("updated_at", { ascending: false }),
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
    const { data: orderRows } = await client.from("portal_art_groups").select("display_order").eq("brand_id", record.brand_id).order("display_order", { ascending: false }).limit(1);
    const { data: group, error } = await client.from("portal_art_groups").insert({ ...record, display_order: (orderRows?.[0]?.display_order ?? 0) + 10 }).select("id").single();
    if (error || !group) return NextResponse.json({ error: error?.message ?? "Unable to save art group." }, { status: 409 });
    const { error: resourceError } = await client.from("portal_art_resources").insert(resources.map((resource) => ({ ...resource, art_group_id: group.id })));
    if (resourceError) { await client.from("portal_art_groups").delete().eq("id", group.id); return NextResponse.json({ error: resourceError.message }, { status: 409 }); }
    return NextResponse.json({ id: group.id, status: record.status }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Art group is invalid." }, { status: 400 });
  }
}
