import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, Source } from "../types";

/**
 * Lõi phân tích dùng chung cho cả web app (Vite) và MCP server (Node).
 * Không import bất cứ thứ gì thuộc về DOM hay React để chạy được ở cả hai môi trường.
 */

export const DEFAULT_MODEL = "gemini-2.5-flash";

export interface CoreOptions {
  apiKey?: string;
  model?: string;
}

export interface StyleIssue {
  phrase: string;
  category: "ai-ese" | "sao-rong" | "lap-tu" | "cau-truc" | "khac";
  suggestion: string;
}

export interface StyleReport {
  toneSummary: string;
  readabilityScore: number;
  issues: StyleIssue[];
  strengths: string[];
}

export interface HumanizeResult {
  rewritten: string;
  changes: { before: string; after: string; why: string }[];
  estimatedAiScoreAfter: number;
}

function envApiKey(): string | undefined {
  // Trong trình duyệt, Vite thay thẳng `process.env.GEMINI_API_KEY` bằng chuỗi lúc build
  // (xem vite.config.ts). Trong Node thì đọc biến môi trường thật. try/catch để phòng
  // trường hợp chạy trên trình duyệt mà define chưa được áp dụng.
  try {
    return process.env.GEMINI_API_KEY;
  } catch {
    return undefined;
  }
}

function resolveApiKey(explicit?: string): string {
  const key = explicit || envApiKey();
  if (!key) {
    throw new Error(
      "Thiếu GEMINI_API_KEY. Đặt biến môi trường GEMINI_API_KEY hoặc truyền apiKey vào hàm."
    );
  }
  return key;
}

function client(options: CoreOptions = {}) {
  return new GoogleGenAI({ apiKey: resolveApiKey(options.apiKey) });
}

