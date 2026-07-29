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
import { extractText, extractTitle, isBlockedAddress, parseHttpUrl } from "./fetch-article.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED_TOOLS = [
  "detect_ai_content",
  "detect_from_url",
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

/**
 * Chặn địa chỉ nội bộ là hàng rào an toàn, không phải tiện ích — nó phải có kiểm
 * tra riêng. Toàn bộ ca dưới đây chạy trên hàm thuần, không chạm mạng.
 */
function testUrlGuard() {
  console.log('\nChặn địa chỉ nội bộ:');

  const blocked = [
    '127.0.0.1',
    '127.1.2.3',
    '10.0.0.1',
    '172.16.5.4',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // metadata máy chủ đám mây
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:192.168.0.1',
    '224.0.0.1',
  ];
  for (const ip of blocked) {
    check(`chặn ${ip}`, isBlockedAddress(ip) === true);
  }

  const allowed = ['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.169.0.1', '2606:4700::1'];
  for (const ip of allowed) {
    check(`cho qua ${ip}`, isBlockedAddress(ip) === false);
  }

  let rejectedScheme = false;
  try {
    parseHttpUrl('file:///etc/passwd');
  } catch {
    rejectedScheme = true;
  }
  check('từ chối scheme file://', rejectedScheme);

  let rejectedGarbage = false;
  try {
    parseHttpUrl('không phải url');
  } catch {
    rejectedGarbage = true;
  }
  check('từ chối chuỗi không phải URL', rejectedGarbage);

  check('chấp nhận https', parseHttpUrl('https://vnexpress.net/bai-viet').protocol === 'https:');
}

function testHtmlExtraction() {
  console.log('\nBóc nội dung HTML:');

  const html = `
    <html><head><title>Tiêu đề trang</title></head>
    <body>
      <nav>Trang chủ Liên hệ</nav>
      <script>var x = "đừng lấy cái này";</script>
      <style>.a { color: red }</style>
      <article><p>Đoạn một của bài viết.</p><p>Đoạn hai &amp; dấu &quot;nháy&quot;.</p></article>
      <footer>Bản quyền 2026</footer>
    </body></html>`;

  const text = extractText(html);
  check('lấy được nội dung trong <article>', text.includes('Đoạn một của bài viết.'));
  check('bỏ thẻ script', !text.includes('đừng lấy cái này'));
  check('bỏ thẻ style', !text.includes('color: red'));
  check('bỏ nav và footer', !text.includes('Liên hệ') && !text.includes('Bản quyền'));
  check('giải mã thực thể HTML', text.includes('&') && text.includes('"nháy"'));
  check('lấy đúng tiêu đề', extractTitle(html) === 'Tiêu đề trang');

  check(
    'og:title được ưu tiên hơn <title>',
    extractTitle(
      '<meta property="og:title" content="Tiêu đề OG"><title>Tiêu đề thường</title>'
    ) === 'Tiêu đề OG'
  );

  check(
    'không có <article> thì lấy <body>',
    extractText('<body><p>Nội dung trần trụi ở đây, đủ dài để đọc.</p></body>').includes(
      'Nội dung trần trụi'
    )
  );
}

async function main() {
  testJsonParsing();
  testUrlGuard();
  testHtmlExtraction();

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

  // Hàng rào chặn địa chỉ nội bộ phải chặn ngay ở tầng tool, trước khi gọi Gemini —
  // nên hai ca này chạy được mà không cần API key.
  const noUrl = await client.callTool({ name: "detect_from_url", arguments: {} });
  check("detect_from_url thiếu url -> isError", noUrl.isError === true);

  const localUrl = await client.callTool({
    name: "detect_from_url",
    arguments: { url: "http://127.0.0.1:8080/admin" },
  });
  check("detect_from_url chặn localhost -> isError", localUrl.isError === true);

  const badScheme = await client.callTool({
    name: "detect_from_url",
    arguments: { url: "file:///etc/passwd" },
  });
  check("detect_from_url chặn file:// -> isError", badScheme.isError === true);

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
