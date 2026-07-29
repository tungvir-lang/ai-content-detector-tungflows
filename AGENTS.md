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
| `mcp/server.ts` | MCP server (stdio) phơi 6 tool ra ngoài. |
| `mcp/fetch-article.ts` | Tải và bóc nội dung từ URL. Chỉ chạy trên Node. |
| `mcp/smoke-test.ts` | Kiểm tra giao thức MCP, không cần API key. |
| `mcp/verify.ts` | Gọi thật ra Gemini để xác nhận API key. |
| `scripts/setup-windows.ps1` | Cài đặt một lệnh trên Windows. |
| `docs/ANTIGRAVITY.md` | Cách nối repo này vào Antigravity. |

## Quy tắc bắt buộc

1. **Không nhân bản prompt.** Mọi logic phân tích mới phải viết trong `src/core/detector.ts` rồi mới phơi ra ở `mcp/server.ts` và UI. Không viết prompt trực tiếp trong component.
2. **`src/core/` phải chạy được ở cả trình duyệt và Node.** Không import `node:fs`, `node:path`, hay bất cứ API DOM nào trong thư mục này.
3. **Không log ra stdout trong `mcp/`.** stdout là kênh giao thức MCP; log phải dùng `console.error`.
4. **Không commit API key.** `GEMINI_API_KEY` nạp từ `.env.local` (đã có trong `.gitignore`) hoặc từ biến môi trường do MCP client truyền vào.
5. **Thêm tool mới thì phải thêm kiểm tra tương ứng** trong `mcp/smoke-test.ts` và cập nhật bảng tool ở `docs/ANTIGRAVITY.md`.
6. **Giữ nguyên dữ kiện.** Tool `humanize_text` chỉ được đổi cách diễn đạt, tuyệt đối không đổi số liệu, tên riêng, ngày tháng.
7. **Mọi tool nhận URL phải đi qua `fetchArticle`.** Không gọi `fetch` trực tiếp trong `mcp/server.ts`. Hàng rào chặn địa chỉ nội bộ nằm trong `fetch-article.ts` và kiểm tra ở từng chặng chuyển hướng; gọi tắt là mở đường cho SSRF.
8. **Đừng tin JSON của mô hình.** Luôn đi qua `parseJson` trong `src/core/detector.ts` — mô hình thỉnh thoảng viết thêm chữ sau khối JSON dù prompt đã cấm.
9. **Không gọi `process.exit()` trong `mcp/`.** Đặt `process.exitCode` rồi để tiến trình tự kết thúc; thoát đột ngột lúc stdio đang đóng làm libuv sập trên Windows.

## Kiểm tra trước khi commit

```bash
npm run lint       # tsc --noEmit
npm run mcp:smoke  # kiểm tra MCP, không cần API key
npm run build      # build web app
```

## Ngôn ngữ

Sản phẩm phục vụ người dùng Việt Nam: chuỗi hiển thị, mô tả tool và nội dung mô hình trả về đều bằng tiếng Việt. Tên biến, tên hàm và commit message giữ tiếng Anh.
