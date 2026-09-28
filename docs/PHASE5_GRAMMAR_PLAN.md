# PHASE 5 — NGỮ PHÁP THEO BÀI (kế hoạch + trạng thái)

- **Ngày:** 2026-09-28.
- **Yêu cầu người dùng:** "chưa có ngữ pháp cho từng bài, bổ sung ngữ pháp cho từng bài".
- **Trạng thái:** đã làm xong, `pnpm test` + `pnpm smoke` PASS. Chưa commit, chưa deploy.

## 1. Audit
- DB đã có bảng `grammar_points` / `sentence_grammar`, nạp từ `grammar_points.json` của hsk-sentences-audio (413 điểm, 49 điểm cấp 1). Nguồn gốc krmanik/HSK-3.0, **license UNKNOWN** → không được phát hành (ARCHITECTURE §9, DATA_MAPPING §1). Chỉ có nhãn tiếng Trung, không có giải thích tiếng Việt.
- ARCHITECTURE §9 đã dự tính `data/editorial/grammar-vi/hsk{n}.yaml` tự viết.

## 2. Nội dung
- `data/editorial/grammar-vi/hsk1.yaml`: **48 điểm** cho 14 bài (2–5 điểm/bài), Claude (AI) tự viết, `default_status: draft` → UI hiện nhãn "Bản nháp" tới khi người duyệt đổi `status: reviewed`.
- Mỗi điểm: tiêu đề, cấu trúc (công thức), giải thích, lưu ý, **lỗi người Việt hay mắc** (câu sai có chủ đích → câu đúng + lý do), câu ví dụ = khóa câu hsk-sentences-audio (có pinyin, audio, bản dịch).
- `hsk_code` ghi mã theo cách đánh số của grammar_points.json để sau này nối `sentence_grammar`; **UNRESOLVED**: chưa đối chiếu với văn bản đề cương chính thức, UI không hiện.
- **UNRESOLVED:** nội dung cần giáo viên duyệt; câu "sai" chỉ minh họa lỗi trật tự/từ, không phải mọi biến thể khẩu ngữ.

## 3. Dữ liệu
- `pnpm content:export` đọc YAML (`importers/editorial/grammar-vi.ts`), kiểm tra bài và khóa câu tồn tại (lỗi → dừng export), gắn `snapshot.grammar` + `lesson.grammar`.
- Lối tắt có chủ đích: ngữ pháp editorial chưa đi qua DB canonical (khác sentences-vi). Khi cần tìm kiếm/SRS theo ngữ pháp thì chuyển vào `grammar_points` với `source = editorial`.

## 4. Giao diện
- Bước mới **"2. Ngữ pháp"** (`/lesson/[slug]/grammar/`) sau Từ vựng: 1 Từ vựng → 2 Ngữ pháp → 3 Câu ví dụ → 4 Luyện viết → 5 Luyện tập → 6 Bài tập → 7 Tổng kết.
- Thẻ mỗi điểm + phần **"Câu nào đúng?"** (không chấm điểm) sinh từ các cặp lỗi (`src/domain/grammar.ts`).

## 5. Kiểm tra
- `tests/grammar.test.ts`: đọc/kiểm tra YAML, file HSK1 hợp lệ với snapshot, quiz, tách công thức.
- `pnpm smoke`: trang ngữ pháp ở 3 cỡ màn hình, bài 1 có 4 điểm + câu ví dụ có audio, làm hết phần "Câu nào đúng?".
