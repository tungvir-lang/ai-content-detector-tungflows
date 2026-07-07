<div align="center">

# 🧠 MeHeal Clinic Bot

**Hệ thống quản lý phòng khám sức khỏe tâm thần thông minh — bản thương mại có bản quyền**

Phòng khám Sức khỏe Tâm thần MeHeal · Hotline: 0523.175.175

</div>

---

## 1. Giới thiệu

MeHeal Clinic Bot là phần mềm **“tất cả trong một”** cho phòng khám hiện đại:

- 🌐 **Website phòng khám**: Giới thiệu · Phòng khám & chuyên môn · Tư vấn AI · Đặt lịch · Tra cứu · Liên hệ.
- 🤖 **Trợ lý AI tư vấn** sức khỏe tâm thần (OpenAI / Gemini / model khác — cấu hình được).
- 📅 **Quy trình khám khép kín**: người khám → đặt lịch → chọn bác sỹ/dịch vụ → phòng khám xác nhận & gán **số phòng + số thứ tự** → thông báo bệnh nhân → khám → **hoàn thành & lưu phiếu kết quả**.
- 📊 **Trang quản trị thông minh**: bảng điều khiển trực quan (biểu đồ), bảng lịch khám, hồ sơ bệnh nhân, danh mục bác sỹ/dịch vụ, **xuất báo cáo Word & Excel**.
- 🔐 **Khóa bản quyền**: hệ thống bị khóa cho đến khi được kích hoạt bằng License Key; chỉ **admin** quản lý.
- 💾 **Chạy ngay trên mọi máy**: dùng SQLite cục bộ, không cần server cơ sở dữ liệu riêng.

Nội dung chuyên môn (đội ngũ, dịch vụ, 16 rối loạn tâm thần thường gặp) được xây dựng từ *Sổ tay chẩn đoán* của phòng khám MeHeal.

---

## 2. Cài đặt & chạy (trên máy mới)

**Yêu cầu:** Node.js 18+ (khuyến nghị 20+).

```bash
# 1) Cài đặt phụ thuộc và build giao diện
npm run setup           # = npm install && npm run build

# 2) Tạo file cấu hình
cp .env.example .env     # rồi mở .env đổi JWT_SECRET, ADMIN_DEFAULT_PASSWORD...

# 3) Chạy hệ thống (server phục vụ luôn cả web)
npm start
```

Mở trình duyệt: **http://localhost:8787**
Trang quản trị: **http://localhost:8787/admin** (mật khẩu mặc định trong `.env` → đổi ngay sau khi đăng nhập).

### Chế độ phát triển (2 tiến trình, hot-reload)
```bash
npm run dev     # web: http://localhost:3000  ·  api: http://localhost:8787
```

---

## 3. Kích hoạt bản quyền (bắt buộc)

Khi mới cài, hệ thống ở trạng thái **KHÓA**. Đăng nhập admin → nhập **License Key** để mở khóa.

**Nhà cung cấp** phát hành khóa bằng lệnh (cần cùng `LICENSE_SECRET` với máy khách):

```bash
# Bản PRO, cấp cho một phòng khám, hạn 365 ngày
npm run keygen -- --edition PRO --licensee "Phòng khám MeHeal" --days 365

# Bản STANDARD vĩnh viễn
npm run keygen -- -e STANDARD -l "Khách hàng A"

# Bản dùng thử 15 ngày
npm run keygen -- -e TRIAL -l "Dùng thử" -d 15
```

> ⚠️ Khóa được ký bằng `LICENSE_SECRET`. Máy khách chỉ mở khóa được khi
> `LICENSE_SECRET` trong `.env` trùng với secret nhà cung cấp dùng để phát hành.
> Hãy giữ bí mật giá trị này — đây chính là “chìa khóa gốc” của bản quyền.

Các phiên bản: `TRIAL` · `STANDARD` · `PRO` · `ENTERPRISE` (mở dần tính năng — xem lộ trình bên dưới).

---

## 4. Tích hợp AI

Cấu hình trong **Admin → Cài đặt → Trợ lý AI** hoặc qua `.env`:

| Nhà cung cấp | Cấu hình | Ghi chú |
|---|---|---|
| **Google Gemini** | `GEMINI_API_KEY`, `GEMINI_MODEL` | Nhanh, rẻ, tiếng Việt tốt *(khuyến nghị)* |
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_MODEL` | Ổn định, chất lượng cao |
| **OpenAI-compatible** | `COMPATIBLE_BASE_URL/API_KEY/MODEL` | DeepSeek, OpenRouter, Groq, **Ollama nội bộ**… |

> 💡 Muốn **bảo mật dữ liệu tuyệt đối**? Chạy model nội bộ bằng Ollama:
> `COMPATIBLE_BASE_URL=http://localhost:11434/v1`, model `llama3.1` — miễn phí, không gửi dữ liệu ra ngoài.

---

## 5. Kiến trúc

```
server/            # Backend Express + SQLite (better-sqlite3)
  index.ts         #   điểm vào, phục vụ API + web đã build
  config.ts        #   cấu hình môi trường
  db.ts            #   schema + seed dữ liệu phòng khám
  license.ts       #   phát hành & xác thực khóa bản quyền (HMAC)
  auth.ts          #   đăng nhập admin (JWT) + middleware khóa bản quyền
  ai.ts            #   lớp trừu tượng AI (Gemini/OpenAI/compatible)
  reports.ts       #   xuất Word (docx) + Excel (exceljs) + thống kê
  content.ts       #   nội dung chuyên môn (bác sỹ, dịch vụ, rối loạn)
  routes/          #   public / admin / ai / reports
  tools/keygen.ts  #   CLI phát hành khóa (nhà cung cấp)
src/               # Frontend React + Vite + Tailwind
  pages/           #   trang công khai + trang admin
  pages/admin/     #   dashboard, lịch khám, bệnh nhân, báo cáo, cài đặt
data/              # CSDL SQLite (tự tạo khi chạy)
```

---

## 6. Lộ trình bản Pro (nâng cấp tiếp)

- [ ] Thông báo bệnh nhân qua **Zalo / SMS / Email** tự động khi xác nhận lịch.
- [ ] Phân tích nâng cao: dự báo lượt khám, thống kê theo nhóm rối loạn, so sánh cơ sở.
- [ ] Nhiều vai trò (lễ tân, bác sỹ, kế toán) với phân quyền chi tiết.
- [ ] Quản lý kho thuốc & hóa đơn thanh toán.
- [ ] Đồng bộ đám mây, sao lưu tự động, app di động cho bác sỹ.

---

## 7. Bản quyền

Phần mềm thương mại © 2026 **MeHeal / Tungflows**. Xem [LICENSE](./LICENSE).
Mọi hành vi sao chép/phân phối trái phép đều bị nghiêm cấm.