/** Gemini hay bọc JSON trong ```json ... ```; bóc ra rồi parse. */
function parseJson<T>(raw: string): T {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    // Fallback: lấy khối JSON đầu tiên nằm trong chuỗi trả về.
    const start = clean.search(/[[{]/);
    const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Không parse được JSON từ mô hình: ${clean.slice(0, 300)}`);
    }
    return JSON.parse(clean.slice(start, end + 1)) as T;
  }
}

function extractSources(response: any): Source[] {
  const sources: Source[] = [];
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return sources;

  for (const chunk of chunks) {
    if (!chunk?.web?.uri) continue;
    if (sources.some((s) => s.url === chunk.web.uri)) continue;
    sources.push({
      title: chunk.web.title || "Nguồn tham khảo",
      url: chunk.web.uri,
      snippet: chunk.web.snippet,
    });
  }
  return sources;
}

async function generate(
  prompt: string,
  options: CoreOptions & { grounded?: boolean }
): Promise<{ text: string; sources: Source[] }> {
  const response = await client(options).models.generateContent({
    model: options.model || DEFAULT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: options.grounded ? { tools: [{ googleSearch: {} }] } : {},
  });

  const text = response.text;
  if (!text) throw new Error("Mô hình không trả về nội dung.");
  return { text, sources: extractSources(response) };
}

/** Tool 1 — chấm điểm khả năng văn bản do AI viết. */
export async function detectAiContent(
  text: string,
  options: CoreOptions = {}
): Promise<{ result: AnalysisResult; sources: Source[] }> {
  const prompt = `
Analyze the following text to determine if it was written by an AI or a Human.

Text to analyze:
"${text}"

You MUST return a valid JSON object. Do not include any markdown formatting, backticks, or explanations outside the JSON.
The JSON object must have the following structure:
{
  "aiScore": number (0-100, where 100 is definitely AI),
  "isAi": boolean (true if score > 50),
  "reasoning": string (explanation in Vietnamese of why it seems like AI or Human, citing specific patterns like perplexity, burstiness, repetition, or lack of nuance),
  "segments": [
    {
      "text": string (the specific sentence or phrase),
      "isAi": boolean (true if this specific part sounds like AI),
      "reason": string (short reason in Vietnamese for this segment)
    }
  ]
}

IMPORTANT:
1. Be critical. Look for "AI-ese" words (e.g., "delve", "tapestry", "landscape", "crucial", "testament"; in Vietnamese: "đóng vai trò then chốt", "bức tranh toàn cảnh", "không chỉ ... mà còn").
2. Look for perfect grammar but lack of soul/idiom.
3. If the text is factual and neutral, it might be hard to tell, so be conservative.
4. Return ONLY the JSON object.
`;

  const { text: raw, sources } = await generate(prompt, { ...options, grounded: true });
  return { result: parseJson<AnalysisResult>(raw), sources };
}

/** Tool 2 — truy nguyên nguồn gốc nội dung bằng Google Search grounding. */
export async function traceContentSource(
  text: string,
  options: CoreOptions = {}
): Promise<{ verdict: string; sources: Source[] }> {
  const prompt = `
Bạn là chuyên gia kiểm chứng thông tin (fact-checking) cho toà soạn báo Việt Nam.
Hãy dùng Google Search để truy nguyên nguồn gốc của đoạn nội dung sau.

Nội dung:
"${text}"

Trả lời bằng tiếng Việt, ngắn gọn, theo đúng các mục sau:
- Kết luận: nội dung này đã từng xuất bản ở đâu chưa, hay là nội dung mới/không tìm thấy dấu vết.
- Mức độ trùng khớp: cao / trung bình / thấp / không tìm thấy.
- Bằng chứng: liệt kê những trang đã đăng nội dung tương tự và điểm trùng khớp cụ thể.
- Cảnh báo: nếu có dấu hiệu sai lệch, tin giả, hoặc trích dẫn sai nguồn.
Không bịa nguồn. Nếu không tìm thấy, phải nói rõ là không tìm thấy.
`;

  const { text: verdict, sources } = await generate(prompt, { ...options, grounded: true });
  return { verdict: verdict.trim(), sources };
}

/** Tool 3 — báo cáo văn phong, chỉ ra chỗ "nghe như máy viết". */
export async function analyzeWritingStyle(
  text: string,
  options: CoreOptions = {}
): Promise<StyleReport> {
  const prompt = `
Bạn là biên tập viên tiếng Việt khó tính. Phân tích văn phong của đoạn văn sau.

Đoạn văn:
"${text}"

Chỉ trả về JSON hợp lệ, không kèm markdown hay giải thích ngoài JSON:
{
  "toneSummary": string (mô tả giọng văn bằng tiếng Việt, 1-2 câu),
  "readabilityScore": number (0-100, càng cao càng dễ đọc với bạn đọc phổ thông),
  "issues": [
    {
      "phrase": string (cụm từ có vấn đề, trích nguyên văn),
      "category": "ai-ese" | "sao-rong" | "lap-tu" | "cau-truc" | "khac",
      "suggestion": string (đề xuất sửa cụ thể bằng tiếng Việt)
    }
  ],
  "strengths": [string] (những điểm đang viết tốt)
}
`;

  const { text: raw } = await generate(prompt, options);
  return parseJson<StyleReport>(raw);
}

/** Tool 4 — viết lại cho tự nhiên, giữ nguyên sự thật. */
export async function humanizeText(
  text: string,
  options: CoreOptions & { tone?: string } = {}
): Promise<HumanizeResult> {
  const tone = options.tone || "báo chí, gần gũi, tôn trọng người đọc";

  const prompt = `
Viết lại đoạn văn sau bằng tiếng Việt sao cho tự nhiên như người viết, giọng: ${tone}.

Đoạn văn gốc:
"${text}"

Quy tắc bắt buộc:
1. TUYỆT ĐỐI không thêm, bớt hay thay đổi bất kỳ dữ kiện, con số, tên riêng nào.
2. Bỏ các cụm sáo rỗng và "AI-ese"; thay bằng cách nói cụ thể.
3. Cho câu dài ngắn xen kẽ, tránh nhịp điệu đều đều.
4. Giữ nguyên độ dài xấp xỉ bản gốc.

Chỉ trả về JSON hợp lệ:
{
  "rewritten": string (bản viết lại hoàn chỉnh),
  "changes": [ { "before": string, "after": string, "why": string } ],
  "estimatedAiScoreAfter": number (0-100, ước lượng điểm AI của bản viết lại)
}
`;

  const { text: raw } = await generate(prompt, options);
  return parseJson<HumanizeResult>(raw);
}

/** Tool 5 — chấm nhiều văn bản một lượt, trả về cả bản tổng hợp. */
export async function batchDetect(
  texts: string[],
  options: CoreOptions = {}
): Promise<{
  items: { index: number; aiScore: number; isAi: boolean; reasoning: string; error?: string }[];
  averageScore: number;
  aiCount: number;
}> {
  const items = await Promise.all(
    texts.map(async (t, index) => {
      try {
        const { result } = await detectAiContent(t, options);
        return {
          index,
          aiScore: result.aiScore,
          isAi: result.isAi,
          reasoning: result.reasoning,
        };
      } catch (error) {
        return {
          index,
          aiScore: -1,
          isAi: false,
          reasoning: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  const scored = items.filter((i) => i.aiScore >= 0);
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, i) => sum + i.aiScore, 0) / scored.length)
    : 0;

  return { items, averageScore, aiCount: scored.filter((i) => i.isAi).length };
}
