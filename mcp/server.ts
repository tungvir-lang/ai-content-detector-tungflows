#!/usr/bin/env node
/**
 * MCP server cho AI Content Detector VN.
 *
 * Đây là "cổng kết nối": Google Antigravity (và mọi MCP client khác — Claude Code,
 * Cursor, Windsurf, VS Code) nối vào server này qua stdio và gọi được 5 tool AI
 * bên dưới như tool nội bộ của agent.
 *
 * Chạy thử:  npm run mcp
 * Kiểm tra:  npm run mcp:inspect
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import {
  analyzeWritingStyle,
  batchDetect,
  detectAiContent,
  humanizeText,
  traceContentSource,
  DEFAULT_MODEL,
} from "../src/core/detector.js";

// Antigravity khởi động server ở cwd tuỳ ý, nên nạp .env theo đường dẫn tuyệt đối
// của repo. Biến môi trường do client truyền vào luôn được ưu tiên (dotenv không ghi đè).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(repoRoot, ".env.local"), quiet: true });
dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });

const MAX_TEXT_LENGTH = 20000;
const MAX_BATCH_ITEMS = 20;

const TOOLS: Tool[] = [
  {
    name: "detect_ai_content",
    description:
      "Chấm điểm khả năng một đoạn văn bản do AI viết (0-100), kèm lý giải và phân tích từng câu. Dùng khi cần kiểm tra bài viết, bản tin, bài PR trước khi xuất bản.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Văn bản cần kiểm tra (tối đa 20.000 ký tự).",
        },
        model: {
          type: "string",
          description: `Model Gemini dùng để phân tích. Mặc định ${DEFAULT_MODEL}.`,
        },
      },
      required: ["text"],
    },
  },
  {
    name: "trace_content_source",
    description:
      "Truy nguyên nguồn gốc nội dung bằng Google Search grounding: nội dung đã đăng ở đâu chưa, mức độ trùng khớp, cảnh báo tin sai lệch. Dùng cho kiểm chứng bài báo và chống đạo văn.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Đoạn nội dung cần truy nguyên." },
        model: { type: "string", description: "Model Gemini (tuỳ chọn)." },
      },
      required: ["text"],
    },
  },
  {
    name: "analyze_writing_style",
    description:
      "Báo cáo văn phong tiếng Việt: giọng văn, độ dễ đọc, các cụm sáo rỗng / 'AI-ese' cần sửa, và điểm mạnh đang có. Dùng khi biên tập bài trước khi đăng.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Văn bản cần phân tích văn phong." },
        model: { type: "string", description: "Model Gemini (tuỳ chọn)." },
      },
      required: ["text"],
    },
  },
  {
    name: "humanize_text",
    description:
      "Viết lại văn bản cho tự nhiên như người viết, giữ nguyên tuyệt đối mọi dữ kiện, số liệu, tên riêng. Trả kèm danh sách thay đổi và điểm AI ước lượng sau khi sửa.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Văn bản cần viết lại." },
        tone: {
          type: "string",
          description:
            "Giọng văn mong muốn, ví dụ 'báo chí trang trọng', 'gần gũi với bệnh nhân'. Mặc định: báo chí, gần gũi, tôn trọng người đọc.",
        },
        model: { type: "string", description: "Model Gemini (tuỳ chọn)." },
      },
      required: ["text"],
    },
  },
  {
    name: "batch_detect_ai",
    description:
      "Chấm điểm AI cho nhiều văn bản một lượt (tối đa 20), trả về điểm từng mục, điểm trung bình và số bài bị đánh giá là AI. Dùng khi rà soát cả loạt bài.",
    inputSchema: {
      type: "object",
      properties: {
        texts: {
          type: "array",
          items: { type: "string" },
          description: "Danh sách văn bản cần chấm (tối đa 20 mục).",
        },
        model: { type: "string", description: "Model Gemini (tuỳ chọn)." },
      },
      required: ["texts"],
    },
  },
];

function requireText(args: Record<string, unknown>, field = "text"): string {
  const value = args?.[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Tham số "${field}" là bắt buộc và phải là chuỗi không rỗng.`);
  }
  if (value.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `Tham số "${field}" dài ${value.length} ký tự, vượt giới hạn ${MAX_TEXT_LENGTH}.`
    );
  }
  return value;
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

async function dispatch(name: string, args: Record<string, unknown>) {
  const model = typeof args?.model === "string" ? args.model : undefined;

  switch (name) {
    case "detect_ai_content": {
      const { result, sources } = await detectAiContent(requireText(args), { model });
      return json({ ...result, sources });
    }

    case "trace_content_source":
      return json(await traceContentSource(requireText(args), { model }));

    case "analyze_writing_style":
      return json(await analyzeWritingStyle(requireText(args), { model }));

    case "humanize_text":
      return json(
        await humanizeText(requireText(args), {
          model,
          tone: typeof args?.tone === "string" ? args.tone : undefined,
        })
      );

    case "batch_detect_ai": {
      const texts = args?.texts;
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Tham số "texts" phải là mảng có ít nhất 1 phần tử.');
      }
      if (texts.length > MAX_BATCH_ITEMS) {
        throw new Error(`Tối đa ${MAX_BATCH_ITEMS} văn bản mỗi lần gọi.`);
      }
      texts.forEach((t, i) => {
        if (typeof t !== "string" || !t.trim()) {
          throw new Error(`texts[${i}] phải là chuỗi không rỗng.`);
        }
      });
      return json(await batchDetect(texts as string[], { model }));
    }

    default:
      throw new Error(`Tool không tồn tại: ${name}`);
  }
}

const server = new Server(
  { name: "ai-content-detector-vn", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await dispatch(name, (args ?? {}) as Record<string, unknown>);
  } catch (error) {
    // Lỗi trả về cho agent thay vì làm sập server, để agent tự sửa tham số và gọi lại.
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Lỗi khi chạy tool "${name}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
});

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    // stderr, không phải stdout — stdout là kênh giao thức MCP.
    console.error(
      "[ai-content-detector-vn] Cảnh báo: chưa có GEMINI_API_KEY, mọi tool sẽ báo lỗi khi gọi."
    );
  }

  await server.connect(new StdioServerTransport());
  console.error("[ai-content-detector-vn] MCP server đã sẵn sàng trên stdio.");
}

main().catch((error) => {
  console.error("[ai-content-detector-vn] Không khởi động được:", error);
  process.exit(1);
});
