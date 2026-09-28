# PHASE 3 (người dùng) — LISTENING HSK1 (kế hoạch + trạng thái)

- **Ngày:** 2026-09-28.
- **Tên file:** repo đã dùng số `PHASE3…PHASE6` cho các tính năng khác, nên phase "3 — Listening" của người dùng có tên `LISTENING_PLAN.md`.
- **Người dùng đã duyệt kế hoạch** ("yes"): chế độ nghe đặt trong bước Câu ví dụ; cập nhật website sau khi kiểm tra đạt.
- **Ràng buộc:**
  - không SRS, speaking, handwriting;
  - **không đổi canonical data model**;
  - chỉ dùng audio của hsk-sentences-audio (562 file HSK1).

## 1. Đối chiếu yêu cầu với hiện trạng (đã kiểm trong code trước khi làm)

| Yêu cầu | Trước phase này | Phase này |
|---|---|---|
| Nghe tốc độ thường / chậm | `AudioButtons`, `PlayAll` | giữ nguyên |
| Hiện chữ Hán / pinyin / nghĩa Việt | `SentenceCard` | giữ nguyên, đánh dấu từng phần (`data-part`) để ẩn được |
| 4 chế độ nghe | chưa có | **mới** |
| Nghe → chọn câu đúng | chưa có | **mới** (`listen-sentence`) |
| Nghe → chọn nghĩa đúng | `listen-meaning` | giữ nguyên |
| Nghe → điền từ thiếu | `listen-fill` (khi token khớp từ của bài) | giữ nguyên |
| Nghe lại | nút Nghe/Chậm trong câu hỏi | giữ nguyên |
| Kết quả sau mỗi câu | `Feedback` + hiện đáp án | giữ nguyên |
| Tiến độ luyện nghe | chỉ điểm cao nhất của Bài nghe | **mới**: tiến độ theo từng câu |

## 2. Thiết kế

### 2.1 Bốn chế độ nghe (bước "Câu ví dụ & luyện nghe")
- Chế độ: **Xem đủ · Ẩn chữ Hán · Ẩn pinyin · Ẩn nghĩa**.
- Phần bị ẩn thành một thanh xám, **không mất bố cục**; nút **"Hiện"** ở từng câu để xem riêng câu đó.
- Cách làm: `SentenceCard` vẫn render trên server; client chỉ đặt `data-hide` trên danh sách, còn CSS ẩn các phần có `data-part` tương ứng. Nhờ vậy site vẫn tĩnh, JS tối thiểu.
- Chế độ được nhớ trong `localStorage` (tiện ích của từng người xem).

### 2.2 Bài nghe (`/lesson/[slug]/exercises/listening/`)
- Ba dạng xoay vòng: **nghe → chọn nghĩa**, **nghe → chọn câu chữ Hán**, **nghe → chọn từ còn thiếu**. Dạng nào thiếu dữ liệu thì dùng dạng khác.
- "Chọn câu": 3 câu nhiễu trong cùng bài, ưu tiên câu có độ dài gần bằng; pinyin/nghĩa chỉ hiện sau khi trả lời.

### 2.3 Tiến độ luyện nghe
- `ProgressState.listening[<sentence key>] = { plays, lastAt, attempts, correct, lastCorrect }`, lưu trong localStorage như các phase trước; **không đụng DB canonical**.
- **Ghi nhận:** mỗi lần audio phát **hết** (nút Nghe/Chậm, "Nghe cả bài", câu hỏi Bài nghe); mỗi lần trả lời câu hỏi nghe.
- **Hiển thị:**
  - "Đã nghe x/y câu" ở bước Câu ví dụ, dấu ✓ ở từng câu đã nghe;
  - trang **`/listening/`** tổng hợp 14 bài: số câu đã nghe, tỉ lệ trả lời đúng, điểm cao nhất Bài nghe.

## 3. Kiểm tra
- `pnpm build`, `pnpm test`, `pnpm typecheck`.
- **`pnpm audio:check`** (`scripts/check-audio.ts`):
  - mọi `audio.normal/slow` trong snapshot có file trong `out/assets`;
  - gọi HTTP từng file (bản build, và `--live` cho GitHub Pages) → 200, `audio/mpeg`, kích thước > 0;
  - trình duyệt đọc thời lượng: **bản chậm phải dài hơn bản thường** ở mọi câu.
- **`pnpm smoke`:** chuyển 4 chế độ + nút "Hiện"; làm trọn Bài nghe (có dạng chọn câu); `/listening/` hiện tiến độ; kích thước 375/768/1280.

## 4. Phát hiện khi làm & cách xử lý
- **25/281 câu:** file "chậm" của hsk-sentences-audio **không dài hơn** file thường (tỉ lệ chậm/thường thấp nhất 0,70, trung vị 1,27).
  - Nguyên nhân [CODE hsk-sentences-audio `scripts/synth_audio.py:63-64`]: bản chậm là **một lần tổng hợp giọng riêng** với `speed=0.8`, không phải bản thường được làm chậm, nên ngắt nghỉ khác nhau.
  - **Xử lý, không tạo audio mới:**
    - importer đo thời lượng và ghi vào `audio_assets.duration_ms` (cột đã có, trước để trống — không đổi model);
    - snapshot có thêm `audioMs`;
    - `playbackFor()` (`src/domain/listening.ts`): khi bản chậm không chậm hơn, nút "Chậm" phát **file thường ở 0,8×** (trình duyệt giữ cao độ).
  - `pnpm validate` báo cảnh báo `slow_audio_not_slower`; `pnpm audio:check` kiểm cả 25 câu đều đã được xử lý.
- **GitHub Pages trả `content-type: audio/mp3`** (tên không chuẩn, mọi trình duyệt chấp nhận), không phải `audio/mpeg` → script chấp nhận cả hai.
- **Menu trên điện thoại bị xuống dòng** khi thêm mục "Nghe" → giữ menu 1 dòng, chuyển "Nguồn dữ liệu" xuống chân trang trên màn hình nhỏ; smoke có thêm kiểm tra `menu-wraps`.
