/**
 * Kiểm tra đầu-cuối: gọi thật ra Gemini qua đúng đường mà MCP tool dùng.
 * Khác với mcp:smoke (chỉ kiểm tra giao thức), lệnh này CẦN GEMINI_API_KEY.
 *
 * Chạy: npm run mcp:verify
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(repoRoot, ".env.local"), quiet: true });
dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });

const { detectAiContent } = await import("../src/core/detector.js");

const SAMPLE =
  "Trong bối cảnh chuyển đổi số đang diễn ra mạnh mẽ, việc ứng dụng trí tuệ nhân tạo " +
  "đóng vai trò then chốt, không chỉ nâng cao hiệu quả mà còn mở ra những cơ hội to lớn " +
  "cho toàn bộ hệ sinh thái.";

function maskedKeyInfo(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "KHÔNG TÌM THẤY";
  return `${key.slice(0, 4)}…${key.slice(-4)} (dài ${key.length} ký tự)`;
}

async function main() {
  console.log("Kiểm tra kết nối Gemini");
  console.log(`  Nguồn key : .env.local trong ${repoRoot}`);
  console.log(`  Key       : ${maskedKeyInfo()}`);

  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "\nChưa có GEMINI_API_KEY.\n" +
        "Tạo file .env.local trong thư mục repo với đúng một dòng:\n" +
        "  GEMINI_API_KEY=<key của bạn>\n"
    );
    // Đặt mã thoát thay vì process.exit(): trên Windows, exit() lúc các handle
    // đang đóng dở làm libuv báo "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)".
    process.exitCode = 1;
    return;
  }

  console.log("\nĐang gọi detect_ai_content với một đoạn văn mẫu...\n");

  const started = Date.now();
  const { result, sources } = await detectAiContent(SAMPLE);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`  Điểm AI     : ${result.aiScore}/100`);
  console.log(`  Kết luận    : ${result.isAi ? "do AI viết" : "do người viết"}`);
  console.log(`  Số câu bóc  : ${result.segments?.length ?? 0}`);
  console.log(`  Nguồn tìm   : ${sources.length}`);
  console.log(`  Thời gian   : ${seconds}s`);
  console.log(`\n  Lý giải: ${result.reasoning}`);

  console.log("\nOK — key hợp lệ, đường gọi Gemini chạy thông. MCP server dùng được.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nLỖI: ${message}\n`);

  if (/API key|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED|401|403/i.test(message)) {
    console.error(
      "Key bị từ chối. Kiểm tra:\n" +
        "  1. Key lấy từ https://aistudio.google.com/apikey và bắt đầu bằng 'AIza'.\n" +
        "  2. File .env.local chỉ có đúng dòng GEMINI_API_KEY=..., không có dấu nháy thừa.\n" +
        "  3. File lưu dạng ASCII/UTF-8 không BOM (PowerShell: Set-Content -Encoding ascii).\n"
    );
  } else if (/quota|RESOURCE_EXHAUSTED|429/i.test(message)) {
    console.error("Hết hạn mức. Đợi ít phút rồi thử lại, hoặc kiểm tra quota trong AI Studio.\n");
  } else if (/parse được JSON|JSON at position/i.test(message)) {
    console.error(
      "Mô hình trả về JSON không hợp lệ. Đây là lỗi ngẫu nhiên — chạy lại thường là được.\n" +
        "Nếu lặp lại nhiều lần, thử đổi model: GEMINI_MODEL=gemini-2.5-pro npm run mcp:verify\n"
    );
  }

  // Không dùng process.exit(): xem ghi chú về libuv ở trên.
  process.exitCode = 1;
});
