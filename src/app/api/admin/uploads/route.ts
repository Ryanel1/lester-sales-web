import { NextRequest, NextResponse } from "next/server";
import { authorizePortalAdmin, isAdminAuthFailure } from "@/lib/admin-auth";
import { logServerEvent } from "@/lib/server-log";
import { createPortalAdminClient } from "@/lib/supabase/server";

const allowedBuckets = new Set(["portal-documents", "portal-media"]);

export async function POST(request: NextRequest) {
  const authorization = await authorizePortalAdmin(request);
  if (isAdminAuthFailure(authorization)) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const body = await request.json().catch(() => null) as { bucket?: unknown; filename?: unknown; byteSize?: unknown } | null;
  const bucket = typeof body?.bucket === "string" ? body.bucket : "";
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const byteSize = typeof body?.byteSize === "number" ? body.byteSize : -1;
  if (!allowedBuckets.has(bucket) || !filename || filename.length > 180 || byteSize < 1 || byteSize > 104_857_600) {
    return NextResponse.json({ error: "Upload request is invalid." }, { status: 400 });
  }

  const safeName = filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
  const path = `publisher/${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safeName}`;
  const client = createPortalAdminClient();
  if (!client) return NextResponse.json({ error: "Upload service unavailable." }, { status: 503 });
  const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    logServerEvent("error", { event: "portal_upload_prepare_failed", context: { bucket, byteSize }, error });
    return NextResponse.json({ error: "Unable to prepare the upload." }, { status: 503 });
  }
  return NextResponse.json({ bucket, path, token: data.token });
}
