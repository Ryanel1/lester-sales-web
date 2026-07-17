import assert from "node:assert/strict";
import test from "node:test";
import { artGroupRecord, artResourceRows } from "./art-publisher";

test("art groups require a brand, title, and at least one valid source", () => {
  assert.equal(artGroupRecord({ brandId: "11111111-1111-1111-1111-111111111111", title: "Decoration", status: "published" }).status, "published");
  assert.equal(artResourceRows([{ label: "Front chest", sourceType: "external_url", externalUrl: "https://company.example/front.pdf" }])[0].kind, "art");
  assert.throws(() => artResourceRows([]), /at least one/i);
});
