# PHASE 3 — BÀI TẬP (kế hoạch)

- **Ngày:** 2026-09-25.
- **Yêu cầu người dùng:** "bổ sung mục bài tập: bài viết, bài nghe, bài tập viết chữ".
- **Đầu vào:** ARCHITECTURE §13 (Quiz — `src/domain/quiz-generator` + `features/quiz`), §12 (Writing), `CLAUDE.md` §8 (Listening, Writing, Quiz trong lesson).
- **Ngoài phạm vi:** SRS, speaking/chấm phát âm, bài đọc dài, HSK2–6.

## 1. Ba loại bài tập (mỗi bài học có đủ 3)

| Mục | Dạng câu hỏi | Dữ liệu dùng |
|---|---|---|
| **Bài nghe** | (a) Nghe câu → chọn nghĩa tiếng Việt đúng (4 đáp án) · (b) Nghe câu → chọn từ còn thiếu trong câu | Câu của bài + audio thường/chậm + bản dịch Việt; đáp án nhiễu lấy từ câu/từ khác **cùng bài** |
| **Bài viết** | (a) Sắp xếp các từ thành câu đúng theo nghĩa tiếng Việt · (b) Viết pinyin cho từ (gõ có dấu hoặc số: `nǐ hǎo`, `ni3hao3`; đúng chữ sai thanh = "gần đúng") | Token của câu (3–7 từ); từ vựng của bài |
| **Viết chữ** | Nhìn pinyin + nghĩa + từ chứa chữ → tự viết chữ Hán trên khung **không có nét mờ**; máy chấm từng nét, gợi ý sau 3 lần sai; đạt nếu sai ≤ 3 lần | Chữ của bài có dữ liệu nét (hanzi-writer, như bước Luyện viết) |

- **Số câu mỗi lượt:** nghe 8 · viết 8 (4 sắp xếp + 4 pinyin) · viết chữ 6. Ít hơn nếu bài không đủ dữ liệu.
- **Sinh câu hỏi:** `src/domain/exercises.ts`, hàm thuần với bộ sinh số ngẫu nhiên truyền vào, nên test được bằng seed cố định. Câu hỏi được sinh **trên trình duyệt** khi bấm "Bắt đầu", để mỗi lượt khác nhau mà site vẫn tĩnh.
- **Sắp xếp câu:** chỉ chấp nhận đúng thứ tự của câu gốc. Có thể có cách xếp khác vẫn đúng ngữ pháp (**UNRESOLVED**, ghi trong UI là "theo câu mẫu").

## 2. Vị trí trong UI
- **Mỗi bài học:** thêm bước **"4. Bài tập"** (`/lesson/[slug]/exercises/`) với 3 thẻ Bài nghe / Bài viết / Viết chữ và điểm cao nhất; mỗi mục có trang riêng (`…/exercises/listening|sentences|characters/`). Tổng kết thành bước 5.
- **Menu trên cùng có mục "Bài tập"** (`/practice/`): bảng tất cả bài học × 3 loại bài tập kèm điểm.
- **Trang Tổng kết** hiện điểm 3 loại bài tập.

## 3. Lưu kết quả
- `ProgressState.exercises["<lesson>:<listening|sentences|characters>"] = { best, total, last, at }` trong localStorage (như Phase 2). State cũ không có trường này vẫn đọc được.

## 4. Kiểm tra
- **Unit test:** sinh câu hỏi (đủ số câu, đáp án đúng nằm trong lựa chọn, không trùng lựa chọn), chấm pinyin, lưu điểm.
- **`pnpm smoke`:** mở 4 trang mới ở 3 kích thước; làm trọn 1 lượt mỗi loại tới màn hình điểm; điểm hiện ở `/practice/`.
