# Tự động chấm bài viết tiếng Anh (AI miễn phí — Google Gemini)

Trạng thái: **ĐÃ CHẠY** (2026-10-07): bảng `writing_grades` đã tạo, secret `GEMINI_API_KEY` + `GRADER_ALLOWED_EMAILS` đã đặt, function `grade-writing` đã deploy, web đã deploy. Người dùng chọn AI miễn phí (Gemini free tier) thay cho Claude API trả phí.

## 1. Chức năng

Dưới ô "Bài viết về nhà" có khung **Chấm bài tự động** (chỉ hiện khi bật tài khoản; nút chỉ bấm được khi đã đăng nhập và viết ≥ 10 từ). Một lần bấm = **một lượt gọi AI**, kết quả chia tab:

| Tab | Nội dung |
|---|---|
| (luôn hiện) | Band tổng + band từng tiêu chí (TR/TA, CC, LR, GRA; bài nói: FC, LR, GRA — không chấm phát âm) |
| Chấm bài | Nhận xét chung, nhận xét từng tiêu chí, điểm nghẽn, 3–5 việc cần cải thiện |
| Tìm lỗi | Bài làm với lỗi **tô đỏ, đánh số** trực tiếp; bảng Lỗi sai → Sửa → Giải thích, nhãn "Lỗi quen" và "Buổi N" (buổi dạy quy tắc đó) |
| Sửa bài | 3–5 câu gốc → câu tốt hơn, giải thích từng chỗ đổi (important → essential…); bản sửa hoàn chỉnh giữ ý học viên |
| Nâng band | Từ band hiện tại lên +1 cần thay đổi gì; 5 từ/cụm từ nâng band kèm nghĩa + ví dụ |
| Ưu điểm | Đếm và trích collocation / từ vựng / từ nối / cấu trúc phức đã dùng tốt |
| Bài mẫu | AI viết cho cùng đề, ở mức band mục tiêu kế tiếp |

Lịch sử: mỗi lần chấm lưu vào bảng `writing_grades`; trong buổi học hiện các lần chấm trước (ngày giờ · band) để so sánh.

## 2. Kiến trúc

```
HomeworkBox → WritingGrader (trình duyệt, đã đăng nhập)
   │ POST { slug, kind, lesson, prompt, text, syllabus } + token Supabase
   ▼
Supabase Edge Function grade-writing  (giữ GEMINI_API_KEY dạng secret)
   │ 1. đăng nhập + email trong GRADER_ALLOWED_EMAILS (không có thì dùng TTS_ALLOWED_EMAILS)
   │ 2. hạn mức GRADER_DAILY_LIMIT bài/ngày/người (mặc định 20)
   │ 3. gọi Gemini generateContent, JSON schema bắt buộc; lỗi 429/5xx/404 → thử model tiếp theo
   │ 4. lưu writing_grades
   ▼
Kết quả JSON → tab hiển thị
```

| File | Vai trò |
|---|---|
| `supabase/functions/grade-writing/grader.ts` | Lõi dùng chung (không import gì): prompt, JSON schema, gọi Gemini, làm sạch kết quả, làm tròn band kiểu IELTS, định vị lỗi để tô màu |
| `supabase/functions/grade-writing/index.ts` | Edge Function (Deno) |
| `supabase/writing-grades.sql` | Bảng + RLS (mỗi người chỉ đọc/xoá bài của mình; chỉ function ghi) |
| `src/features/en/grader.ts`, `WritingGrader.tsx` | Phía trình duyệt |
| `scripts/en-grade-try.ts` | `pnpm en:grade:try <buổi> <bài.txt>` — chấm thử trên máy, không cần Supabase |
| `tests/en-writing-grader.test.ts` | Test lõi (fetch giả) |

- **Model:** `GRADER_MODELS` (mặc định `gemini-3.8-flash,gemini-2.5-flash`). Đổi model chỉ cần đổi secret, không sửa code.
- **Quyền riêng tư:** ở gói free, Google được dùng nội dung gửi lên để cải thiện sản phẩm. Chỉ gửi đề + bài làm + số/tên buổi học, không gửi tên tài khoản.
- **Độ tin cậy:** band là ước lượng của AI. Nên chấm thử vài bài đã được gia sư chấm trong chat (`nhat-ky-hoc-tap/tieng-anh/`) để so sánh rồi chỉnh `SYSTEM_PROMPT`.

## 3. Việc người dùng làm (một lần)

1. **Lấy khóa miễn phí:** vào https://aistudio.google.com → đăng nhập Gmail → **Get API key** → **Create API key**. Không cần thẻ.
2. **Chấm thử trên máy (khuyên làm):** mở `.env.local`, thêm dòng `GEMINI_API_KEY=<khóa>`. Lưu một bài viết ra file, VD `bai.txt`, rồi chạy:
   ```
   pnpm en:grade:try 1 bai.txt
   ```
   (`1` = số buổi có đề tương ứng.)
3. **Supabase SQL:** SQL Editor → dán `supabase/writing-grades.sql` → Run.
4. **Deploy máy chủ chấm** (PowerShell, trong thư mục chinese-app):
   ```
   npx supabase secrets set GEMINI_API_KEY=<khóa> GRADER_ALLOWED_EMAILS=vienthao@learn-app.local
   npx supabase functions deploy grade-writing --no-verify-jwt
   ```
   `--no-verify-jwt`: function tự kiểm tra đăng nhập và danh sách được phép.
5. `pnpm dev` → đăng nhập → mở bài về nhà một buổi → **Chấm bài**. Ổn thì `pnpm deploy:pages`.

**Không gửi khóa qua chat. Không commit `.env.local`.**

## 4. Thông báo lỗi trên web

| Máy chủ trả về | Người dùng thấy |
|---|---|
| 401 | Cần đăng nhập |
| 403 | Tài khoản chưa được bật chấm bài (thêm email vào `GRADER_ALLOWED_EMAILS`) |
| 429 `daily_limit` / `model_busy` | Hết lượt hôm nay / gói free đang hết lượt theo phút |
| 503 `not_configured` | Chưa đặt `GEMINI_API_KEY` |
| 404 | Function chưa deploy |
