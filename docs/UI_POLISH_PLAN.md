# Làm đẹp giao diện theo ảnh tham khảo

Rút ra từ các ảnh màn hình bạn gửi (học từ vựng, ghép từ, Đúng/Sai, chọn bản dịch có hình, nhập chữ, trang "Mài dũa kỹ năng"). Các bài tập hiện nay trong app là kiểu **cả bộ câu trên một trang rồi bấm "Kiểm tra"**; bản tham khảo là **từng câu một**, đây là khác biệt lớn nhất.

## Mẫu thiết kế chung ("QuizShell")
1. **Thanh tiến độ vàng** ở đầu, kèm huy hiệu tròn góc phải (số câu đã đúng / chuỗi đúng).
2. **Tiêu đề lớn** loại câu hỏi ("Ghép từ tương ứng", "Chọn bản dịch", "Nhập vào bản dịch"); thẻ nhỏ "ĐÃ ĐẾN LÚC ĐỂ ÔN LẠI" (màu tím) cho từ ôn lại.
3. **Mỗi lần một câu**; đáp án là **ô to bo tròn** (cao ≥ 64px, chữ ≥ 18px, nền xám đậm, 2 cột cho ghép từ, 1 cột cho chọn bản dịch).
4. **Thanh dưới cố định**: nút thoát tròn bên trái, nút **"Tiếp theo"** to dạng viên thuốc ở giữa (xám khi chưa chọn → **xanh lá** khi đúng, **đỏ** khi sai), nút bật/tắt âm bên phải.
5. **Phản hồi ngay**: khung xanh/đỏ trượt lên từ dưới ("Chính xác", "Sai") kèm giải thích ngắn bằng tiếng Việt; bộ đếm ✓n ✗n ở trên cho dạng Đúng/Sai.
6. Dạng đặc biệt: **ghép cặp** (hai cột, chạm hai ô để nối, ô đúng mờ đi), **ghép âm thanh** (ô có biểu tượng loa + sóng âm), **nhập chữ bằng bàn phím chữ cái trên màn hình** với "Trợ giúp", **chọn bản dịch có hình minh họa**.
7. **Màn kết quả** (đã ghi trong kế hoạch truyện): 3 sao, thưởng, thời gian, độ chính xác, "Thử lại / Bỏ qua".

## Trang "Luyện tập" (kiểu "Mài dũa kỹ năng")
- Nền gradient tím–xanh; hai thẻ lớn: **"Bài học thực hành"** (gợi ý bài tiếp theo) và **"Ôn lại các từ"** (huy hiệu số từ đến hạn).
- **Bộ sưu tập của bạn**: ô số từ đã học, số quy tắc ngữ pháp.
- **Hôm nay**: thời gian học + hàng thẻ cuộn ngang (từ mới, từ đã ôn, quy tắc).
- Thanh điều hướng dưới 4 mục (Học · Luyện · Truyện · Tôi), mục Luyện có chấm đỏ khi có từ cần ôn.

## Thứ tự làm đề xuất
1. `QuizShell` (khung chung) + áp dụng cho game học thuộc (ghép cặp, chọn bản dịch, nhập chữ) vì đã chạy từng câu một.
2. Chuyển bài tập tiếng Anh dạng trắc nghiệm / điền từ sang từng câu một (giữ chế độ cả bộ cho dạng viết dài, error-correction, dictation).
3. Trang Luyện tập kiểu "Mài dũa kỹ năng".
4. Thanh điều hướng dưới 4 mục.
5. Chế độ nền tối (các ảnh đều nền tối) theo cài đặt hệ thống.

## Trạng thái (2026-10-19)
- ✅ `QuizShell` (src/features/quiz/QuizShell.tsx) + `QuizResult`: dùng cho game học thuộc (ghép cặp, chọn từ/nghĩa, nghe, gõ chữ có "Trợ giúp"), bài tập tiếng Anh "Làm từng câu" (trắc nghiệm, T/F/NG, điền từ…), toàn bộ bài tập tiếng Trung (ExerciseRunner) và truyện trinh thám.
- ✅ Trang "Luyện tập" kiểu "Mài dũa kỹ năng": /en/luyen-tap, /zh/luyen-tap.
- ✅ Thanh dưới 4 mục (Học · Luyện · Truyện/AI · Hôm nay), chấm đỏ ở "Luyện" khi có từ cần ôn.
- ⏳ Chưa làm: nền tối toàn site theo hệ thống; ghép âm thanh có sóng âm; bàn phím chữ cái trên màn hình; chọn bản dịch có hình minh họa; Blitz (đua 60 giây) chưa dùng QuizShell.
