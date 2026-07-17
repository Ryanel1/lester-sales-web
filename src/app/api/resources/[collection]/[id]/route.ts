import { NextResponse } from "next/server";
import { isPrebookOpen, isPublicationLive } from "@/lib/publication";
import { logServerEvent } from "@/lib/server-log";
import { createPortalAdminClient } from "@/lib/supabase/server";

const resourceTables = {
  art: { table: "portal_art_resources", parentId: "art_group_id", parentTable: "portal_art_groups" },
  catalog: { table: "portal_catalog_resources", parentId: "catalog_id", parentTable: "portal_catalogs" },
  prebook: { table: "portal_prebook_resources", parentId: "prebook_id", parentTable: "portal_prebooks" },
} as const;

function cachedPrivateRedirect(url: string, maxAge: number) {
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Cache-Control", `private, max-age=${maxAge}`);
  return response;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ collection: string; id: string }> },
) {
  const { collection, id } = await params;
  if (!(collection in resourceTables) || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Resource service unavailable." }, { status: 503 });

  const config = resourceTables[collection as keyof typeof resourceTables];
  const { data, error } = await client
    .from(config.table)
    .select(`source_type,external_url,storage_bucket,storage_path,${config.parentId}`)
    .eq("id", id)
    .maybeSingle();
  if (error) logServerEvent("error", { event: "portal_resource_record_read_failed", context: { collection, id }, error });
  if (error || !data) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

  const resource = data as unknown as Record<string, string | null>;
  const parentId = resource[config.parentId];
  if (!parentId) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  const parentFields = collection === "prebook" ? "status,publish_at,deadline" : "status,publish_at";
  const { data: parent, error: parentError } = await client
    .from(config.parentTable)
    .select(parentFields)
    .eq("id", parentId)
    .maybeSingle();
  const publication = parent as unknown as { status?: string; publish_at?: string | null; deadline?: string } | null;
  if (
    parentError
    || !publication?.status
    || !isPublicationLive(publication.status, publication.publish_at ?? null)
    || (publication.deadline && !isPrebookOpen(publication.deadline))
  ) {
    if (parentError) logServerEvent("error", { event: "portal_resource_parent_read_failed", context: { collection, id, parentId }, error: parentError });
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  if (resource.source_type === "external_url" && resource.external_url) {
    return cachedPrivateRedirect(resource.external_url, 600);
  }
  if (resource.source_type !== "storage_object" || !resource.storage_bucket || !resource.storage_path) {
    return NextResponse.json({ error: "Resource is unavailable." }, { status: 404 });
  }

  const { data: signed, error: signedError } = await client.storage
    .from(resource.storage_bucket)
    .createSignedUrl(resource.storage_path, 300);
  if (signedError || !signed?.signedUrl) {
    logServerEvent("error", { event: "portal_resource_signing_failed", context: { collection, id, bucket: resource.storage_bucket }, error: signedError });
    return NextResponse.json({ error: "Resource is temporarily unavailable." }, { status: 503 });
  }

  return cachedPrivateRedirect(signed.signedUrl, 240);
}
