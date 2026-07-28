# Kết nối vào Google Antigravity

Repo này phơi các khả năng phân tích nội dung ra ngoài dưới dạng **MCP server**. Antigravity nối vào server đó và agent trong Antigravity gọi được 5 tool AI như tool nội bộ của nó.

Cùng một server này chạy được với mọi MCP client khác (Claude Code, Cursor, Windsurf, VS Code) — chỉ khác chỗ đặt file cấu hình.

## 1. Chuẩn bị

```bash
npm install
cp .env.example .env.local     # rồi điền GEMINI_API_KEY thật
```

Lấy API key tại https://aistudio.google.com/apikey

Kiểm tra server chạy được (không cần API key):

```bash
npm run mcp:smoke
```

Kết quả mong đợi: `OK — tất cả kiểm tra đều đạt.`

## 2. Khai báo trong Antigravity

Mở Antigravity IDE → panel **MCP Store** (góc phải) → **Manage MCP Servers** → mở `mcp_config.json`. File nằm ở:

| Hệ điều hành | Đường dẫn |
| --- | --- |
| Windows | `%USERPROFILE%\.gemini\config\mcp_config.json` |
| macOS / Linux | `~/.gemini/config/mcp_config.json` |

Antigravity IDE dùng thư mục `.gemini/config/` (không phải `.antigravity/`). Nếu bản anh đang dùng để file ở chỗ khác, cứ mở qua **Manage MCP Servers** rồi để IDE tự dẫn tới đúng file.

Lưu ý: tính năng MCP nằm ở **Antigravity IDE**. App Antigravity thường (màn hình có nút *Install IDE*) chỉ có bảng **MCP Tools** dạng Allow/Deny — đó là danh sách cho phép gọi tool, không phải chỗ khai báo server.

Dán khối sau vào (mẫu có sẵn tại [`docs/mcp_config.example.json`](mcp_config.example.json)), thay đường dẫn và API key:

```json
{
  "mcpServers": {
    "ai-content-detector-vn": {
      "command": "npx",
      "args": ["-y", "tsx", "/duong/dan/toi/ai-content-detector-tungflows/mcp/server.ts"],
      "cwd": "/duong/dan/toi/ai-content-detector-tungflows",
      "env": {
        "GEMINI_API_KEY": "AIza..."
      }
    }
  }
}
```

Trên Windows dùng đường dẫn kiểu `C:\\Users\\ten\\ai-content-detector-tungflows\\mcp\\server.ts` (nhớ nhân đôi dấu `\`).

Nếu đã điền key trong `.env.local`, có thể bỏ hẳn khối `env` — server tự nạp `.env.local` theo đường dẫn tuyệt đối của repo.

Lưu file, mở tab **Manage MCPs** và bấm **Refresh**. Server `ai-content-detector-vn` hiện lên kèm 5 tool là đã nối xong.

Nếu IDE có bảng **MCP Tools** dạng Allow/Deny, thêm `ai-content-detector-vn` vào đó ở chế độ **Allow** để agent được phép gọi.

## 3. Các tool được phơi ra

| Tool | Việc nó làm | Tham số |
| --- | --- | --- |
| `detect_ai_content` | Chấm điểm AI 0-100, lý giải, bóc tách từng câu | `text` (bắt buộc), `model` |
| `trace_content_source` | Truy nguyên nguồn gốc qua Google Search, cảnh báo tin sai lệch | `text` (bắt buộc), `model` |
| `analyze_writing_style` | Báo cáo văn phong: giọng, độ dễ đọc, cụm sáo rỗng cần sửa | `text` (bắt buộc), `model` |
| `humanize_text` | Viết lại tự nhiên, giữ nguyên tuyệt đối dữ kiện | `text` (bắt buộc), `tone`, `model` |
| `batch_detect_ai` | Chấm nhiều bài một lượt (tối đa 20), kèm điểm trung bình | `texts` (bắt buộc), `model` |

Giới hạn: mỗi văn bản tối đa 20.000 ký tự. Tham số `model` mặc định là `gemini-2.5-flash`.

## 4. Dùng thử trong Antigravity

Gõ cho agent:

> Dùng `detect_ai_content` kiểm tra file `bai-viet.md` xem có bị AI viết không, rồi `humanize_text` với tone "báo chí y tế, gần gũi với bệnh nhân" cho những đoạn bị chấm trên 70 điểm.

Agent sẽ tự đọc file, gọi tool, và trả lại bản sửa.

## 5. Debug

| Triệu chứng | Cách xử lý |
| --- | --- |
| Server không hiện trong danh sách | Kiểm tra JSON có hợp lệ không, đường dẫn tới `mcp/server.ts` có tuyệt đối không, rồi bấm Refresh. |
| Tool báo `Thiếu GEMINI_API_KEY` | Điền key vào `env` trong `mcp_config.json` hoặc vào `.env.local` của repo. |
| Muốn xem log giao thức | `npm run mcp:inspect` mở MCP Inspector để gọi tool thủ công. |
| `npx tsx` chậm lần đầu | Bình thường — lần đầu npx tải `tsx`. Chạy `npm install` trước để có sẵn trong `node_modules`. |
| `npm error ENOENT ... package.json` | Đang chạy npm ở sai thư mục. `cd` vào thư mục repo rồi chạy lại. |
| Không tìm thấy `mcp_config.json` | File chỉ xuất hiện sau khi cài **Antigravity IDE**. App Antigravity thường không có file này. |

## 6. Nối vào client khác

Nội dung khối `mcpServers` giữ nguyên, chỉ đổi chỗ đặt file:

- **Claude Code**: `claude mcp add ai-content-detector-vn -- npx -y tsx /duong/dan/mcp/server.ts`
- **Cursor**: `~/.cursor/mcp.json`
- **Windsurf**: `~/.codeium/windsurf/mcp_config.json`
- **VS Code**: `.vscode/mcp.json` trong workspace
