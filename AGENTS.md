# AI Content Detector VN — hướng dẫn cho AI agent

Đọc file này trước khi sửa code. Áp dụng cho Antigravity, Claude Code, Cursor và mọi agent khác làm việc trong repo.

## Dự án là gì

Ứng dụng web (Vite + React 19 + TypeScript + Tailwind 4) kiểm tra một đoạn văn bản có phải do AI viết hay không, kèm truy nguyên nguồn gốc qua Google Search grounding của Gemini.

Kèm theo là một **MCP server** để agent bên ngoài gọi được các tool phân tích này.

## Bố cục

| Đường dẫn | Vai trò |
| --- | --- |
| `src/core/detector.ts` | Lõi phân tích. Toàn bộ prompt và logic Gemini nằm ở đây. |
| `src/services/gemini.ts` | Lớp mỏng cho web app, gọi lại `src/core`. |
| `src/components/` | UI React. |
| `mcp/server.ts` | MCP server (stdio) phơi 5 tool ra ngoài. |
| `mcp/smoke-test.ts` | Kiểm tra giao thức MCP, không cần API key. |
| `docs/ANTIGRAVITY.md` | Cách nối repo này vào Antigravity. |

## Quy tắc bắt buộc

1. **Không nhân bản prompt.** Mọi logic phân tích mới phải viết trong `src/core/detector.ts` rồi mới phơi ra ở `mcp/server.ts` và UI. Không viết prompt trực tiếp trong component.
2. **`src/core/` phải chạy được ở cả trình duyệt và Node.** Không import `node:fs`, `node:path`, hay bất cứ API DOM nào trong thư mục này.
3. **Không log ra stdout trong `mcp/`.** stdout là kênh giao thức MCP; log phải dùng `console.error`.
4. **Không commit API key.** `GEMINI_API_KEY` nạp từ `.env.local` (đã có trong `.gitignore`) hoặc từ biến môi trường do MCP client truyền vào.
5. **Thêm tool mới thì phải thêm kiểm tra tương ứng** trong `mcp/smoke-test.ts` và cập nhật bảng tool ở `docs/ANTIGRAVITY.md`.
6. **Giữ nguyên dữ kiện.** Tool `humanize_text` chỉ được đổi cách diễn đạt, tuyệt đối không đổi số liệu, tên riêng, ngày tháng.

## Kiểm tra trước khi commit

```bash
npm run lint       # tsc --noEmit
npm run mcp:smoke  # kiểm tra MCP, không cần API key
npm run build      # build web app
```

## Ngôn ngữ

Sản phẩm phục vụ người dùng Việt Nam: chuỗi hiển thị, mô tả tool và nội dung mô hình trả về đều bằng tiếng Việt. Tên biến, tên hàm và commit message giữ tiếng Anh.
