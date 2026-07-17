import assert from "node:assert/strict";
import test from "node:test";
import { artGroupRecord, artResourceRows } from "./art-publisher";

test("art groups require a brand, title, and at least one valid source", () => {
  assert.equal(artGroupRecord({ brandId: "11111111-1111-1111-1111-111111111111", title: "Decoration", status: "published" }).status, "published");
  assert.equal(artResourceRows([{ label: "Front chest", sourceType: "external_url", externalUrl: "https://company.example/front.pdf" }])[0].kind, "art");
  assert.throws(() => artResourceRows([]), /at least one/i);
});

test("art groups support a future schedule", () => {
  const now = Date.parse("2026-07-17T15:00:00.000Z");
  const scheduled = artGroupRecord({ brandId: "11111111-1111-1111-1111-111111111111", title: "Holiday art", status: "scheduled", publishAt: "2026-07-20T15:00:00.000Z" }, now);
  assert.equal(scheduled.status, "scheduled");
  assert.equal(scheduled.publish_at, "2026-07-20T15:00:00.000Z");
  assert.equal(scheduled.published_at, null);
});
