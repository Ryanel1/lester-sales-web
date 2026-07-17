import assert from "node:assert/strict";
import test from "node:test";
import { accessAttemptKey, clearFailedAccess, isAccessBlocked, recordFailedAccess } from "./access-rate-limit";

test("shared-password attempts block briefly after repeated failures", () => {
  const key = "test-client"; clearFailedAccess(key);
  for (let index = 0; index < 8; index += 1) recordFailedAccess(key, 1_000);
  assert.equal(isAccessBlocked(key, 2_000), true);
  assert.equal(isAccessBlocked(key, 700_000), false);
});

test("durable attempt keys do not expose the client address", () => {
  const key = accessAttemptKey("203.0.113.42", "test-secret");
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(key.includes("203.0.113.42"), false);
  assert.equal(key, accessAttemptKey("203.0.113.42", "test-secret"));
});
