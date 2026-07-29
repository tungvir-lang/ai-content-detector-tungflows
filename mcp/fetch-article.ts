/**
 * Tải và bóc nội dung bài viết từ URL.
 *
 * Module này CHỈ chạy trên Node (dùng node:dns), nên nằm ở đây chứ không ở
 * src/core — src/core phải chạy được cả trên trình duyệt.
 */

import { lookup } from "node:dns/promises";

export const MAX_BYTES = 2_000_000;
export const MAX_TEXT_LENGTH = 20_000;
export const FETCH_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;

export interface Article {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  text: string;
  truncated: boolean;
}

/* ------------------------------------------------------------------ chặn SSRF */

/**
 * Địa chỉ nội bộ, loopback, link-local và các dải đặc biệt.
 *
 * Cần thiết vì agent gọi tool này thường đang đọc nội dung do người ngoài viết.
 * Một trang web có thể chèn chỉ dẫn ẩn để agent trỏ tool vào endpoint nội bộ
 * (metadata của máy chủ đám mây, router, dịch vụ chỉ nghe trên localhost).
 */
export function isBlockedAddress(ip: string): boolean {
  const addr = ip.toLowerCase();

  // IPv6 ánh xạ IPv4: ::ffff:192.168.0.1
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedAddress(mapped[1]);

  if (addr === "::1" || addr === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(addr)) return true; // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]:/.test(addr)) return true; // fe80::/10 link-local

  const v4 = addr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!v4) return false;

  const [a, b] = [Number(v4[1]), Number(v4[2])];
  if ([a, b, Number(v4[3]), Number(v4[4])].some((n) => n > 255)) return true;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + metadata đám mây
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast + reserved

  return false;
}

export function parseHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`URL không hợp lệ: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Chỉ hỗ trợ http và https, không hỗ trợ "${url.protocol}".`);
  }
  return url;
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error(`Từ chối tải địa chỉ nội bộ: ${host}`);
  }

  // Hostname đã là địa chỉ IP thì kiểm tra thẳng, khỏi tra DNS.
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isBlockedAddress(host)) throw new Error(`Từ chối tải địa chỉ nội bộ: ${host}`);
    return;
  }

  let records;
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new Error(`Không phân giải được tên miền: ${host}`);
  }

  const blocked = records.find((r) => isBlockedAddress(r.address));
  if (blocked) {
    throw new Error(`Tên miền ${host} trỏ về địa chỉ nội bộ (${blocked.address}), đã từ chối.`);
  }
}

/* --------------------------------------------------------------- bóc nội dung */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

export function extractTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return decodeEntities(og[1]).trim();

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return decodeEntities(title[1]).replace(/\s+/g, " ").trim();

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decodeEntities(h1[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

  return "";
}

/**
 * Bóc phần chữ đọc được. Ưu tiên <article>, rồi <main>, cuối cùng mới lấy cả body —
 * để hạn chế menu, quảng cáo và chân trang lọt vào phần đem đi chấm điểm.
 */
export function extractText(html: string): string {
  let doc = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, " ");

  const article = doc.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const main = doc.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const body = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (article && article[1].length > 200) doc = article[1];
  else if (main && main[1].length > 200) doc = main[1];
  else if (body) doc = body[1];

  return decodeEntities(
    doc
      .replace(/<(p|div|br|li|h[1-6]|tr|blockquote)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/* ---------------------------------------------------------------------- tải về */

export async function fetchArticle(rawUrl: string): Promise<Article> {
  let url = parseHttpUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let response: Response | undefined;

    // Tự đi theo redirect để kiểm tra từng chặng — nếu để fetch tự làm, một trang
    // công khai vẫn có thể chuyển hướng sang địa chỉ nội bộ mà ta không thấy.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url);

      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "ai-content-detector-vn/1.0 (+MCP tool)",
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) break;
        if (hop === MAX_REDIRECTS) {
          throw new Error(`Chuyển hướng quá ${MAX_REDIRECTS} lần, đã dừng.`);
        }
        url = parseHttpUrl(new URL(location, url).toString());
        continue;
      }
      break;
    }

    if (!response) throw new Error("Không nhận được phản hồi.");
    if (!response.ok) {
      throw new Error(`Máy chủ trả về ${response.status} ${response.statusText}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      throw new Error(
        `Nội dung không phải trang web (content-type: ${contentType || "không rõ"}). ` +
          "Tool này chỉ đọc được HTML và văn bản thuần."
      );
    }

    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      throw new Error(`Trang nặng ${declared} byte, vượt giới hạn ${MAX_BYTES}.`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      throw new Error(`Trang nặng ${buffer.byteLength} byte, vượt giới hạn ${MAX_BYTES}.`);
    }

    const html = new TextDecoder("utf-8").decode(buffer);
    const isHtml = /text\/html|application\/xhtml/i.test(contentType);

    let text = isHtml ? extractText(html) : html.trim();
    const truncated = text.length > MAX_TEXT_LENGTH;
    if (truncated) text = text.slice(0, MAX_TEXT_LENGTH);

    if (text.length < 100) {
      throw new Error(
        "Bóc ra được quá ít chữ (dưới 100 ký tự). Trang có thể dựng bằng JavaScript " +
          "hoặc chặn truy cập tự động — hãy sao chép nội dung rồi dùng detect_ai_content."
      );
    }

    return {
      requestedUrl: rawUrl,
      finalUrl: url.toString(),
      title: isHtml ? extractTitle(html) : "",
      text,
      truncated,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Quá ${FETCH_TIMEOUT_MS / 1000} giây không tải xong, đã dừng.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
