import type { ShopConfig } from "./config.js";
import type { Db } from "./db.js";
import { requestJson } from "./http.js";
import { signShopRequest } from "./signing.js";
import { getValidAccessToken, saveToken, type TokenRecord } from "./tokens.js";
import { log } from "./logger.js";

/**
 * Base client for the TikTok Shop Partner API (open-api.tiktokglobalshop.com).
 *
 * Handles the two things every Shop call needs: a fresh access token, and a
 * valid HMAC signature over path + sorted query + body. Higher-level modules
 * (affiliate) build on top of `call`.
 */

export interface ShopEnvelope<T> {
  code: number;
  message: string;
  request_id: string;
  data: T;
}

interface ShopTokenResponse {
  data: {
    access_token: string;
    access_token_expire_in: number;
    refresh_token: string;
    refresh_token_expire_in: number;
  };
}

export class ShopClient {
  constructor(
    private readonly cfg: ShopConfig,
    private readonly db: Db,
    /** Seller/shop account id used as the token store key. */
    private readonly accountId: string,
  ) {}

  private refresher = async (current: TokenRecord): Promise<TokenRecord> => {
    const url =
      `https://auth.tiktok-shops.com/api/v2/token/refresh` +
      `?app_key=${encodeURIComponent(this.cfg.appKey)}` +
      `&app_secret=${encodeURIComponent(this.cfg.appSecret)}` +
      `&refresh_token=${encodeURIComponent(current.refreshToken ?? "")}` +
      `&grant_type=refresh_token`;
    const res = await requestJson<ShopTokenResponse>(url);
    const now = Date.now();
    return {
      surface: "shop",
      accountId: current.accountId,
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresAt: now + res.data.access_token_expire_in * 1000,
      refreshExpiresAt: now + res.data.refresh_token_expire_in * 1000,
    };
  };

  /** Persist the tokens obtained from the initial OAuth authorization. */
  seedToken(rec: Omit<TokenRecord, "surface" | "accountId">): void {
    saveToken(this.db, { surface: "shop", accountId: this.accountId, ...rec });
  }

  /**
   * Make a signed Shop API call.
   *
   * @param method  HTTP method.
   * @param path    API path, e.g. "/affiliate_creator/202405/open_collaborations".
   * @param query   Additional query params (shop_cipher/timestamp/app_key are added here).
   * @param body    Optional JSON-serializable body.
   */
  async call<T>(
    method: string,
    path: string,
    query: Record<string, string | number | undefined> = {},
    body?: unknown,
  ): Promise<T> {
    const accessToken = await getValidAccessToken(this.db, "shop", this.accountId, this.refresher);
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyStr = body === undefined ? undefined : JSON.stringify(body);

    const signedQuery: Record<string, string | number | undefined> = {
      app_key: this.cfg.appKey,
      shop_cipher: this.cfg.shopCipher,
      timestamp,
      ...query,
    };

    const sign = signShopRequest({
      appSecret: this.cfg.appSecret,
      path,
      query: signedQuery,
      body: bodyStr,
    });

    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(signedQuery)) {
      if (v !== undefined) search.set(k, String(v));
    }
    search.set("sign", sign);

    const url = `${this.cfg.baseUrl}${path}?${search.toString()}`;
    const res = await requestJson<ShopEnvelope<T>>(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-tts-access-token": accessToken,
      },
      body: bodyStr,
    });

    if (res.code !== 0) {
      log.error("shop api error", { path, code: res.code, message: res.message });
      throw new Error(`Shop API ${path} failed [${res.code}]: ${res.message}`);
    }
    return res.data;
  }
}
