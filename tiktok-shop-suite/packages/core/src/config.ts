/**
 * Central configuration, loaded from environment variables.
 *
 * The suite talks to three distinct official TikTok API surfaces, each with
 * its own app registration and auth model:
 *
 *   1. TikTok Shop Partner API      (open-api.tiktokglobalshop.com)  — HMAC signed
 *   2. TikTok Marketing API          (business-api.tiktok.com)        — Access-Token header
 *   3. TikTok Content Posting API    (open.tiktokapis.com)            — OAuth Bearer
 *
 * Credentials are never hard-coded. Copy .env.example to .env and fill them in,
 * then load it with your process manager (or `node --env-file=.env`).
 */

export interface ShopConfig {
  appKey: string;
  appSecret: string;
  shopCipher: string;
  baseUrl: string;
  apiVersion: string;
}

export interface MarketingConfig {
  appId: string;
  appSecret: string;
  advertiserId: string;
  baseUrl: string;
}

export interface ContentConfig {
  clientKey: string;
  clientSecret: string;
  baseUrl: string;
}

export interface SuiteConfig {
  shop: ShopConfig;
  marketing: MarketingConfig;
  content: ContentConfig;
  dbPath: string;
  /**
   * When true, automation engines compute and log the action they *would*
   * take but never call the mutating endpoint. Defaults to true — mutating
   * real ad budgets or bids must be opted into explicitly.
   */
  dryRun: boolean;
  serverPort: number;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

/**
 * Build the full config. Throws if any required credential is missing, so a
 * misconfigured deployment fails loudly at startup instead of at first API call.
 */
export function loadConfig(): SuiteConfig {
  return {
    shop: {
      appKey: required("TTS_SHOP_APP_KEY"),
      appSecret: required("TTS_SHOP_APP_SECRET"),
      shopCipher: required("TTS_SHOP_CIPHER"),
      baseUrl: optional("TTS_SHOP_BASE_URL", "https://open-api.tiktokglobalshop.com"),
      apiVersion: optional("TTS_SHOP_API_VERSION", "202309"),
    },
    marketing: {
      appId: required("TTS_MARKETING_APP_ID"),
      appSecret: required("TTS_MARKETING_APP_SECRET"),
      advertiserId: required("TTS_MARKETING_ADVERTISER_ID"),
      baseUrl: optional("TTS_MARKETING_BASE_URL", "https://business-api.tiktok.com/open_api/v1.3"),
    },
    content: {
      clientKey: required("TTS_CONTENT_CLIENT_KEY"),
      clientSecret: required("TTS_CONTENT_CLIENT_SECRET"),
      baseUrl: optional("TTS_CONTENT_BASE_URL", "https://open.tiktokapis.com/v2"),
    },
    dbPath: optional("TTS_DB_PATH", "./data/tts.db"),
    dryRun: optional("TTS_DRY_RUN", "true").toLowerCase() !== "false",
    serverPort: Number(optional("TTS_SERVER_PORT", "4000")),
  };
}

/**
 * A lenient config loader for surfaces the caller only partially uses (e.g. a
 * dashboard that reads reports but never posts content). Missing credentials
 * become empty strings rather than throwing; the client that needs them will
 * still fail clearly when actually invoked.
 */
export function loadPartialConfig(): SuiteConfig {
  const g = (n: string) => process.env[n] ?? "";
  return {
    shop: {
      appKey: g("TTS_SHOP_APP_KEY"),
      appSecret: g("TTS_SHOP_APP_SECRET"),
      shopCipher: g("TTS_SHOP_CIPHER"),
      baseUrl: optional("TTS_SHOP_BASE_URL", "https://open-api.tiktokglobalshop.com"),
      apiVersion: optional("TTS_SHOP_API_VERSION", "202309"),
    },
    marketing: {
      appId: g("TTS_MARKETING_APP_ID"),
      appSecret: g("TTS_MARKETING_APP_SECRET"),
      advertiserId: g("TTS_MARKETING_ADVERTISER_ID"),
      baseUrl: optional("TTS_MARKETING_BASE_URL", "https://business-api.tiktok.com/open_api/v1.3"),
    },
    content: {
      clientKey: g("TTS_CONTENT_CLIENT_KEY"),
      clientSecret: g("TTS_CONTENT_CLIENT_SECRET"),
      baseUrl: optional("TTS_CONTENT_BASE_URL", "https://open.tiktokapis.com/v2"),
    },
    dbPath: optional("TTS_DB_PATH", "./data/tts.db"),
    dryRun: optional("TTS_DRY_RUN", "true").toLowerCase() !== "false",
    serverPort: Number(optional("TTS_SERVER_PORT", "4000")),
  };
}
