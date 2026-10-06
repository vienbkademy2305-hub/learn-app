# TTS service — giọng đọc AI qua API (2026-10-06)

## 1. Quyết định
- Nhà cung cấp: **Google Cloud Text-to-Speech** (giọng Neural2 / Chirp 3 HD / WaveNet). Lý do: giọng tự nhiên, nhiều giọng en-GB, mức miễn phí 1 triệu ký tự/tháng cho Neural2 (và riêng cho Chirp 3 HD), đủ cho cả lộ trình (~235.000 ký tự/bộ giọng cho Anh + Trung HSK1). Dự phòng: Azure AI Speech.
- **Chặn cứng 950.000 ký tự/tháng** (người dùng chọn 2026-10-06), đặt trong chính service, kiểm tra nguyên tử trong database TRƯỚC khi gọi Google. Chạm trần → service trả 429, web tự dùng giọng thu sẵn (Kokoro) rồi giọng trình duyệt. Không bị tính tiền.
- Khóa API chỉ nằm trong secret của Edge Function — không bao giờ có trong frontend hay git.

## 2. Kiến trúc
```
Trình duyệt ──HEAD──▶ Storage tts/v1/<sha256(giọng+"\n"+văn bản)>.mp3   (có → phát ngay, không tốn gì)
     │ (chưa có)
     └──POST /functions/v1/tts {text, voice}──▶ Edge Function `tts`
            1. có trong bảng tts_clips → trả URL
            2. tài khoản được phép? (TTS_ALLOWED_EMAILS / TTS_ADMIN_TOKEN) — không → 403
            3. tts_reserve(chars, 950000) — hết hạn mức → 429
            4. provider.synthesize() → upload mp3 → ghi tts_clips → trả URL
```
| File | Vai trò |
|---|---|
| `supabase/tts.sql` | bucket `tts` (đọc công khai), bảng `tts_clips`, `tts_usage`, hàm `tts_reserve` / `tts_release` |
| `supabase/functions/tts/index.ts` | HTTP: GET danh sách giọng + hạn mức; POST tạo/lấy URL |
| `supabase/functions/tts/providers.ts` | interface `TtsProvider` + adapter Google. Đổi nhà cung cấp = thêm adapter + secret `TTS_PROVIDER` |
| `supabase/functions/tts/key.ts` ↔ `src/features/tts/key.ts` | khóa file, phải giống hệt (test `tests/tts-key.test.ts`) |
| `src/features/tts/client.ts` | phía trình duyệt: chọn giọng (localStorage), tìm/tạo URL |
| `src/features/tts/VoicePicker.tsx` | ô "🔊 Giọng đọc" ở trang /en (ẩn khi service chưa chạy) |
| `src/features/en/speech.tsx` | thứ tự: giọng TTS đã chọn → file Kokoro → giọng trình duyệt; hội thoại đọc từng lượt theo giới tính nhân vật (`src/domain/tts-cast.ts`) |
| `scripts/tts-pregen.ts` | `pnpm tts:pregen --voice … [--second …] [--dry]` tạo sẵn toàn bộ clip, báo số ký tự trước |

Tốc độ chậm = phát cùng file ở 0.75× (không tạo bản chậm riêng → không tốn gấp đôi ký tự).

## 3. Việc người dùng làm (một lần)
1. **Google Cloud**: tạo project → bật *Cloud Text-to-Speech API* → gắn tài khoản thanh toán (bắt buộc kể cả khi chỉ dùng phần miễn phí).
2. **Tạo API key**: APIs & Services → Credentials → Create credentials → API key → *Restrict key* → API restrictions: chỉ chọn *Cloud Text-to-Speech API*.
3. **Lớp bảo vệ phụ phía Google** (khuyên làm): Billing → Budgets & alerts → ngân sách $1, cảnh báo 50/90/100%. IAM & Admin → Quotas → Cloud Text-to-Speech API → giảm *requests per minute* (VD 100).
4. **Supabase SQL**: SQL Editor → dán `supabase/tts.sql` → Run.
5. **Cài Supabase CLI và deploy** (PowerShell, trong thư mục chinese-app):
   ```
   npx supabase login
   npx supabase link --project-ref nxdjmkcnslhhbpvmrlju
   npx supabase secrets set GOOGLE_TTS_KEY=<khóa> TTS_ALLOWED_EMAILS=vienthao@learn-app.local TTS_ADMIN_TOKEN=<chuỗi ngẫu nhiên ≥ 32 ký tự> TTS_MONTHLY_CHAR_CAP=950000
   npx supabase functions deploy tts --no-verify-jwt
   ```
   `--no-verify-jwt`: function tự kiểm tra quyền (người chưa đăng nhập vẫn nghe được clip đã tạo, nhưng không tạo mới được).
6. Thêm `TTS_ADMIN_TOKEN=<cùng chuỗi>` vào `.env.local` (cho script tạo sẵn). **Không gửi khóa nào qua chat.**

## 4. Sau khi deploy
1. Mở /en → "🔊 Giọng đọc" → chọn giọng, bấm "Nghe thử" (tạo 1 clip, tốn ~100 ký tự).
2. Chốt giọng → `pnpm tts:pregen --voice <giọng chính> --second <giọng thứ hai> --dry` xem số ký tự → chạy thật.
3. Đặt giọng mặc định cho cả site: `NEXT_PUBLIC_TTS_VOICE_EN` / `NEXT_PUBLIC_TTS_VOICE_EN_2` trong `.env.local` → `pnpm deploy:pages`.
4. Tiếng Trung (cmn-CN): service đã hỗ trợ; nối vào phần phát âm tiếng Trung là bước sau (chờ người dùng quyết định).
