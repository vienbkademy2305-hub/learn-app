# PHASE 6 — BÀI 0: NHẬP MÔN PHÁT ÂM (kế hoạch + trạng thái)

- **Ngày:** 2026-09-28.
- **Yêu cầu người dùng:** "cần một bài mở đầu hướng dẫn tôi đọc và các phiên âm…".
- **Trạng thái:** đã làm xong, `pnpm test` + `pnpm smoke` PASS. Chưa commit, chưa deploy.

## 1. Vị trí
- Trang `/pinyin/` "Bài 0 · Nhập môn phát âm". Lối vào: thẻ "0" đầu trang Lộ trình HSK1, dòng gợi ý ở trang chủ, nút "← Bài 0" ở Bài 1.

## 2. Nội dung (`src/content/pronunciation.ts`, Claude viết — BẢN NHÁP chờ giáo viên duyệt)
1. Âm tiết = thanh mẫu + vận mẫu + thanh điệu.
2. 4 thanh + thanh nhẹ: sơ đồ độ cao 5 mức, so sánh gần đúng với dấu tiếng Việt, mẹo phân biệt thanh 2/3.
3. 21 thanh mẫu theo nhóm, cách đọc gần đúng bằng tiếng Việt, cảnh báo lỗi hay gặp (bật hơi, j q x / zh ch sh / z c s, q ≠ "qu", c ≠ "c").
4. Vận mẫu: đơn, kép, mũi, nhóm i-/u-/ü-, er và -i sau z c s zh ch sh r.
5. Quy tắc viết pinyin (y/w/yu, ü sau j q x, iu/ui/un, vị trí dấu, thanh nhẹ, dấu cách âm) + cách gõ pinyin trong app.
6. Biến điệu: 3-3, 不, 一.
7. 8 nét cơ bản + 7 quy tắc thứ tự nét, demo viết bằng hanzi-writer (dùng lại CharacterPicker).
8. Luyện nghe (không chấm điểm): nghe chữ → chọn thanh (từ đơn âm tiết HSK1, bỏ chữ đa âm) và nghe → chọn pinyin trong nhóm âm dễ nhầm (zhī/jī/zī…).
9. Cách học mỗi bài trong app.

## 3. Âm thanh
- Không có audio ghi âm cho âm tiết trong các nguồn (REPO_AUDIT §9) → dùng giọng đọc tiếng Trung của máy đọc **chữ Hán ví dụ**. Máy không có giọng → hiện hướng dẫn cài.
- **UNRESOLVED:** chất lượng/độ chính xác thanh điệu phụ thuộc giọng đọc của từng máy; chữ đứng một mình có thể bị đọc theo âm khác (đã loại chữ đa âm khỏi bài nghe thanh). Nên thay bằng audio ghi âm có license khi tìm được nguồn.

## 4. Kiểm tra
- `tests/pronunciation.test.ts`: lọc chữ cho bài nghe thanh, đáp án, đủ 21 thanh mẫu.
- `pnpm smoke`: trang ở 3 cỡ màn hình; giọng giả lập kiểm tra bấm ô zh đọc 知, luyện nghe tự đọc câu hỏi và làm hết 2 loại; câu nghe ở "Nhớ từ vựng" tự đọc từ.
