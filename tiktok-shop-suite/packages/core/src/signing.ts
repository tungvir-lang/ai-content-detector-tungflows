import { createHmac } from "node:crypto";

/**
 * Request signing for the TikTok Shop Partner API.
 *
 * TikTok Shop signs every call with HMAC-SHA256 over a canonical string built
 * from the request path, the query parameters, and (for JSON requests) the raw
 * body. The algorithm, per the official docs:
 *
 *   1. Collect all query params EXCEPT `sign` and `access_token`.
 *   2. Sort them by key in alphabetical order.
 *   3. Concatenate each as `key + value` with no separators.
 *   4. Prepend the request path: `{path}{concatenated}`.
 *   5. For non-multipart requests, append the raw request body.
 *   6. Wrap the whole string with the app secret on both ends:
 *        `{app_secret}{string}{app_secret}`.
 *   7. HMAC-SHA256 with the app secret as key; hex-encode the digest.
 *
 * Getting any step wrong yields a 36xxxx signature error from the gateway, so
 * this is deliberately isolated and unit-testable.
 */
export interface SignInput {
  appSecret: string;
  path: string;
  query: Record<string, string | number | undefined>;
  /** Raw JSON body string, or undefined for GET/multipart requests. */
  body?: string;
}

export function signShopRequest(input: SignInput): string {
  const { appSecret, path, query, body } = input;

  const keys = Object.keys(query)
    .filter((k) => k !== "sign" && k !== "access_token")
    .filter((k) => query[k] !== undefined)
    .sort();

  let base = path;
  for (const k of keys) {
    base += `${k}${query[k]}`;
  }
  if (body !== undefined && body.length > 0) {
    base += body;
  }

  const wrapped = `${appSecret}${base}${appSecret}`;
  return createHmac("sha256", appSecret).update(wrapped).digest("hex");
}
