import assert from "node:assert/strict";
import test from "node:test";
import { linkHealthFromStatus } from "./link-health";

test("link health distinguishes available, host-blocked, and broken responses", () => {
  assert.equal(linkHealthFromStatus(200), "available");
  assert.equal(linkHealthFromStatus(302), "available");
  assert.equal(linkHealthFromStatus(403), "warning");
  assert.equal(linkHealthFromStatus(404), "unavailable");
});
