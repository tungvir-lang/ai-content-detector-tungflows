# Xưởng làm video với OpenMontage

[OpenMontage](https://github.com/calesthio/OpenMontage) là hệ thống làm video do agent AI điều khiển. Anh mô tả video cần làm bằng lời thường; agent (Antigravity, Claude Code, Cursor…) tự nghiên cứu đề tài, viết kịch bản, lồng tiếng, tìm hình ảnh và nhạc, dựng hình rồi xuất ra file MP4. Ở mỗi chặng quan trọng, agent dừng lại xin anh duyệt.

Repo này **không chứa mã OpenMontage**. Nó chỉ có script cài đặt và hướng dẫn này. OpenMontage được cài riêng vào `%USERPROFILE%\OpenMontage`.

## 1. Cài trên Windows

Mở PowerShell:

```powershell
git -C $HOME\ai-content-detector-tungflows pull origin main
powershell -ExecutionPolicy Bypass -File $HOME\ai-content-detector-tungflows\scripts\setup-openmontage-windows.ps1
```

Máy chưa có repo này thì clone trước: `git clone https://github.com/tungvir-lang/ai-content-detector-tungflows.git $HOME\ai-content-detector-tungflows`.

Lần đầu mất khoảng 10–15 phút và cần chừng 3 GB trống. Chạy lại lúc nào cũng được — script cập nhật OpenMontage lên bản mới nhất, không cài trùng.

| Bước | Script làm gì |
| --- | --- |
| 1 | Kiểm tra Git, Node.js, Python 3.10+, FFmpeg. Thiếu thì hỏi để cài bằng `winget`. |
| 2 | Tải OpenMontage về `%USERPROFILE%\OpenMontage` (hoặc `git pull` nếu đã có). |
| 3 | Tạo môi trường Python riêng `.venv`, cài thư viện và Piper TTS. |
| 4 | Cài bộ dựng hình Remotion, nạp sẵn HyperFrames (cần Node 22+). |
| 5 | Tạo `.env`, dùng chung key Gemini với ai-content-detector, bật UTF-8 cho Python, tải giọng đọc tiếng Việt. |
| 6 | Cho OpenMontage đọc thử một câu tiếng Việt, ra file `projects\_setup-check\xin-chao.wav`. |

Script sẽ hỏi anh ba việc:

- **Cài công cụ còn thiếu bằng winget?** — Git, Node.js LTS, Python 3.12, FFmpeg.
- **Dùng chung key Gemini?** — nếu `.env.local` của repo này đã có `GEMINI_API_KEY`. Key được ghi vào `OpenMontage\.env` (đã bị `.gitignore` loại khỏi git).
- **Bật `PYTHONUTF8=1`?** — nên chọn có. Python trên Windows mặc định dùng bảng mã ANSI; cả bảng mã Windows tiếng Anh (cp1252) lẫn tiếng Việt (cp1258) đều không mã hoá được chữ như "ứ", "ở", nên lồng tiếng tiếng Việt sẽ lỗi `UnicodeEncodeError`.

Tuỳ chọn:

| Tham số | Tác dụng |
| --- | --- |
| `-InstallDir D:\video\OpenMontage` | Cài vào chỗ khác. |
| `-RunDemo` | Dựng thử video demo `world-in-numbers.mp4` ở cuối. Lần đầu tải thêm trình duyệt ẩn khoảng 100 MB. |
| `-DetectorDir D:\code\detector` | Chỉ chỗ repo ai-content-detector để lấy key Gemini, nếu anh không để ở thư mục mặc định. |

## 2. Mở xưởng và ra lệnh

**Antigravity:** đóng và mở lại Antigravity (để nhận `PYTHONUTF8` mới) → **File → Open Folder** → chọn `%USERPROFILE%\OpenMontage` → dán câu mở đầu dưới đây vào khung chat, rồi mô tả video.

```text
Đọc AGENT_GUIDE.md trước khi làm. Trao đổi với tôi bằng tiếng Việt.
Mỗi terminal mới, chạy trước: $env:Path = "$PWD\.venv\Scripts;$env:Path"
Lồng tiếng tiếng Việt bằng piper_tts, model vi_VN-vais1000-medium,
hoặc Gemini TTS nếu .env có key — đề xuất để tôi chọn.
Chữ trên hình và phụ đề bằng tiếng Việt có dấu. Mọi số liệu phải ghi nguồn.
```

Dòng `$env:Path` thay cho `.venv\Scripts\Activate.ps1`: Windows mặc định chặn chạy file `.ps1`, còn đổi PATH thì không bị chặn. Có nó, agent dùng đúng Python của xưởng và tìm thấy lệnh `piper`.

**Claude Code:** `cd $HOME\OpenMontage` rồi chạy `claude`. Terminal của Claude Code trên Windows là Git Bash, nên đổi dòng PATH trong câu mở đầu thành `export PATH="$PWD/.venv/Scripts:$PATH"`.

Agent đi qua các chặng: nghiên cứu → đề xuất → kịch bản → phân cảnh → tư liệu → dựng → xuất file. Muốn xem tiến độ trên một bảng trực quan (Backlot), bảo agent mở hoặc tự chạy `python -m backlot open` trong terminal đã đổi PATH.

Video thành phẩm nằm ở `OpenMontage\projects\<tên-dự-án>\renders\`.

## 3. Prompt mẫu cho truyền thông sức khỏe tâm thần

Dán sau câu mở đầu. Phần trong `[...]` anh tự điền.

**Video giải thích dọc cho mạng xã hội**

```text
Làm video giải thích 60 giây, khung dọc 9:16, về 5 dấu hiệu trầm cảm ở người cao tuổi
mà con cháu hay bỏ qua. Giọng đọc chậm, ấm. Chữ to, dễ đọc trên điện thoại.
Kết thúc bằng lời mời đến khám tại [tên bệnh viện], số điện thoại [số điện thoại].
```

**Phóng sự dùng hình ảnh thật**

```text
Làm video tư liệu 75 giây về chuyện sống chung với rối loạn lo âu.
Chỉ dùng footage thật từ nguồn miễn phí, không dùng hình AI. Không lời bình, chỉ nhạc nhẹ
và vài dòng chữ ngắn. Không có cảnh nào khiến người xem liên tưởng đến tự hại.
```

**Chuyển bài báo đã đăng thành video**

```text
Đây là bài tôi đã đăng: [dán nội dung hoặc link]. Chuyển thành video 90 giây,
giữ nguyên số liệu và trích dẫn, lồng tiếng tiếng Việt, có phụ đề.
```

**Làm theo một video mẫu**

```text
Đây là video tôi thích: [link YouTube Short / TikTok]. Phân tích nhịp, bố cục, phong cách,
rồi đề xuất 2-3 hướng làm một video tương tự về giấc ngủ và sức khỏe tinh thần.
```

## 4. Giọng đọc tiếng Việt

| Lựa chọn | Cần gì | Nhận xét |
| --- | --- | --- |
| Piper `vi_VN-vais1000-medium` | Không cần gì, chạy offline | Miễn phí, giọng còn hơi máy. Đủ cho bản nháp và video nội bộ. Kịch bản không rời khỏi máy. |
| Piper `vi-vivos-x-low` | Không cần gì | Giọng dự phòng, script tải về khi mạng chặn Hugging Face. Nghe kém hơn. |
| Gemini TTS | Key Gemini trong `.env` | Tự nhiên hơn nhiều. Có thể tính phí tuỳ tài khoản Google. |
| ElevenLabs, Google Cloud TTS… | Key riêng của từng hãng | Trả phí, chất lượng cao nhất. Xem `docs/PROVIDERS.md` trong OpenMontage. |

## 5. Dùng kèm bộ tool kiểm tra nội dung của repo này

Nếu anh đã chạy `scripts/setup-windows.ps1`, MCP server `ai-content-detector-vn` được khai báo trong cấu hình chung của Antigravity, nên mở thư mục OpenMontage vẫn gọi được. Sau khi agent viết xong kịch bản, có thể yêu cầu:

```text
Chạy analyze_writing_style cho kịch bản vừa viết, sửa các cụm sáo rỗng nó chỉ ra.
Giữ nguyên mọi số liệu, tên riêng, ngày tháng. Gửi tôi bản sửa trước khi lồng tiếng.
```

## 6. Lưu ý khi làm nội dung y tế

- **Bác sĩ duyệt kịch bản trước khi xuất bản.** Agent tìm số liệu trên web và có thể sai. Câu mở đầu đã yêu cầu ghi nguồn cho mọi số liệu; dựa vào đó để kiểm.
- **Không đưa dữ liệu người bệnh thật vào xưởng** — ảnh, giọng nói, tên, hồ sơ. Khi đã điền key dịch vụ đám mây, kịch bản và hình ảnh được gửi lên máy chủ của hãng đó. Chỉ Piper chạy hoàn toàn trên máy.
- **Ghi nguyên tắc truyền thông của bệnh viện vào prompt**, ví dụ dùng ngôn ngữ không kỳ thị, không mô tả chi tiết hành vi tự hại. Agent làm theo những gì được dặn.
- **Bản quyền:** nhạc và footage miễn phí vẫn có điều kiện riêng. Agent ghi lại nguồn của từng tư liệu; xem lại trước khi đăng.

## 7. Chi phí

- **Không điền key:** miễn phí hoàn toàn — Piper lồng tiếng, footage từ Archive.org/NASA/Wikimedia, Remotion và HyperFrames dựng hình, FFmpeg xuất file.
- **Có key:** tạo ảnh (Imagen), video (Veo) và giọng cao cấp tính phí theo từng lần gọi. Theo quy tắc của OpenMontage, agent phải báo chi phí dự kiến trước khi tạo tư liệu, và nói rõ công cụ, nhà cung cấp, model trước mỗi lần gọi trả phí. Có thể đặt trần ngay trong prompt: "ngân sách tối đa 2 USD".

## 8. Lỗi thường gặp

| Triệu chứng | Cách sửa |
| --- | --- |
| `UnicodeEncodeError: 'charmap' codec can't encode` | Chưa bật `PYTHONUTF8=1`. Chạy lại script, chọn có, rồi mở lại Antigravity. |
| Agent báo `piper_tts` không dùng được | Terminal chưa đổi PATH. Chạy `$env:Path = "$PWD\.venv\Scripts;$env:Path"` trong thư mục OpenMontage. |
| `Unable to find voice` | Lệnh không chạy từ thư mục gốc OpenMontage, hoặc giọng chưa tải được. Chạy lại script. |
| `running scripts is disabled on this system` | Agent đang gọi `Activate.ps1`. Dùng dòng `$env:Path` ở trên thay thế. |
| `npm install` lỗi `ERR_INVALID_ARG_TYPE` | Script đã tự thử lại qua `npx`. Vẫn lỗi thì chạy tay `npx --yes npm install` trong `remotion-composer`. |
| Lần dựng đầu tiên rất lâu | Remotion đang tải trình duyệt ẩn (khoảng 100 MB). Chỉ tải một lần. |

## 9. Cập nhật và gỡ cài đặt

- **Cập nhật:** chạy lại script.
- **Gỡ:** xoá thư mục `%USERPROFILE%\OpenMontage`. Muốn tắt chế độ UTF-8 của Python: `[Environment]::SetEnvironmentVariable('PYTHONUTF8', $null, 'User')`.

## Giấy phép

OpenMontage dùng giấy phép AGPLv3. Giấy phép này ràng buộc phần mềm, không ràng buộc video anh làm ra; quyền với video còn tuỳ giấy phép của nhạc, footage, ảnh dùng trong đó. Nghĩa vụ kèm mã nguồn chỉ phát sinh khi anh phân phối lại chính OpenMontage (dù có sửa hay không), hoặc sửa nó rồi cho người khác dùng qua mạng.
