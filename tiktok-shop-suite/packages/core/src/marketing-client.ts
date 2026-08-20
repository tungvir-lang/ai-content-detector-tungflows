import type { MarketingConfig } from "./config.js";
import type { Db } from "./db.js";
import { requestJson } from "./http.js";
import { readToken, saveToken, type TokenRecord } from "./tokens.js";
import { log } from "./logger.js";

/**
 * Base client for the TikTok Marketing API (business-api.tiktok.com).
 *
 * Auth here is a long-lived `Access-Token` header rather than a signed request.
 * The token is obtained once via the oauth2 auth-code flow and stored; the
 * Marketing API does not issue short-lived tokens the way the Shop/Content
 * surfaces do, so there is no periodic refresh — we simply read the stored one.
 */

export interface MarketingEnvelope<T> {
  code: number;
  message: string;
  request_id: string;
  data: T;
}

export class MarketingClient {
  constructor(
    private readonly cfg: MarketingConfig,
    private readonly db: Db,
  ) {}

  /** Persist the access token obtained from the oauth2 authorization. */
  seedToken(accessToken: string): void {
    const rec: TokenRecord = {
      surface: "marketing",
      accountId: this.cfg.advertiserId,
      accessToken,
      refreshToken: null,
      // Marketing tokens are long-lived; store a far-future expiry.
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      refreshExpiresAt: null,
    };
    saveToken(this.db, rec);
  }

  private accessToken(): string {
    const rec = readToken(this.db, "marketing", this.cfg.advertiserId);
    if (!rec) {
      throw new Error(
        `No marketing token for advertiser ${this.cfg.advertiserId}. Complete oauth2 authorization first (see docs/SETUP.md).`,
      );
    }
    return rec.accessToken;
  }

  async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      search.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
    const url = `${this.cfg.baseUrl}${path}?${search.toString()}`;
    return this.unwrap<T>(path, await requestJson<MarketingEnvelope<T>>(url, {
      headers: { "Access-Token": this.accessToken() },
    }));
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.cfg.baseUrl}${path}`;
    return this.unwrap<T>(path, await requestJson<MarketingEnvelope<T>>(url, {
      method: "POST",
      headers: {
        "Access-Token": this.accessToken(),
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }));
  }

  private unwrap<T>(path: string, res: MarketingEnvelope<T>): T {
    if (res.code !== 0) {
      log.error("marketing api error", { path, code: res.code, message: res.message });
      throw new Error(`Marketing API ${path} failed [${res.code}]: ${res.message}`);
    }
    return res.data;
  }

  get advertiserId(): string {
    return this.cfg.advertiserId;
  }
}
