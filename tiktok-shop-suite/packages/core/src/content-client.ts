import type { ContentConfig } from "./config.js";
import type { Db } from "./db.js";
import { requestJson } from "./http.js";
import { getValidAccessToken, saveToken, type TokenRecord } from "./tokens.js";
import { log } from "./logger.js";

/**
 * Base client for the TikTok Content Posting API (open.tiktokapis.com/v2).
 *
 * Standard OAuth 2.0 Bearer auth with a refresh-token flow. Used by the
 * scheduler to publish Shop-tagged videos on the seller's own account.
 */

interface ContentTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
}

export class ContentClient {
  constructor(
    private readonly cfg: ContentConfig,
    private readonly db: Db,
    /** open_id of the authorized TikTok account. */
    private readonly accountId: string,
  ) {}

  private refresher = async (current: TokenRecord): Promise<TokenRecord> => {
    const url = `${this.cfg.baseUrl}/oauth/token/`;
    const form = new URLSearchParams({
      client_key: this.cfg.clientKey,
      client_secret: this.cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: current.refreshToken ?? "",
    });
    const res = await requestJson<ContentTokenResponse>(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const now = Date.now();
    return {
      surface: "content",
      accountId: current.accountId,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt: now + res.expires_in * 1000,
      refreshExpiresAt: now + res.refresh_expires_in * 1000,
    };
  };

  seedToken(rec: Omit<TokenRecord, "surface" | "accountId">): void {
    saveToken(this.db, { surface: "content", accountId: this.accountId, ...rec });
  }

  private async token(): Promise<string> {
    return getValidAccessToken(this.db, "content", this.accountId, this.refresher);
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.cfg.baseUrl}${path}`;
    const res = await requestJson<T>(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${await this.token()}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(body),
    });
    log.debug("content api call", { path });
    return res;
  }

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const search = new URLSearchParams(params);
    const url = `${this.cfg.baseUrl}${path}?${search.toString()}`;
    return requestJson<T>(url, {
      headers: { authorization: `Bearer ${await this.token()}` },
    });
  }
}
