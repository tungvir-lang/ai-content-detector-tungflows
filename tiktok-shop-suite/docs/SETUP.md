# Hướng dẫn đăng ký app & lấy token

Bộ công cụ nối tới **ba API surface độc lập** của TikTok. Mỗi cái đăng ký app
riêng, có mô hình xác thực riêng. Làm lần lượt.

> Ghi chú: token ban đầu (bước "authorize") thường phải lấy thủ công một lần qua
> trình duyệt. Sau đó suite tự lưu và tự refresh (trừ Marketing API — token dài
> hạn, không refresh định kỳ). Các hàm `seedToken(...)` trên mỗi client là nơi
> bạn nạp token lần đầu vào SQLite.

## 1. TikTok Shop Partner API — module Affiliate

1. Vào **https://partner.tiktokshop.com** → tạo app trong TikTok Shop Partner Center.
2. Bật các quyền: *Product*, *Affiliate* (Seller).
3. Lấy **App Key** và **App Secret** → điền `TTS_SHOP_APP_KEY`, `TTS_SHOP_APP_SECRET`.
4. Cho seller authorize app; callback trả về **auth code**. Đổi auth code lấy
   `access_token` + `refresh_token` qua endpoint token của Shop, đồng thời nhận
   **shop_cipher** → điền `TTS_SHOP_CIPHER`.
5. Nạp token lần đầu:

   ```ts
   import { loadPartialConfig, openDb } from "@tts/core";
   import { AffiliateClient } from "@tts/shop-affiliate";
   const cfg = loadPartialConfig();
   const db = openDb(cfg.dbPath);
   const client = new AffiliateClient(cfg.shop, db, process.env.TTS_SHOP_ACCOUNT_ID!);
   client["shop"].seedToken({           // hoặc thêm hàm seed public tuỳ ý
     accessToken: "…", refreshToken: "…",
     expiresAt: Date.now() + 7*864e5, refreshExpiresAt: Date.now() + 30*864e5,
   });
   ```

Ký request: suite tự ký HMAC-SHA256 (`packages/core/src/signing.ts`) — bạn không
cần làm gì thêm.

## 2. TikTok Marketing API — module Ads automation

1. Vào **https://ads.tiktok.com/marketing_api** → tạo Developer App.
2. Lấy **App ID** và **Secret** → điền `TTS_MARKETING_APP_ID`, `TTS_MARKETING_APP_SECRET`.
3. Authorize app với tài khoản quảng cáo → nhận **advertiser_id** và một
   **access_token** dài hạn.
4. Điền `TTS_MARKETING_ADVERTISER_ID`, rồi nạp token:

   ```ts
   import { MarketingApi } from "@tts/marketing";
   new MarketingApi(cfg.marketing, db).seedToken("ACCESS_TOKEN_DÀI_HẠN");
   ```

## 3. TikTok Content Posting API — module Scheduler

1. Vào **https://developers.tiktok.com** → tạo app, đăng ký sản phẩm
   **Content Posting API**, xin scope `video.publish`.
2. Lấy **Client Key** / **Client Secret** → điền `TTS_CONTENT_CLIENT_KEY`,
   `TTS_CONTENT_CLIENT_SECRET`.
3. Xác minh domain nơi bạn host file video (PULL_FROM_URL yêu cầu domain đã verify).
4. Chạy luồng OAuth để lấy `access_token` + `refresh_token` + `open_id` của tài
   khoản đăng bài. Điền `TTS_CONTENT_OPEN_ID`, rồi:

   ```ts
   import { ContentApi } from "@tts/scheduler";
   const content = new ContentApi(cfg.content, db, process.env.TTS_CONTENT_OPEN_ID!);
   // ContentClient.seedToken được gọi nội bộ; hoặc dùng saveToken từ @tts/core.
   ```

## Kiểm tra không cần credentials

```bash
npm run smoke   # xác nhận thuật toán ký + migrations DB chạy đúng
```

## Vận hành liên tục

Dùng một process manager để worker "bật máy không tắt" và tự khởi động lại:

```bash
# pm2
pm2 start "node --env-file=.env packages/server/dist/worker.js" --name tts-worker
pm2 start "node --env-file=.env packages/server/dist/index.js"  --name tts-server
pm2 save && pm2 startup

# hoặc systemd: tạo service ExecStart=node --env-file=/opt/tts/.env …/worker.js
# với Restart=always.
```
