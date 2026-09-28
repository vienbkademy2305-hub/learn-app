# SPEAKING — ghi âm & chấm điểm trên máy (kế hoạch + trạng thái)

- **Ngày:** 2026-09-28.
- **Yêu cầu người dùng:**
  - "tôi muốn có chức năng ghi âm giọng nói và chấm điểm" (nối tiếp phần 4A);
  - chọn cách **"Chấm trên máy"** (không nhận dạng chữ của trình duyệt, không Azure).
- **Căn cứ:** `docs/SPEAKING_ARCHITECTURE.md` §4–5 (phương án A + C).
- **Không làm:** nhận dạng chữ, cloud, chấm phụ âm/nguyên âm, lưu bản ghi âm.

## 1. Chấm cái gì — nói rõ với người học
- **Điểm thanh điệu (ước lượng)** cho **từ** (1–4 âm tiết):
  - đường cao độ của từng âm tiết được so với khuôn 4 thanh;
  - khuôn đã áp biến điệu: 3-3 → 2-3, 不 / 一 trước thanh 4 → thanh 2, 一 trước thanh 1/2/3 → thanh 4;
  - thanh nhẹ không chấm.
- **Điểm ngữ điệu (ước lượng)** cho **câu**: hình dạng đường cao độ của người học so với **audio mẫu** của câu (giọng tổng hợp), bằng DTW sau khi chuẩn hóa theo giọng người nói.
- **Không chấm:** phụ âm/nguyên âm (zh/j, b/p, ü…), độ rõ chữ, độ trôi chảy. UI ghi rõ điều này cạnh điểm.
- **Không đủ dữ liệu → không chấm**, chỉ báo lý do: không nghe thấy giọng, quá nhỏ, quá ngắn, bị rè.

## 2. Kỹ thuật (TypeScript thuần, không thêm dependency)
- **Ghi âm:** `getUserMedia` + `MediaRecorder` → blob để nghe lại. Phân tích: `AudioContext.decodeAudioData` trên chính blob, chuyển về mono 16 kHz.
- **`src/domain/speaking/pitch.ts`:** tìm F0 bằng YIN (khung 40 ms, bước 10 ms, 70–500 Hz), năng lượng RMS, đánh dấu khung hữu thanh.
- **`src/domain/speaking/assess.ts`:**
  - chuẩn hóa sang bán cung theo trung vị giọng người nói;
  - tách âm tiết theo khoảng lặng (thiếu thì chia đều);
  - khuôn thanh, biến điệu, chấm từng âm tiết, DTW cho câu;
  - lời nhận xét tiếng Việt.
- **Phân tích chạy trên luồng chính:** vài chục–vài trăm ms cho ≤ 8 giây ghi âm; chưa cần Web Worker (lệch nhỏ so với ARCHITECTURE §4.1, đo lại nếu chậm).
- **Tiến độ:** `ProgressState.speaking[<key>] = { attempts, best, last, at }` (localStorage). Bản ghi âm **không lưu**.

## 3. Vị trí trong UI
- **Luyện tập → mục mới "Luyện nói"** (`/lesson/[slug]/practice/speaking/`):
  - chọn từ hoặc câu của bài → nghe mẫu → ghi âm → nghe lại → điểm + biểu đồ cao độ + nhận xét.
- **Trang chi tiết từ:** thêm khung "Luyện nói" cho từ đó.

## 4. Kiểm tra
- **Unit test bằng tín hiệu tổng hợp** (sóng có hài âm với cao độ biến thiên):
  - pitch tracker đo đúng tần số;
  - phân loại đúng 4 thanh;
  - tách âm tiết đúng; áp biến điệu đúng;
  - DTW: giống → điểm cao, khác → điểm thấp;
  - im lặng → không chấm.
- **`pnpm smoke`:** Chromium với micro giả phát file WAV tổng hợp → ghi âm → có điểm và nhận xét, không lỗi console; trang mới ở 3 kích thước.
- **UNRESOLVED:** độ chính xác với giọng người thật, micro kém, môi trường ồn. Cần người dùng thử và báo lại; ngưỡng điểm sẽ chỉnh theo phản hồi.

## 5. Trạng thái (2026-09-28)
- **Đã làm:**
  - `src/domain/speaking/{pitch,assess}.ts`;
  - `src/features/speaking/*`;
  - trang `practice/speaking`;
  - khung "Luyện nói" ở trang từ;
  - tiến độ `speaking` trong localStorage.
- **Unit test:** 23 test tổng hợp.
  - Hiệu chỉnh ngữ điệu câu (khoảng cách DTW đo trên giai điệu tổng hợp, sau khi thêm độ dốc và thu hẹp cửa sổ):
    | Trường hợp | Khoảng cách DTW |
    |---|---|
    | cùng giai điệu, giọng / tốc độ khác | 0,21–0,33 |
    | sai 1/3 thanh | 2,18 |
    | đọc đều | 2,45 |
    | sai hết | 2,79 |
  - Thang điểm: 100 khi ≤ 0,4, 0 khi ≥ 3,8.
- **Smoke:** micro giả (Chromium phát WAV tổng hợp 老师 = thanh 3 + thanh 1) → **91/100** (lǎo 88 · shī 94); điểm được lưu; chế độ Câu đưa ra kết luận.
- **UNRESOLVED:**
  - chưa thử với **giọng người thật**, micro điện thoại, môi trường ồn — ngưỡng điểm có thể phải chỉnh theo phản hồi;
  - từ nhiều âm tiết đọc liền, không ngắt, được chia đều theo thời gian → kém chính xác hơn;
  - khi máy không có giọng đọc tiếng Trung, từ đơn lẻ không có "Nghe mẫu" (câu vẫn có audio thật).
