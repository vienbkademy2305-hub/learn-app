# PHASE 2 — Smoke test (static build)

- Generated: 2026-09-29T07:37:58.064Z by `pnpm smoke`, base path `/`
- Pages × viewports: 40 × 375px / 768px / 1280px
- Link prefetches cancelled by navigation (ignored): 2362
- Result: **PASS**

## Interactions

- PASS đánh dấu 1 từ đã học (aria-pressed=true: 1)
- PASS bài 1 hiện "Đang học" và 1 từ đã học sau khi đánh dấu
- PASS bấm "Nghe" tải audio (200 /assets/audio/hsk-sentences-audio/hsk1-0001.mp3)
- PASS "Nghe cả bài" phát câu 1 và tô sáng câu đang đọc
- PASS tải dữ liệu nét chữ (200 /assets/strokes/8001.json)
- PASS hoạt ảnh viết mẫu vẽ các nét (36 path SVG)
- PASS chế độ tự viết hiện hướng dẫn "Hãy viết nét 1/…"
- PASS tiếng Anh: bài điền từ chấm 6/6 khi đúng hết
- PASS tiếng Anh: sửa 2/4 lỗi được chấm 2/4
- PASS tiếng Anh: trang lộ trình hiện tiến độ bài tập của Buổi 2 ("2 Ngoại hình & tính cách Tính từ miêu tả, so sánh hơn Đã mở 1/7 bước · Bài tập 2/6 (80%)")
- PASS kiểm tra: có đồng hồ, nộp bài chấm "Chưa đạt (cần 80%)" và chỉ ra buổi cần ôn
- PASS kiểm tra: lần làm được lưu và hiện "Kết quả tốt nhất"
- PASS trang chọn ngôn ngữ nhớ ngôn ngữ vừa học
- PASS URL cũ /lesson/… chuyển sang /zh/lesson/… (/zh/lesson/hsk1-01-greetings/grammar/)
- PASS chế độ "Ẩn chữ Hán" ẩn chữ Hán, giữ pinyin; nút "Hiện" hiện lại câu đó (lab(9.03835 1.15297 1.92955) → rgba(0, 0, 0, 0) → lab(9.03835 1.15297 1.92955))
- PASS chế độ "Ẩn nghĩa" ẩn nghĩa, hiện lại chữ Hán, và được nhớ sau khi tải lại
- PASS chế độ "Xem đủ" không hiện nút "Hiện" (0)
- PASS nghe hết một câu → "✓ đã nghe" và "Đã nghe 1/10 câu"
- PASS câu 6 (file "chậm" của nguồn không chậm hơn) → "Chậm" phát file thường ở 0,8× (hsk1-0006.mp3)
- PASS câu 1 → "Chậm" phát file chậm của nguồn (hsk1-0001_slow.mp3)
- PASS làm hết một lượt Bài nghe, có đủ 3 dạng (Nghe và chọn nghĩa đúng / Nghe và chọn câu đúng / Nghe và chọn từ còn thiếu)
- PASS trang Luyện nghe hiện tiến độ bài 1 (Chào hỏi · Đã nghe 1/10 câu · Đúng: 3/8)
- PASS làm hết một lượt Bài viết (có cả sắp xếp câu và viết pinyin)
- PASS viết đúng từng nét bằng chuột → máy chấm "Chính xác!" (12 nét)
- PASS làm hết một lượt Viết chữ tới màn hình kết quả
- PASS bước "2. Ngữ pháp": 4 điểm, 14 câu ví dụ có audio
- PASS làm hết phần "Câu nào đúng?" của bài 1 tới màn hình kết quả
- PASS bước "5. Luyện tập" có 6 mục (thêm Luyện nói) (5. Luyện tập, 6 thẻ)
- PASS Nhớ từ vựng có dạng Việt → Trung gõ pinyin
- PASS làm hết một lượt Nhớ từ vựng tới màn hình kết quả
- PASS flashcard: lật thẻ, "Nhớ rồi" bớt 1 thẻ (Còn 30 thẻ → Còn 29 thẻ)
- PASS từ vừa lưu (什么) có trong Sổ từ
- PASS khung Tập chép chữ tải được chữ đầu tiên
- PASS Đặt câu: tự kiểm tra hiện câu mẫu, câu được lưu sau khi tải lại
- PASS Viết đoạn văn: đếm chữ Hán khi gõ (Độ dài: 8/30 chữ Hán)
- PASS trang Bài tập hiện điểm của cả 3 loại cho bài 1 (3/3)
- PASS bấm "Hoàn thành bài học" đổi trạng thái sang Hoàn thành
- PASS tiến độ còn sau khi tải lại trang (localStorage)
- PASS trang không tồn tại hiện 404 tiếng Việt
- PASS nút nghe từ/chữ đọc đúng nội dung và tốc độ (老师@0.85, 老师@0.5, 老@0.85)
- PASS Bài 0: bấm ô thanh mẫu zh đọc chữ ví dụ 知 (知@0.7)
- PASS Bài 0: luyện nghe thanh điệu tự đọc câu hỏi (茶@0.7) và làm hết tới kết quả
- PASS Bài 0: làm hết một lượt phân biệt âm dễ nhầm
- PASS Nhớ từ vựng: câu nghe tự đọc từ khi hiện câu hỏi (的@0.85)
- PASS ghi âm 老师 bằng micro giả (thanh 3 + thanh 1) → điểm thanh điệu 91/100 (lǎo 88 · shī 94), có nút nghe lại
- PASS điểm luyện nói được lưu (hiện "Cao nhất" sau khi tải lại)
- PASS chế độ Câu: ghi âm xong có kết luận (Ngữ điệu còn khác mẫu — nghe bản chậm rồi bắt chước lên xuống giọng. Bạn đọc chậm hơn mẫu khá nhiều.)

## Console errors / failed requests / overflow (0)

None.
