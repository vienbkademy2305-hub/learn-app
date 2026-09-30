# Kế hoạch: thay giọng đọc tiếng Anh (bài nghe + từ vựng)

Trạng thái: **A0 xong** (chọn Anh-Anh Emma/George), **A1 xong** (script `pnpm en:audio`, app phát MP3, Buổi 27 + 39 đã tạo) — chờ bạn nghe duyệt trước khi tạo toàn bộ (A3). Chưa commit.

## 1. Hiện trạng và vì sao khó nghe

- Mọi âm thanh tiếng Anh (từ vựng, câu ví dụ, hội thoại, bài nghe `audio_text`, nghe chép) đang đọc bằng **giọng máy của trình duyệt** (`speechSynthesis`, `src/features/en/speech.tsx`), đúng như quyết định tạm Q3 trong `ENGLISH_SPLIT_PLAN.md`.
- Giọng đọc lấy từ hệ điều hành, nên **chất lượng khác nhau theo máy**. Trên Windows + Chrome thường chỉ có giọng SAPI cũ (Microsoft David/Zira/Hazel): máy móc, âm cuối (-s, -ed, /t/) không rõ, ngắt câu sai, đọc số và tên riêng kém. Trên iPhone có thể thiếu giọng Anh-Anh.
- Bài hội thoại chỉ có 1–2 giọng; nếu máy chỉ có 1 giọng thì phân biệt người nói bằng cách đổi cao độ → nghe méo.
- Tiếng Trung không gặp vấn đề này vì dùng **file MP3 dựng sẵn** (`public/assets/audio`, 562 file).

## 2. Mục tiêu

1. Giọng tự nhiên, rõ âm cuối, **như nhau trên mọi thiết bị**.
2. Hội thoại có giọng riêng cho từng người (nam/nữ, 3 giọng cho Part 3).
3. Bản **chậm** thật sự (đọc chậm, không phải tua chậm làm méo tiếng) cho từ và câu.
4. Không tốn phí chạy hằng tháng, đúng giấy phép, chạy lại được khi sửa dữ liệu.

## 3. So sánh phương án

