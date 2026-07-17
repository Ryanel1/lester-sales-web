import assert from "node:assert/strict";
import test from "node:test";
import { prebookRecord, prebookResourceRows } from "./prebook-publisher";

const brandId = "11111111-1111-1111-1111-111111111111";

test("prebook publishing requires dates, booking details, and the three core files", () => {
  const rows = prebookResourceRows([
    { label: "Catalog", kind: "catalog", sourceType: "external_url", externalUrl: "https://company.example/catalog.pdf" },
    { label: "Price list", kind: "pricing", sourceType: "external_url", externalUrl: "https://company.example/pricing.pdf" },
    { label: "Workbook", kind: "workbook", sourceType: "storage_object", storageBucket: "portal-documents", storagePath: "workbooks/order.xlsx" },
  ]);
  assert.deepEqual(rows.map((row) => row.kind), ["catalog", "pricing", "workbook"]);
  assert.throws(() => prebookResourceRows(rows.slice(0, 2)), /catalog, price list, and workbook/i);
  assert.throws(() => prebookRecord({ brandId, title: "Past", slug: "past", deadline: "2026-01-01", shipDate: "Spring", minimums: "12", status: "published", hero: { sourceType: "external_url", externalUrl: "https://company.example/hero.jpg" } }, Date.parse("2026-07-16")), /passed deadline/i);
});

test("a scheduled prebook must publish before its deadline", () => {
  const base = { brandId, title: "Fall booking", slug: "fall-booking", shipDate: "Spring", minimums: "12", hero: { sourceType: "external_url", externalUrl: "https://company.example/hero.jpg" } };
  const now = Date.parse("2026-07-17T15:00:00.000Z");
  const record = prebookRecord({ ...base, deadline: "2026-08-01T15:00:00.000Z", status: "scheduled", publishAt: "2026-07-20T15:00:00.000Z" }, now);
  assert.equal(record.status, "scheduled");
  assert.equal(record.publish_at, "2026-07-20T15:00:00.000Z");
  assert.throws(() => prebookRecord({ ...base, deadline: "2026-07-19T15:00:00.000Z", status: "scheduled", publishAt: "2026-07-20T15:00:00.000Z" }, now), /before its booking deadline/i);
});
