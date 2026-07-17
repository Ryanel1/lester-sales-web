import assert from "node:assert/strict";
import test from "node:test";
import { catalogRecord, catalogResourceRows, catalogSourceFields, isTemporarySignedUrl, publicationFields } from "./catalog-publisher";

const brandId = "11111111-1111-1111-1111-111111111111";
const cover = { sourceType: "external_url", externalUrl: "https://company.example/cover.jpg" };

test("catalog resources preserve order and require one valid source", () => {
  const rows = catalogResourceRows(
    { sourceType: "external_url", externalUrl: "https://company.example/catalog.pdf" },
    [
      { label: "Standard pricing", kind: "pricing", sourceType: "external_url", externalUrl: "https://company.example/pricing.pdf" },
      { label: "Savings program", kind: "program", sourceType: "storage_object", storageBucket: "portal-documents", storagePath: "programs/savings.pdf" },
    ],
  );
  assert.deepEqual(rows.map(({ label, kind, display_order }) => ({ label, kind, display_order })), [
    { label: "View catalog", kind: "catalog", display_order: 10 },
    { label: "Standard pricing", kind: "pricing", display_order: 20 },
    { label: "Savings program", kind: "program", display_order: 30 },
  ]);
  assert.throws(() => catalogSourceFields({ sourceType: "external_url", externalUrl: "http://insecure.example/file.pdf" }), /https/);
  assert.throws(() => catalogSourceFields({ sourceType: "storage_object", storageBucket: "other-product", storagePath: "file.pdf" }), /upload/);
});

test("temporary signed company links are detected", () => {
  assert.equal(isTemporarySignedUrl("https://company.example/catalog.pdf"), false);
  assert.equal(isTemporarySignedUrl("https://cdn.example/catalog.pdf?Expires=123&Signature=abc"), true);
  assert.equal(isTemporarySignedUrl("https://cdn.example/catalog.pdf?token=temporary"), true);
});

test("catalogs can be scheduled only for a future publication time", () => {
  const now = Date.parse("2026-07-17T15:00:00.000Z");
  const scheduled = catalogRecord({ brandId, title: "Fall line", slug: "fall-line", status: "scheduled", publishAt: "2026-07-18T15:00:00.000Z", cover }, now);
  assert.equal(scheduled.status, "scheduled");
  assert.equal(scheduled.publish_at, "2026-07-18T15:00:00.000Z");
  assert.equal(scheduled.published_at, null);
  assert.throws(() => publicationFields({ status: "scheduled", publishAt: "2026-07-17T14:59:00.000Z" }, now), /future/i);
});

test("immediate and draft catalog saves clear old schedules", () => {
  const now = Date.parse("2026-07-17T15:00:00.000Z");
  assert.deepEqual(publicationFields({ status: "published", publishAt: "2027-01-01" }, now), {
    status: "published", publish_at: null, published_at: "2026-07-17T15:00:00.000Z",
  });
  assert.deepEqual(publicationFields({ status: "draft", publishAt: "2027-01-01" }, now), {
    status: "draft", publish_at: null, published_at: null,
  });
});
