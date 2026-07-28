<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d19d39d9-cc6e-4166-9a2e-7abea6e5581a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Dùng như bộ tool AI trong Antigravity

Ngoài giao diện web, repo còn có một **MCP server** phơi 5 tool phân tích ra ngoài để agent
trong Google Antigravity (hoặc Claude Code, Cursor, Windsurf, VS Code) gọi trực tiếp:

| Tool | Việc nó làm |
| --- | --- |
| `detect_ai_content` | Chấm điểm AI 0-100 kèm lý giải và bóc tách từng câu |
| `trace_content_source` | Truy nguyên nguồn gốc nội dung qua Google Search grounding |
| `analyze_writing_style` | Báo cáo văn phong tiếng Việt, chỉ ra cụm sáo rỗng cần sửa |
| `humanize_text` | Viết lại tự nhiên, giữ nguyên tuyệt đối dữ kiện |
| `batch_detect_ai` | Chấm điểm hàng loạt, tối đa 20 văn bản mỗi lượt |

```bash
npm run mcp:smoke    # kiểm tra server (không cần API key)
npm run mcp          # chạy server trên stdio
npm run mcp:inspect  # mở MCP Inspector để gọi tool thủ công
```

Hướng dẫn khai báo đầy đủ: [docs/ANTIGRAVITY.md](docs/ANTIGRAVITY.md)
