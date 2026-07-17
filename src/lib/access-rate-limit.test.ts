import assert from "node:assert/strict";
import test from "node:test";
import { clearFailedAccess, isAccessBlocked, recordFailedAccess } from "./access-rate-limit";

test("shared-password attempts block briefly after repeated failures", () => {
  const key = "test-client"; clearFailedAccess(key);
  for (let index = 0; index < 8; index += 1) recordFailedAccess(key, 1_000);
  assert.equal(isAccessBlocked(key, 2_000), true);
  assert.equal(isAccessBlocked(key, 700_000), false);
});
