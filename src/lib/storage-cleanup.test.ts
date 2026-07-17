import assert from "node:assert/strict";
import test from "node:test";
import { collectManagedObjectRefs, managedObjectRef, staleManagedObjectRefs } from "./storage-cleanup";

test("managed-object references accept only private portal buckets and safe paths", () => {
  assert.deepEqual(managedObjectRef("portal-documents", "catalogs/current.pdf"), { bucket: "portal-documents", path: "catalogs/current.pdf" });
  assert.equal(managedObjectRef("other-product", "catalog.pdf"), null);
  assert.equal(managedObjectRef("portal-documents", "../secret"), null);
});

test("collection deduplicates parent and resource references", () => {
  const refs = collectManagedObjectRefs(
    { cover_source_type: "storage_object", cover_storage_bucket: "portal-media", cover_storage_path: "covers/a.jpg" },
    "cover_",
    [
      { source_type: "storage_object", storage_bucket: "portal-documents", storage_path: "catalogs/a.pdf" },
      { source_type: "storage_object", storage_bucket: "portal-documents", storage_path: "catalogs/a.pdf" },
      { source_type: "external_url", storage_bucket: "portal-documents", storage_path: "ignored.pdf" },
    ],
  );
  assert.deepEqual(refs, [
    { bucket: "portal-media", path: "covers/a.jpg" },
    { bucket: "portal-documents", path: "catalogs/a.pdf" },
  ]);
});

test("stale references include only objects removed by the completed save", () => {
  const previous = [
    { bucket: "portal-media", path: "covers/old.jpg" },
    { bucket: "portal-documents", path: "shared.pdf" },
  ];
  const current = [
    { bucket: "portal-media", path: "covers/new.jpg" },
    { bucket: "portal-documents", path: "shared.pdf" },
  ];
  assert.deepEqual(staleManagedObjectRefs(previous, current), [{ bucket: "portal-media", path: "covers/old.jpg" }]);
});