| Phương án | Chất lượng | Chi phí | Giấy phép | Ghi chú |
|---|---|---|---|---|
| **A. Kokoro-82M chạy trên máy → file MP3 (đề xuất)** | Tốt (giọng neural tự nhiên) | 0 đ | Apache-2.0 (mô hình và thư viện `kokoro-js`) | **Đã thử trên máy này 2026-09-29:** ~5 giây tạo 6 giây âm thanh; mẫu ở `D:\Lean - Ngoại ngữ\mau-giong-doc\` |
| B. Azure / Google Cloud TTS → MP3 | Rất tốt | Có gói miễn phí hằng tháng, cần tài khoản + thẻ | Theo điều khoản dịch vụ | Cần khóa API; phụ thuộc bên ngoài |
| C. edge-tts (giọng "Natural" của Edge) | Rất tốt | 0 đ | **Không rõ** — API không chính thức | Không dùng: rủi ro giấy phép |
| D. Giữ giọng trình duyệt, chỉ chọn giọng tốt hơn | Tùy máy | 0 đ | — | Làm ngay được như phương án dự phòng, không giải quyết gốc |

Đề xuất: **A làm chính, D làm dự phòng** (khi file âm thanh chưa có, hoặc mất mạng).

## 4. Thiết kế (phương án A)

**Giọng mặc định (Anh-Anh, hợp IELTS):** nữ `bf_emma`, nam `bm_george`; người thứ ba `bf_isabella` / `bm_lewis`. Nếu bạn thích giọng Mỹ: `af_heart`, `am_michael`.

**Script `pnpm en:audio`** (Node, thư viện `kokoro-js` + `ffmpeg-static`):
1. Duyệt `data/en`: headword từ vựng, câu ví dụ, lượt hội thoại, cụm mẫu ở tab Kỹ năng, `audio_text` bài nghe, câu nghe chép, bài kiểm tra.
2. Mỗi đoạn có khóa = băm(giọng + tốc độ + văn bản) → file `public/assets/en-audio/<khóa>.mp3`. Chỉ tạo file **mới hoặc đã đổi nội dung** (chạy lại nhanh khi sửa một buổi).
3. Hội thoại `Man: … / Woman: …`: tạo từng lượt với giọng tương ứng, ghép lại, chèn 0,4 giây im lặng giữa các lượt → **một file** cho cả bài nghe. Bỏ nhãn "Man:" (không đọc).
4. Bản chậm: tạo lại với `speed: 0.75` cho từ vựng, câu ví dụ, bài nghe và nghe chép (collocation, lượt hội thoại, cụm mẫu chỉ có bản thường; nút Chậm khi thiếu bản chậm phát file thường ở 0,8×).
5. Chuẩn hóa văn bản trước khi đọc: đã làm — số dài (điện thoại) đọc từng chữ số, chỗ trống `___` đọc thành khoảng lặng. Còn lại (nếu nghe duyệt thấy sai): bảng sửa phát âm cho tên Việt (Hoan Kiem, Nguyen…), giờ "8.30".
6. MP3 mono 40 kbps (đã thử: ~30 KB cho 6 giây).
7. Ghi `public/assets/en-audio/manifest.json`: văn bản → file thường / file chậm. App tải manifest một lần và tra theo đúng chuỗi văn bản.

**App:** nút Nghe/Chậm và "Nghe bài" phát file MP3 qua `<audio>` (dùng lại `assetUrl` như tiếng Trung). Chưa có file thì tự lùi về giọng trình duyệt (phương án D, ưu tiên giọng có chữ "Natural"/"Online"/"Google").

**Kiểm tra:** mở rộng `pnpm audio:check` cho tiếng Anh (mọi đoạn có file, MP3 hợp lệ, bản chậm dài hơn); test: mọi `audio_text` và câu nghe chép đều có âm thanh.

## 5. Khối lượng ước tính (dữ liệu Buổi 1–45 hiện tại)

| Loại | Số mục | Ký tự |
|---|---|---|
| Từ vựng (thường + chậm) | 906 | ~7 000 |
| Câu ví dụ (thường + chậm) | 742 | ~37 000 |
| Lượt hội thoại | 377 | ~21 000 |
| Bài nghe + nghe chép (chưa tính bài kiểm tra) | 141 | ~55 000 |
| Cụm mẫu tab Kỹ năng | 130 | ~4 000 |

≈ 125 000 ký tự + bản chậm (cả bài nghe) ≈ 5 150 file. **Đo thực tế Buổi 27 + 39 (A1, 2026-09-29):** 222 file = 7,2 MB, tạo mất ~17 phút → toàn bộ ước **150–170 MB** ở 40 kbps (hoặc ~120 MB ở 32 kbps), tạo mất **khoảng 6–7 giờ** chạy nền (một lần; về sau chỉ tạo phần thay đổi). `public/assets/` không nằm trong git (giống audio tiếng Trung) → deploy từ máy đã tạo file. Bản deploy GitHub Pages hiện ~168 MB, sẽ tăng tương ứng.

## 6. Các bước

| Bước | Việc | Kết quả |
|---|---|---|
| A0 | Bạn nghe mẫu, chọn giọng Anh-Anh hay Anh-Mỹ | Chốt giọng |
| A1 | Script `en:audio` + chuẩn hóa văn bản; chạy thử Buổi 27 (bản đồ) và Buổi 39 (hội thoại 3 người) | Bạn nghe duyệt 2 buổi |
| A2 | App phát MP3 (từ, câu, hội thoại, bài nghe), lùi về giọng trình duyệt khi thiếu file | Chạy local |
| A3 | Tạo toàn bộ Buổi 1–45 + bài kiểm tra; `audio:check` + test | Đủ file |
| A4 | Commit + deploy khi bạn đồng ý | Lên web |

## 7. Rủi ro

- Kokoro đôi khi đọc sai tên riêng Việt Nam hoặc từ hiếm → bảng sửa phát âm + nghe duyệt mẫu.
- Mô hình (~90 MB) tải từ Hugging Face; lần đầu đã bị đứt kết nối, chạy lại với IPv4 thì được.
- Dung lượng deploy tăng ~150 MB, thời gian deploy dài hơn (GitHub Pages giới hạn 1 GB/site — vẫn trong hạn).
