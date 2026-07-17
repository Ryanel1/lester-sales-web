import type { SupabaseClient } from "@supabase/supabase-js";
import { logServerEvent } from "@/lib/server-log";

export type ManagedObjectRef = { bucket: string; path: string };

const managedBuckets = new Set(["portal-documents", "portal-media"]);

export function managedObjectRef(bucket: unknown, path: unknown): ManagedObjectRef | null {
  if (typeof bucket !== "string" || typeof path !== "string") return null;
  const normalizedPath = path.trim();
  if (!managedBuckets.has(bucket) || !normalizedPath || normalizedPath.startsWith("/") || normalizedPath.includes("..")) return null;
  return { bucket, path: normalizedPath };
}

export function collectManagedObjectRefs(
  parent: Record<string, unknown> | null | undefined,
  prefix: "cover_" | "hero_" | null,
  resources: Array<Record<string, unknown>> = [],
) {
  const refs: ManagedObjectRef[] = [];
  if (parent && prefix && parent[`${prefix}source_type`] === "storage_object") {
    const ref = managedObjectRef(parent[`${prefix}storage_bucket`], parent[`${prefix}storage_path`]);
    if (ref) refs.push(ref);
  }
  for (const resource of resources) {
    if (resource.source_type !== "storage_object") continue;
    const ref = managedObjectRef(resource.storage_bucket, resource.storage_path);
    if (ref) refs.push(ref);
  }
  return uniqueManagedObjectRefs(refs);
}

export function staleManagedObjectRefs(previous: ManagedObjectRef[], current: ManagedObjectRef[]) {
  const currentKeys = new Set(current.map(refKey));
  return uniqueManagedObjectRefs(previous).filter((ref) => !currentKeys.has(refKey(ref)));
}

export async function cleanupManagedObjects(
  client: SupabaseClient,
  candidates: ManagedObjectRef[],
  context: Record<string, unknown>,
) {
  const result = { removed: 0, skipped: 0, failed: 0 };
  for (const ref of uniqueManagedObjectRefs(candidates)) {
    const { data: referenced, error: referenceError } = await client.rpc("portal_storage_object_is_referenced", {
      p_bucket: ref.bucket,
      p_path: ref.path,
    });
    if (referenceError) {
      result.failed += 1;
      logServerEvent("error", { event: "portal_storage_reference_check_failed", context: { ...context, bucket: ref.bucket, path: ref.path }, error: referenceError });
      continue;
    }
    if (referenced) {
      result.skipped += 1;
      continue;
    }
    const { error: removeError } = await client.storage.from(ref.bucket).remove([ref.path]);
    if (removeError) {
      result.failed += 1;
      logServerEvent("error", { event: "portal_storage_cleanup_failed", context: { ...context, bucket: ref.bucket, path: ref.path }, error: removeError });
      continue;
    }
    result.removed += 1;
    logServerEvent("info", { event: "portal_storage_object_removed", context: { ...context, bucket: ref.bucket, path: ref.path } });
  }
  return result;
}

function uniqueManagedObjectRefs(refs: ManagedObjectRef[]) {
  return Array.from(new Map(refs.map((ref) => [refKey(ref), ref])).values());
}

function refKey(ref: ManagedObjectRef) {
  return `${ref.bucket}\u0000${ref.path}`;
}
