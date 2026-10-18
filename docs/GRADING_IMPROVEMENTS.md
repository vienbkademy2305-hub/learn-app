# Cải thiện chấm bài viết và chấm nói (2026-10-18)

## Vấn đề
- **Viết:** chỉ dùng được khi đã đăng nhập + máy chủ (Edge Function `grade-writing`) + khóa Gemini; chưa có phản hồi nào trước khi gửi; AI có thể nâng band dù bài quá ngắn, hoặc "bịa" lỗi trích không có trong bài; chấm lại bài không đổi tốn lượt và ra điểm lệch.
- **Nói (trên điện thoại):** chỉ có nhận dạng giọng nói của trình duyệt → biết bạn nói *gì*, không biết nói *thế nào*; trước đây lấy phương án tốt nhất trong 5 phương án nên dễ cho điểm cao.

## Đã làm (có test)
1. `src/domain/en-precheck.ts` — kiểm tra nhanh không cần AI/đăng nhập, hiện ngay dưới ô viết: độ dài so với khung, chia đoạn, độ dài câu, từ nối, từ lặp, viết hoa I, câu không viết hoa, dấu phẩy nối câu, tiếng Việt lẫn vào. Chặn gửi AI khi bài rỗng/tiếng Việt.
2. `grade-writing/grader.ts` — `temperature 0.2`; `lengthCap` ép trần band TR/TA khi thiếu số từ (đúng như prompt đã yêu cầu); bỏ lỗi AI trích sai (cụm `wrong` không có trong bài).
3. Nút chấm: không chấm lại khi bài chưa đổi ("Sửa bài để chấm lại").
4. `speech-match.ts: assessSpeech` + `recognize.ts` — dùng độ tin cậy của nhận dạng (Chrome/Android; Safari không có thì bỏ qua), không cho 100 điểm nếu chỉ phương án phụ đúng, báo nói quá chậm/nhanh, gợi ý bằng tiếng Việt.

## Cần bạn làm để có hiệu lực
- Deploy lại Edge Function: `supabase functions deploy grade-writing` (phần 2 chỉ chạy trên máy chủ).

## Phương án tiếp (chưa làm — cần khóa Gemini để thử)
- **Chấm nói bằng âm thanh thật trên điện thoại:** Gemini nhận file âm thanh → Edge Function `grade-speaking` trả điểm phát âm/lưu loát/từ vựng + từ nào sai. Chính xác hơn nhận dạng của trình duyệt và không cần máy tính chạy OpenPronounce. Cùng khóa, cùng hạn mức với chấm viết.
- **Chấm hai lần lấy trung vị** cho bài thi thử (giảm dao động ±0.5 band).
- **Bài mẫu neo điểm** (3 bài đã biết band) đưa vào prompt để hiệu chuẩn.
