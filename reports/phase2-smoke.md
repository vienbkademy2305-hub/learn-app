# PHASE 2 — Smoke test (static build)

- Generated: 2026-09-28T12:16:49.350Z by `pnpm smoke`, base path `/learn-app`
- Pages × viewports: 24 × 375px / 768px / 1280px
- Link prefetches cancelled by navigation (ignored): 1876
- Result: **PASS**

## Interactions

- PASS đánh dấu 1 từ đã học (aria-pressed=true: 1)
- PASS bài 1 hiện "Đang học" và 1 từ đã học sau khi đánh dấu
- PASS bấm "Nghe" tải audio (200 /learn-app/assets/audio/hsk-sentences-audio/hsk1-0001.mp3)
- PASS "Nghe cả bài" phát câu 1 và tô sáng câu đang đọc
- PASS tải dữ liệu nét chữ (200 /learn-app/assets/strokes/8001.json)
- PASS hoạt ảnh viết mẫu vẽ các nét (36 path SVG)
- PASS chế độ tự viết hiện hướng dẫn "Hãy viết nét 1/…"
- PASS chế độ "Ẩn chữ Hán" ẩn chữ Hán, giữ pinyin; nút "Hiện" hiện lại câu đó (lab(9.03835 1.15297 1.92955) → rgba(0, 0, 0, 0) → lab(9.03835 1.15297 1.92955))
- PASS chế độ "Ẩn nghĩa" ẩn nghĩa, hiện lại chữ Hán, và được nhớ sau khi tải lại
- PASS chế độ "Xem đủ" không hiện nút "Hiện" (0)
- PASS nghe hết một câu → "✓ đã nghe" và "Đã nghe 1/10 câu"
- PASS câu 6 (file "chậm" của nguồn không chậm hơn) → "Chậm" phát file thường ở 0,8× (hsk1-0006.mp3)
- PASS câu 1 → "Chậm" phát file chậm của nguồn (hsk1-0001_slow.mp3)
- PASS làm hết một lượt Bài nghe, có đủ 3 dạng (Nghe và chọn nghĩa đúng / Nghe và chọn câu đúng / Nghe và chọn từ còn thiếu)
- PASS trang Luyện nghe hiện tiến độ bài 1 (Chào hỏi · Đã nghe 1/10 câu · Đúng: 4/8)
- PASS làm hết một lượt Bài viết (có cả sắp xếp câu và viết pinyin)
- PASS viết đúng từng nét bằng chuột → máy chấm "Chính xác!" (4 nét)
- PASS làm hết một lượt Viết chữ tới màn hình kết quả
- PASS bước "2. Ngữ pháp": 4 điểm, 14 câu ví dụ có audio
- PASS làm hết phần "Câu nào đúng?" của bài 1 tới màn hình kết quả
- PASS bước "5. Luyện tập" có 5 mục (5. Luyện tập, 5 thẻ)
- PASS Nhớ từ vựng có dạng Việt → Trung gõ pinyin
- PASS làm hết một lượt Nhớ từ vựng tới màn hình kết quả
- PASS flashcard: lật thẻ, "Nhớ rồi" bớt 1 thẻ (Còn 30 thẻ → Còn 29 thẻ)
- PASS từ vừa lưu (对不起) có trong Sổ từ
- PASS khung Tập chép chữ tải được chữ đầu tiên
- PASS Đặt câu: tự kiểm tra hiện câu mẫu, câu được lưu sau khi tải lại
- PASS Viết đoạn văn: đếm chữ Hán khi gõ (Độ dài: 8/30 chữ Hán)
- PASS trang Bài tập hiện điểm của cả 3 loại cho bài 1 (3/3)
- PASS bấm "Hoàn thành bài học" đổi trạng thái sang Hoàn thành
- PASS tiến độ còn sau khi tải lại trang (localStorage)
- PASS trang không tồn tại hiện 404 tiếng Việt
- PASS nút nghe từ/chữ đọc đúng nội dung và tốc độ (老师@0.85, 老师@0.5, 老@0.85)
- PASS Bài 0: bấm ô thanh mẫu zh đọc chữ ví dụ 知 (知@0.7)
- PASS Bài 0: luyện nghe thanh điệu tự đọc câu hỏi (动@0.7) và làm hết tới kết quả
- PASS Bài 0: làm hết một lượt phân biệt âm dễ nhầm
- PASS Nhớ từ vựng: câu nghe tự đọc từ khi hiện câu hỏi (不@0.85)

## Console errors / failed requests / overflow (0)

None.
