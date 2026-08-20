import { log } from "./logger.js";

/**
 * Thin HTTP layer over global fetch with:
 *   - automatic retry on 429 / 5xx with exponential backoff + jitter,
 *   - Retry-After header respect,
 *   - a request timeout,
 *   - JSON parse + typed error surfacing.
 *
 * All three TikTok clients funnel through here so rate-limit handling and
 * logging live in exactly one place.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(`HTTP ${status} for ${url}: ${body.slice(0, 500)}`);
    this.name = "HttpError";
  }
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  /** Raw body string (already serialized). */
  body?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (!Number.isNaN(secs)) return secs * 1000;
  }
  const base = Math.min(1000 * 2 ** attempt, 16000);
  return base + Math.floor(Math.random() * 250);
}

export async function requestJson<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    timeoutMs = 30000,
    maxRetries = 4,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      const text = await res.text();

      if (RETRYABLE.has(res.status) && attempt < maxRetries) {
        const delay = backoffDelay(attempt, res.headers.get("retry-after"));
        log.warn("http retry", { url, status: res.status, attempt, delay });
        await sleep(delay);
        continue;
      }
      if (!res.ok) {
        throw new HttpError(res.status, url, text);
      }
      return (text ? JSON.parse(text) : {}) as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof HttpError) throw err;
      // Network error / abort: retry if attempts remain.
      if (attempt < maxRetries) {
        const delay = backoffDelay(attempt);
        log.warn("http network retry", { url, attempt, delay, error: String(err) });
        await sleep(delay);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Request failed: ${url}`);
}
