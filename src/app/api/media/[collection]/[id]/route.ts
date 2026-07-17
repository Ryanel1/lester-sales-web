import { NextResponse } from "next/server";
import { isPrebookOpen, isPublicationLive } from "@/lib/publication";
import { logServerEvent } from "@/lib/server-log";
import { createPortalAdminClient } from "@/lib/supabase/server";

const mediaTables = {
  catalog: {
    table: "portal_catalogs",
    fields: "cover_source_type,cover_external_url,cover_storage_bucket,cover_storage_path",
    prefix: "cover",
  },
  prebook: {
    table: "portal_prebooks",
    fields: "hero_source_type,hero_external_url,hero_storage_bucket,hero_storage_path",
    prefix: "hero",
  },
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
  if (!(collection in mediaTables) || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Image service unavailable." }, { status: 503 });

  const config = mediaTables[collection as keyof typeof mediaTables];
  const publicationFields = collection === "prebook" ? ",status,publish_at,deadline" : ",status,publish_at";
  const { data, error } = await client.from(config.table).select(`${config.fields}${publicationFields}`).eq("id", id).maybeSingle();
  if (error) logServerEvent("error", { event: "portal_media_record_read_failed", context: { collection, id }, error });
  if (error || !data) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  const row = data as unknown as Record<string, string | null>;
  if (!isPublicationLive(row.status ?? "draft", row.publish_at) || (row.deadline && !isPrebookOpen(row.deadline))) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  const sourceType = row[`${config.prefix}_source_type`];
  const externalUrl = row[`${config.prefix}_external_url`];
  const bucket = row[`${config.prefix}_storage_bucket`];
  const path = row[`${config.prefix}_storage_path`];

  if (sourceType === "external_url" && externalUrl) return cachedPrivateRedirect(externalUrl, 600);
  if (sourceType !== "storage_object" || !bucket || !path) {
    return NextResponse.json({ error: "Image is unavailable." }, { status: 404 });
  }

  const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(path, 300);
  if (signedError || !signed?.signedUrl) {
    logServerEvent("error", { event: "portal_media_signing_failed", context: { collection, id, bucket }, error: signedError });
    return NextResponse.json({ error: "Image is temporarily unavailable." }, { status: 503 });
  }
  return cachedPrivateRedirect(signed.signedUrl, 240);
}
