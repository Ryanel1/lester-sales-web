import assert from "node:assert/strict";
import test from "node:test";
import { catalogResourceRows, catalogSourceFields, isTemporarySignedUrl } from "./catalog-publisher";

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
