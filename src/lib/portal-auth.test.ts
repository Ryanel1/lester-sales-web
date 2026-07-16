import assert from "node:assert/strict";
import test from "node:test";
import { createPortalSessionToken, passwordMatches, safeReturnPath, verifyPortalSessionToken } from "./portal-auth";

const secret = "test-secret-that-is-long-enough-for-session-signing";

test("password comparison and signed sessions reject invalid input", async () => {
  assert.equal(await passwordMatches("champ1", "champ1", secret), true);
  assert.equal(await passwordMatches("wrong", "champ1", secret), false);
  const now = Date.parse("2026-07-16T12:00:00Z");
  const token = await createPortalSessionToken(secret, now);
  assert.equal(await verifyPortalSessionToken(token, secret, now + 1_000), true);
  assert.equal(await verifyPortalSessionToken(`${token}bad`, secret, now + 1_000), false);
  assert.equal(await verifyPortalSessionToken(token, secret, now + 43_200_000), false);
});

test("return paths stay on the portal", () => {
  assert.equal(safeReturnPath("/brands/champion?season=2026"), "/brands/champion?season=2026");
  assert.equal(safeReturnPath("//competitor.example"), "/");
  assert.equal(safeReturnPath("https://competitor.example"), "/");
  assert.equal(safeReturnPath("/api/admin/catalogs"), "/");
});
