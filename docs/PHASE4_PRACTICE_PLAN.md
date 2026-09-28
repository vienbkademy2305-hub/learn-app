# PHASE 4 — LUYỆN TẬP (kế hoạch + trạng thái)

- **Ngày:** 2026-09-28.
- **Yêu cầu người dùng:** "trước phần 4 có một phần Luyện tập hoặc bài tập: nhớ từ vựng, luyện viết chữ, làm các câu có nghĩa, viết một đoạn văn, có một phần flashcard để học và lưu từ vựng".
- **Trạng thái:** đã làm xong, `pnpm test` + `pnpm smoke` PASS. Chưa commit, chưa deploy.

## 1. Vị trí trong bài học
Các bước giờ là: 1 Từ vựng → 2 Câu ví dụ → 3 Luyện viết → **4 Luyện tập** (`/lesson/[slug]/practice/`) → 5 Bài tập → 6 Tổng kết.
Luyện tập **không chấm điểm** (để luyện thoải mái); Bài tập (bước 5) vẫn là phần có điểm.

## 2. Năm mục

| Mục | Trang | Cách làm |
|---|---|---|
| Nhớ từ vựng | `practice/vocab` | Trắc nghiệm xoay vòng: chữ → nghĩa, nghĩa → chữ, pinyin → chữ; đáp án nhiễu lấy từ cùng bài (`buildVocabRecall`) |
| Flashcard | `practice/flashcards` | Lật thẻ, "Chưa nhớ" / "Nhớ rồi" (phím Space/1/2). Hộp Leitner 1–5, ôn lại sau 0/1/3/7/16 ngày. Bộ lọc Cần ôn / Tất cả / ★ Đã lưu. Nút ☆ lưu vào **Sổ từ** |
| Tập chép chữ | `practice/copy` | Mỗi chữ 3 lượt: tô nét mờ (gợi ý sau 1 lần sai) → nét mờ nhạt (sau 2) → tự viết (sau 3) |
| Đặt câu | `practice/sentences` | Chọn từ → tự viết câu. Tự kiểm tra: có dùng từ, ≥ 3 chữ, dấu câu cuối, chữ chưa học; hiện câu mẫu có audio. Câu được lưu ("Sổ câu của bạn") |
| Viết đoạn văn | `practice/paragraph` | Đề theo chủ đề từng bài (14 đề HSK1, bài khác dùng đề chung theo tên bài), ≥ 30 chữ Hán, ≥ 5 từ của bài; đếm trực tiếp khi gõ; tự lưu bản nháp |

- Ô viết có nút chèn dấu câu và **chèn từ của bài** cho người chưa cài bộ gõ tiếng Trung.
- **Sổ từ** (`/flashcards/`, menu trên cùng): mọi từ đã lưu ở các bài + flashcard ôn riêng các từ đó.
- **UNRESOLVED:** máy chưa chấm được *nghĩa* / ngữ pháp của câu và đoạn văn người học tự viết — chỉ kiểm tra hình thức, người học tự so với câu mẫu.

## 3. Lưu dữ liệu (localStorage, cùng `ProgressState`)
- `saved[wordSlug] = ISO` — Sổ từ.
- `cards[wordSlug] = { box, due, reviews }` — lịch ôn flashcard.
- `notes["<lesson>:sentence:<word>" | "<lesson>:paragraph"] = { text, at }` — câu/đoạn văn của người học.
- State cũ không có các trường này vẫn đọc được (`parseProgress`).

## 4. Mã nguồn
- Logic thuần: `src/domain/practice.ts`, phần mới trong `src/domain/progress.ts`; test: `tests/practice.test.ts`.
- Giao diện: `src/features/practice/*`, route `src/app/lesson/[slug]/practice/**`, `src/app/flashcards/`.
- `ExerciseRunner` có thêm `type` tùy chọn (không truyền = không lưu điểm) và `back`.
