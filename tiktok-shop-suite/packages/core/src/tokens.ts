import type { Db } from "./db.js";
import { log } from "./logger.js";

/**
 * OAuth token store + refresh, shared by all three API surfaces.
 *
 * Each surface has its own token endpoint and payload shape, so a refresher
 * function is injected per surface rather than hard-coded here. This module
 * owns persistence, expiry checks, and the "refresh a little early" margin;
 * the surface-specific client owns the actual HTTP refresh call.
 */

export type Surface = "shop" | "marketing" | "content";

export interface TokenRecord {
  surface: Surface;
  accountId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  refreshExpiresAt: number | null;
}

/** Refresh this many ms before real expiry to avoid mid-request expiration. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

interface TokenRow {
  surface: string;
  account_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  refresh_expires_at: number | null;
}

export function saveToken(db: Db, rec: TokenRecord): void {
  db.prepare(
    `INSERT INTO oauth_tokens
       (surface, account_id, access_token, refresh_token, expires_at, refresh_expires_at, updated_at)
     VALUES (@surface, @accountId, @accessToken, @refreshToken, @expiresAt, @refreshExpiresAt, @updatedAt)
     ON CONFLICT(surface, account_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       refresh_expires_at = excluded.refresh_expires_at,
       updated_at = excluded.updated_at`,
  ).run({
    surface: rec.surface,
    accountId: rec.accountId,
    accessToken: rec.accessToken,
    refreshToken: rec.refreshToken,
    expiresAt: rec.expiresAt,
    refreshExpiresAt: rec.refreshExpiresAt,
    updatedAt: Date.now(),
  });
}

export function readToken(db: Db, surface: Surface, accountId: string): TokenRecord | null {
  const row = db
    .prepare(`SELECT * FROM oauth_tokens WHERE surface = ? AND account_id = ?`)
    .get(surface, accountId) as TokenRow | undefined;
  if (!row) return null;
  return {
    surface: row.surface as Surface,
    accountId: row.account_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
    refreshExpiresAt: row.refresh_expires_at,
  };
}

/** A surface-specific function that exchanges a refresh token for a new record. */
export type Refresher = (current: TokenRecord) => Promise<TokenRecord>;

/**
 * Return a valid access token, refreshing transparently when it is expired or
 * within the safety margin. Throws if no token has ever been stored (the
 * operator must complete the initial OAuth authorization first).
 */
export async function getValidAccessToken(
  db: Db,
  surface: Surface,
  accountId: string,
  refresher: Refresher,
): Promise<string> {
  const rec = readToken(db, surface, accountId);
  if (!rec) {
    throw new Error(
      `No ${surface} token for account ${accountId}. Complete OAuth authorization first (see docs/SETUP.md).`,
    );
  }
  if (Date.now() < rec.expiresAt - EXPIRY_MARGIN_MS) {
    return rec.accessToken;
  }
  if (!rec.refreshToken) {
    throw new Error(`${surface} token for ${accountId} expired and no refresh token is available.`);
  }
  log.info("refreshing token", { surface, accountId });
  const next = await refresher(rec);
  saveToken(db, next);
  return next.accessToken;
}
