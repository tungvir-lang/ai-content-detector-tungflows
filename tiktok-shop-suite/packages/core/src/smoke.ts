/**
 * Offline smoke test — verifies the signing algorithm and DB migrations
 * without any network calls or real credentials.
 *
 *   npm run smoke
 */
import { openDb, recordRun } from "./db.js";
import { signShopRequest } from "./signing.js";
import { saveToken, readToken } from "./tokens.js";
import { log } from "./logger.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`SMOKE FAIL: ${msg}`);
}

// 1. Signature is deterministic and stable for a fixed input.
const sig = signShopRequest({
  appSecret: "test_secret",
  path: "/product/202309/products/search",
  query: { app_key: "abc", timestamp: 1700000000, page_size: 10 },
  body: JSON.stringify({ page_size: 10 }),
});
assert(/^[0-9a-f]{64}$/.test(sig), "signature must be 64 hex chars");
const sig2 = signShopRequest({
  appSecret: "test_secret",
  path: "/product/202309/products/search",
  query: { timestamp: 1700000000, app_key: "abc", page_size: 10 },
  body: JSON.stringify({ page_size: 10 }),
});
assert(sig === sig2, "signature must be order-independent across query keys");

// 2. sign/access_token are excluded from the canonical string.
const sigA = signShopRequest({ appSecret: "s", path: "/p", query: { a: "1" } });
const sigB = signShopRequest({
  appSecret: "s",
  path: "/p",
  query: { a: "1", sign: "zzz", access_token: "tok" },
});
assert(sigA === sigB, "sign and access_token must be excluded from signing");

// 3. DB migrations + token round-trip.
const db = openDb(":memory:");
saveToken(db, {
  surface: "shop",
  accountId: "shop_1",
  accessToken: "at",
  refreshToken: "rt",
  expiresAt: Date.now() + 3600_000,
  refreshExpiresAt: Date.now() + 86400_000,
});
const back = readToken(db, "shop", "shop_1");
assert(back?.accessToken === "at", "token round-trip must return stored access token");

recordRun(db, { module: "smoke", action: "self_test", dryRun: true, detail: { ok: true } });
const count = db.prepare("SELECT COUNT(*) AS n FROM run_log").get() as { n: number };
assert(count.n === 1, "run_log must persist entries");

log.info("smoke passed", { signature: sig.slice(0, 12) });
process.stdout.write("SMOKE OK\n");
