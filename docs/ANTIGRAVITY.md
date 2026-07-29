# Kết nối vào Google Antigravity

Repo này phơi các khả năng phân tích nội dung ra ngoài dưới dạng **MCP server**. Antigravity nối vào server đó và agent trong Antigravity gọi được 6 tool AI như tool nội bộ của nó.

Cùng một server này chạy được với mọi MCP client khác (Claude Code, Cursor, Windsurf, VS Code) — chỉ khác chỗ đặt file cấu hình.

## 0. Cài nhanh trên Windows (khuyên dùng)

Nếu anh đang cài trên một máy Windows mới, script này làm hết mục 1 và 2 bên dưới. Mở PowerShell:

```powershell
git clone https://github.com/tungvir-lang/ai-content-detector-tungflows.git $HOME\ai-content-detector-tungflows
powershell -ExecutionPolicy Bypass -File $HOME\ai-content-detector-tungflows\scripts\setup-windows.ps1
```

Script tự kiểm tra Node/Git, cài dependencies, hỏi API key (không hiện lên màn hình khi gõ), ghép cấu hình vào `mcp_config.json` mà **không xoá các server MCP khác**, rồi gọi thật ra Gemini để xác nhận. Chạy lại nhiều lần được.

Đặt mã nguồn ở chỗ khác: thêm `-InstallDir D:\code\detector`.

Việc duy nhất phải làm tay sau đó: mở Antigravity IDE → **Manage MCP Servers** → **Refresh**.

Muốn hiểu từng bước hoặc đang dùng macOS/Linux thì đọc tiếp bên dưới.

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

Kiểm tra key gọi được thật ra Gemini:

```bash
npm run mcp:verify
```

Lệnh này gọi `detect_ai_content` với một đoạn văn mẫu và in điểm AI. Ra được điểm nghĩa là key hợp lệ và MCP server dùng được. Key được che khi in ra màn hình.

**Định dạng key:** API key của Gemini bắt đầu bằng `AIza`. Chuỗi bắt đầu bằng `AQ.` là access token OAuth, không dùng được — Gemini trả lỗi `ACCESS_TOKEN_TYPE_UNSUPPORTED`.

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

Lưu file, mở tab **Manage MCPs** và bấm **Refresh**. Server `ai-content-detector-vn` hiện lên kèm 6 tool là đã nối xong.

Nếu IDE có bảng **MCP Tools** dạng Allow/Deny, thêm `ai-content-detector-vn` vào đó ở chế độ **Allow** để agent được phép gọi.

## 3. Các tool được phơi ra

| Tool | Việc nó làm | Tham số |
| --- | --- | --- |
| `detect_ai_content` | Chấm điểm AI 0-100, lý giải, bóc tách từng câu | `text` (bắt buộc), `model` |
| `detect_from_url` | Tải bài từ link, bóc nội dung rồi chấm điểm — khỏi copy | `url` (bắt buộc), `trace`, `model` |
| `trace_content_source` | Truy nguyên nguồn gốc qua Google Search, cảnh báo tin sai lệch | `text` (bắt buộc), `model` |
| `analyze_writing_style` | Báo cáo văn phong: giọng, độ dễ đọc, cụm sáo rỗng cần sửa | `text` (bắt buộc), `model` |
| `humanize_text` | Viết lại tự nhiên, giữ nguyên tuyệt đối dữ kiện | `text` (bắt buộc), `tone`, `model` |
| `batch_detect_ai` | Chấm nhiều bài một lượt (tối đa 20), kèm điểm trung bình | `texts` (bắt buộc), `model` |

Giới hạn: mỗi văn bản tối đa 20.000 ký tự. Tham số `model` mặc định là `gemini-2.5-flash`, đổi được bằng biến môi trường `GEMINI_MODEL`.

**Riêng `detect_from_url`:** chỉ nhận `http`/`https`, tải tối đa 2 MB, quá 20 giây thì dừng, đi theo tối đa 5 lần chuyển hướng. Địa chỉ nội bộ (localhost, 10.x, 192.168.x, 169.254.x…) bị từ chối, kiểm tra ở từng chặng chuyển hướng — vì agent gọi tool này thường đang đọc nội dung do người ngoài viết, và một trang web có thể chèn chỉ dẫn ẩn để trỏ tool vào máy chủ trong mạng nội bộ. Trang dựng hoàn toàn bằng JavaScript sẽ bóc ra rất ít chữ; gặp trường hợp đó thì sao chép nội dung rồi dùng `detect_ai_content`.

## 4. Dùng thử trong Antigravity

Gõ cho agent:

> Dùng `detect_ai_content` kiểm tra file `bai-viet.md` xem có bị AI viết không, rồi `humanize_text` với tone "báo chí y tế, gần gũi với bệnh nhân" cho những đoạn bị chấm trên 70 điểm.

Agent sẽ tự đọc file, gọi tool, và trả lại bản sửa.

## 5. Debug

| Triệu chứng | Cách xử lý |
| --- | --- |
| Server không hiện trong danh sách | Kiểm tra JSON có hợp lệ không, đường dẫn tới `mcp/server.ts` có tuyệt đối không, rồi bấm Refresh. |
| Tool báo `Thiếu GEMINI_API_KEY` | Điền key vào `env` trong `mcp_config.json` hoặc vào `.env.local` của repo. |
| Lỗi 401 `ACCESS_TOKEN_TYPE_UNSUPPORTED` | Đang dùng access token (tiền tố `AQ.`) thay vì API key. Lấy key `AIza...` tại https://aistudio.google.com/apikey |
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
