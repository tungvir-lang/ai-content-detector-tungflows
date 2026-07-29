/**
 * Smoke test cho MCP server: bắt tay giao thức, liệt kê tool, và kiểm tra
 * validation đầu vào. KHÔNG cần GEMINI_API_KEY — không gọi ra Gemini.
 *
 * Chạy: npm run mcp:smoke
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { extractFirstJsonBlock, parseJson } from "../src/core/detector.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED_TOOLS = [
  "detect_ai_content",
  "trace_content_source",
  "analyze_writing_style",
  "humanize_text",
  "batch_detect_ai",
];

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * Bộ phân tích JSON là chỗ hỏng ngoài dự tính: mô hình thỉnh thoảng viết thêm chữ
 * sau khối JSON, và lỗi chỉ lộ ra giữa lúc đang dùng thật. Các ca dưới đây bám sát
 * những gì Gemini đã thực sự trả về.
 */
function testJsonParsing() {
  console.log('\nBộ phân tích JSON:');

  check('JSON thuần', parseJson<{ a: number }>('{"a":1}').a === 1);

  check(
    'JSON bọc trong ```json',
    parseJson<{ a: number }>('```json\n{"a":1}\n```').a === 1
  );

  check(
    'JSON kèm chữ thừa phía sau',
    parseJson<{ aiScore: number }>(
      '{"aiScore":75}\n\nHy vọng phân tích trên hữu ích cho bạn!'
    ).aiScore === 75
  );

  check(
    'chữ thừa có chứa dấu ngoặc',
    parseJson<{ aiScore: number }>(
      '{"aiScore":75}\nGhi chú: xem mục {tham khảo} bên dưới.'
    ).aiScore === 75
  );

  check(
    'hai khối JSON liền nhau — lấy khối đầu',
    parseJson<{ a: number }>('{"a":1}\n{"b":2}').a === 1
  );

  check(
    'ngoặc nằm trong chuỗi ký tự không bị đếm',
    parseJson<{ reasoning: string }>(
      '{"reasoning":"Câu này có dấu } và { bên trong"}\ntrailing'
    ).reasoning.includes('}')
  );

  check('mảng ở ngoài cùng', parseJson<number[]>('[1,2,3]\nxong').length === 3);

  check('JSON bị cắt cụt -> null', extractFirstJsonBlock('{"a":1') === null);

  let threw = false;
  try {
    parseJson('không có json ở đây');
  } catch {
    threw = true;
  }
  check('chuỗi không phải JSON -> ném lỗi', threw);
}

async function main() {
  testJsonParsing();

  console.log('\nMCP server:');

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "tsx", path.join(repoRoot, "mcp/server.ts")],
    cwd: repoRoot,
  });

  const client = new Client({ name: "smoke-test", version: "1.0.0" });

  console.log("Kết nối tới MCP server...");
  await client.connect(transport);
  check("bắt tay giao thức MCP", true);

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  check(
    `liệt kê đủ ${EXPECTED_TOOLS.length} tool`,
    EXPECTED_TOOLS.every((n) => names.includes(n)),
    `nhận được: ${names.join(", ")}`
  );

  for (const tool of tools) {
    check(
      `tool "${tool.name}" có mô tả và schema`,
      Boolean(tool.description) && tool.inputSchema?.type === "object"
    );
  }

  // Tham số sai phải trả về isError chứ không được làm sập server.
  const missingArg = await client.callTool({ name: "detect_ai_content", arguments: {} });
  check("thiếu tham số bắt buộc -> isError", missingArg.isError === true);

  const badBatch = await client.callTool({
    name: "batch_detect_ai",
    arguments: { texts: [] },
  });
  check("batch rỗng -> isError", badBatch.isError === true);

  const unknown = await client.callTool({ name: "khong_ton_tai", arguments: {} });
  check("tool không tồn tại -> isError", unknown.isError === true);

  // Server vẫn sống sau các lỗi trên.
  const after = await client.listTools();
  check("server còn hoạt động sau lỗi", after.tools.length === EXPECTED_TOOLS.length);

  await client.close();

  console.log(failures === 0 ? "\nOK — tất cả kiểm tra đều đạt." : `\nFAIL — ${failures} lỗi.`);
  // Đặt mã thoát thay vì process.exit(): trên Windows, exit() lúc tiến trình con
  // stdio đang đóng dở làm libuv báo "Assertion failed: UV_HANDLE_CLOSING".
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("Smoke test lỗi:", error);
  process.exitCode = 1;
});
