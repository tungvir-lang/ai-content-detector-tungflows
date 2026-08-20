# TikTok Shop Automation Suite

Bộ công cụ tự động hoá cho **người bán TikTok Shop của chính bạn**, dựng trên các
**API chính thức** của TikTok. Không có kỹ thuật giả lập tương tác, không cày view,
không thao túng chỉ số — mọi thao tác đều là cấu hình hợp pháp trên tài sản (sản
phẩm, chiến dịch quảng cáo, tài khoản đăng bài) mà bạn sở hữu.

Bốn năng lực, chung một nền tảng:

| Module | Việc nó làm | API chính thức |
| --- | --- | --- |
| **Affiliate** (`@tts/shop-affiliate`) | Bật/điều chỉnh kế hoạch hoa hồng Open Collaboration cho sản phẩm của bạn để KOC nhận quảng bá | TikTok Shop Partner API |
| **Marketing** (`@tts/marketing`) | Đồng bộ báo cáo hiệu suất, tự động điều chỉnh ngân sách/giá thầu theo luật | TikTok Marketing API |
| **Scheduler** (`@tts/scheduler`) | Lên lịch và tự đăng video gắn Shop lên tài khoản của bạn | TikTok Content Posting API |
| **Dashboard** (`@tts/dashboard`) | Bảng điều khiển phân tích + quản lý luật + lịch đăng | (đọc từ backend) |

## Kiến trúc

```
┌────────────┐   REST   ┌──────────────┐        ┌──────────────────────────┐
│ Dashboard  │ <──────> │  Server      │        │  Worker (always-on)      │
│ (React)    │          │  (Express)   │        │  "bật máy không tắt"     │
└────────────┘          └──────┬───────┘        └──────────┬───────────────┘
                               │  cùng dùng                 │
                        ┌──────▼─────────────────────────────▼──────┐
                        │              @tts/core                     │
                        │  config · SQLite · HTTP(retry/ratelimit)   │
                        │  HMAC signing · OAuth token store/refresh  │
                        └──────┬───────────┬───────────┬────────────┘
                               │           │           │
                     ShopClient     MarketingClient   ContentClient
              (open-api.tiktok   (business-api.tiktok  (open.tiktokapis
               globalshop.com)     .com)                .com)
```

- **`@tts/core`** — nền tảng chung: cấu hình, SQLite (better-sqlite3), HTTP client
  có retry + xử lý rate-limit, ký HMAC-SHA256 cho Shop API, và kho token OAuth tự
  refresh cho cả ba API surface.
- **Worker** là tiến trình chạy liên tục: cứ theo chu kỳ nó đồng bộ báo cáo, đánh
  giá luật tự động, và đẩy các bài đến hạn trong hàng đợi. Lỗi từng chu kỳ được
  nuốt và ghi log — tiến trình **không tự tắt**.

## Chạy nhanh

```bash
cd tiktok-shop-suite
npm install
cp .env.example .env          # điền credentials (xem docs/SETUP.md)

npm run smoke                 # kiểm tra ký HMAC + DB, không cần credentials
npm run lint                  # tsc --build toàn bộ backend

# Hai tiến trình:
npm run server                # REST API + phục vụ dashboard đã build (cổng 4000)
npm run worker                # vòng lặp luôn-bật: đồng bộ + tự động + đăng bài

# Phát triển dashboard:
npm run dashboard:dev         # Vite dev server (cổng 5173, proxy /api -> 4000)
```

Build dashboard để server phục vụ tĩnh:

```bash
npm run build                 # build backend + dashboard -> packages/dashboard/dist
npm run server                # giờ server phục vụ luôn dashboard tại http://localhost:4000
```

## An toàn & tuân thủ

- **`TTS_DRY_RUN=true` là mặc định.** Ở chế độ này mọi module tính toán và ghi log
  hành động *dự định* nhưng không gọi endpoint thay đổi. Chỉ chuyển sang `false`
  khi bạn đã xem kỹ log dry-run.
- Mọi quyết định tự động (kích hoạt hay không) được ghi vào bảng `run_log` để truy
  vết.
- Thay đổi ngân sách được **chặn trần/sàn** (`max_budget`/`min_budget`) để một luật
  sai không thể tiêu vô hạn.
- Bộ công cụ chỉ thao tác trên tài sản bạn sở hữu và tuân theo TikTok Shop /
  TikTok for Business Terms of Service. Bạn chịu trách nhiệm dùng đúng hạn mức và
  chính sách của TikTok.

Chi tiết đăng ký app và lấy token: [docs/SETUP.md](docs/SETUP.md).

## Tách thành repo riêng (tuỳ chọn)

Thư mục này tự chứa, có thể tách ra repo độc lập bất cứ lúc nào:

```bash
git subtree split --prefix=tiktok-shop-suite -b tiktok-suite-only
# rồi push nhánh tiktok-suite-only sang repo mới.
```
