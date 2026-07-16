import assert from "node:assert/strict";
import test from "node:test";
import { isPrebookOpen, isPublicationLive } from "./publication";

const now = Date.parse("2026-07-16T12:00:00Z");

test("only published and due scheduled content is live", () => {
  assert.equal(isPublicationLive("published", null, now), true);
  assert.equal(isPublicationLive("scheduled", "2026-07-16T11:59:00Z", now), true);
  assert.equal(isPublicationLive("scheduled", "2026-07-16T12:01:00Z", now), false);
  assert.equal(isPublicationLive("draft", null, now), false);
  assert.equal(isPublicationLive("archived", null, now), false);
});

test("prebooks close immediately at their deadline", () => {
  assert.equal(isPrebookOpen("2026-07-16T12:00:01Z", now), true);
  assert.equal(isPrebookOpen("2026-07-16T12:00:00Z", now), false);
  assert.equal(isPrebookOpen("not-a-date", now), false);
});
