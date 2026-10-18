# Giữ chân người học + Hội thoại AI (2026-10-18)

Trạng thái: **code xong, test PASS (228), function `chat-ai` đã deploy và thử thật với Gemini.**

## 1. Chuỗi ngày học, XP, mục tiêu, nhắc học

| Thành phần | File |
|---|---|
| Lõi thuần (streak, XP, cấp, tuần, .ics) | `src/domain/activity.ts` |
| Lưu trên trình duyệt (`learn-app:activity:v1`) | `src/features/activity/store.ts` |
| Chip 🔥 trên header | `src/features/activity/StreakChip.tsx` |
| Trang `/hom-nay/` | `TodayPanel.tsx`, `src/app/hom-nay/page.tsx` |

- **XP tự động:** `write()` của hai kho tiến độ (`progress/store.ts`, `en/progress.ts`) so từng trường cấp 1 của trạng thái cũ/mới rồi cộng XP (học từ +3, ôn thẻ +2, game +2, bài tập +10, bước bài học +5, xong buổi +20, nói +5, kiểm tra +20, trả lời AI +4). Đồng bộ từ tài khoản (`setProgressScope`) KHÔNG cộng XP.
- **Streak:** ngày tính khi XP ≥ mục tiêu (20/50/100). Hôm nay chưa đạt thì chuỗi của hôm qua vẫn hiển thị.
- **Nhắc học:** web tĩnh không có push khi đã đóng trang → tải file `.ics` sự kiện lặp hằng ngày có chuông báo, thêm vào lịch điện thoại. (Web Push thật cần máy chủ VAPID — chưa làm.)
- **Giới hạn:** chuỗi ngày chỉ lưu trong trình duyệt/thiết bị đang dùng, chưa đồng bộ tài khoản.

## 2. Hội thoại AI (`/en/hoi-thoai-ai/`, `/zh/hoi-thoai-ai/`)

- 12 tình huống (7 Anh gồm IELTS Speaking Part 1 và Part 2+3; 5 Trung), 3 trình độ (A2/B1/B2, HSK1/2/3).
- Mỗi lượt: AI đáp (nghe được, dịch, pinyin cho tiếng Trung) + khung sửa câu của bạn (câu nên nói, lỗi sai → đúng + lý do) + 3 gợi ý trả lời. Nhập bằng gõ hoặc 🎤 (nhận dạng giọng nói của trình duyệt).
- Máy chủ: Edge Function `chat-ai` (`supabase/functions/chat-ai/`), dùng lại khóa `GEMINI_API_KEY`, chuỗi model (thêm `gemini-flash-lite-latest` đứng đầu cho nhanh), cùng danh sách email được phép với chấm bài (`CHAT_ALLOWED_EMAILS` → `GRADER_ALLOWED_EMAILS` → `TTS_ALLOWED_EMAILS`).
- Hạn mức `CHAT_DAILY_LIMIT` (mặc định 80 lượt/tài khoản/ngày UTC) đếm trong `app_metadata` của người dùng — không cần bảng SQL. Không lưu hội thoại ở máy chủ.
- Prompt-injection: lời học viên là dữ liệu; nhân vật chọn theo `id` kịch bản ở máy chủ, không nhận prompt từ trình duyệt; mọi “lỗi” AI nêu phải trích đúng từ câu của học viên mới được hiện.
- Triển khai: `npx supabase functions deploy chat-ai --no-verify-jwt --project-ref nxdjmkcnslhhbpvmrlju`.

## 3. Giới hạn đã biết
- Gói Gemini miễn phí có hạn mức theo phút/ngày; hết thì web báo “thử lại sau”.
- Nội dung gõ vào được gửi tới Google (gói free có thể dùng để cải thiện sản phẩm).
- Thanh tab dưới (điện thoại) tối đa 5 mục nên thêm “AI” thì bỏ “Kiểm tra” (Anh) và “Đề thêm” (Trung) khỏi thanh dưới; vẫn truy cập được từ menu trên/ trang chủ.
- Chấm phát âm trên điện thoại, nhắc học bằng push thật: chưa làm.

## 4. Cập nhật tối 2026-10-18

### 4.1 Sửa chấm nói (lỗi “xin quyền mãi, ghi âm không lên điểm”)
Nguyên nhân tìm được trong code:
1. `ServerStatus` gọi `http://localhost:8765` mỗi lần mở trang Luyện nói, và nút 🎤 thăm dò lại sau 60 giây → Chrome hỏi quyền “mạng cục bộ” liên tục.
2. `start()` có `await` thăm dò mạng (tới 2,5 giây) trước khi gọi micro → Safari/iPhone coi như hết thao tác bấm, hỏi lại hoặc từ chối.
3. Ghi âm xong mới báo “chưa kết nối máy chấm” → không có điểm, không có đường lui.
4. Nhận dạng giọng nói chấm quá khắt khe (sai một chữ cái là mất cả từ) và bỏ kết quả khi trình duyệt cắt sớm.

Đã sửa: máy chấm OpenPronounce **tắt mặc định** trên web (bật bằng ô chọn ở “Máy chấm chi tiết”; trên `localhost` vẫn tự bật), không thăm dò mạng khi tắt; nút 🎤 vào nhận dạng của trình duyệt ngay trong lần bấm; nếu máy chấm lỗi có nút “Chấm bằng nhận dạng giọng nói của trình duyệt”; nhận kết quả tạm (interim) khi trình duyệt cắt sớm; từ dài sai 1–2 chữ cái vẫn tính đúng (`sameWord`); tự dừng sau thời gian đọc tối đa + 6 giây; giữ một luồng micro 90 giây để lượt luyện chỉ xin quyền một lần (`acquireMic`, cả tiếng Trung lẫn tiếng Anh).

### 4.2 Game học từ (trong tab “Học thuộc” của Ôn từ / Sổ từ)
- **⚡ Đua 60 giây** (`Blitz.tsx`): combo x1–x5, sai trừ 3 giây, kỷ lục lưu trên máy, từ sai vào “Từ khó”, +2 XP mỗi từ đúng (tối đa 40); âm thanh + rung (`feedback.ts`, có ô tắt).
- **👾 Đánh boss: Từ khó**: trận 5 tim, thanh máu; mỗi từ khó cần 2 đòn trúng; thắng +15 XP.
- **🎯 Săn từ** (trong Hội thoại AI): chọn 5 từ (ưu tiên từ khó → đang học → từ trong các buổi đã tới); AI dẫn dắt để bạn dùng; chỉ tính từ thật sự có trong câu của bạn; +5 XP mỗi từ, +10 khi đủ 5.
