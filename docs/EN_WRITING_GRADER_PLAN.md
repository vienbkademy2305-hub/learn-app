# Kế hoạch: tự động chấm bài viết tiếng Anh

Trạng thái: **CHỜ DUYỆT** (2026-09-29). Chưa sửa code app.

## 1. Mục tiêu

Bấm "Chấm bài" ngay dưới ô bài về nhà (`HomeworkBox`) và nhận kết quả **giống cách gia sư chấm trong chat**:
1. Band ước lượng cho 4 tiêu chí IELTS (TR/TA, CC, LR, GRA) + band tổng, kèm nhận xét tiếng Việt.
2. **Bảng lỗi**: Bạn viết → Sửa đúng → Vì sao (có liên hệ buổi đã học, VD "a/an + danh từ số ít — Buổi 18").
3. **Bản sửa hoàn chỉnh**, giữ ý của bạn.
4. **Điểm yếu nhất và 3 việc cần làm**.
5. Đánh dấu các **lỗi riêng của bạn** (viết hoa I, -s số nhiều, a/an, comma splice, nhầm từ loại, dịch word-by-word) để theo dõi tiến bộ.
6. Lưu lịch sử bài đã chấm, xem lại được.

## 2. Vì sao không chấm được "tại chỗ" trong trình duyệt

Site là trang tĩnh trên GitHub Pages. Chấm bài viết cần một mô hình ngôn ngữ lớn (Claude). **Khóa API không được đặt trong code trang web**: ai mở trang cũng lấy được khóa. Vì vậy cần một điểm trung gian phía máy chủ giữ khóa. Dự án đã có sẵn **Supabase** (tài khoản, bảng tiến độ `progress_en`).

## 3. Kiến trúc đề xuất

```
HomeworkBox (trình duyệt, đã đăng nhập)
   │  POST { lesson, prompt_en, kind, text }  + token đăng nhập Supabase
   ▼
Supabase Edge Function  grade-writing   (giữ ANTHROPIC_API_KEY dạng secret)
   │  1. kiểm tra đăng nhập + hạn mức (VD 10 bài/ngày/người)
   │  2. gọi Claude API (SDK @anthropic-ai/sdk)
   │  3. lưu kết quả vào bảng writing_grades
   ▼
Kết quả JSON → UI hiển thị bảng lỗi, band, bản sửa
```

- **Mô hình:** `claude-opus-5` (mặc định), thinking thích ứng (`{type: "adaptive"}`), effort `high`. Bật **refusal fallback** phía server (`fallbacks: "default"`) để một lần bị từ chối nhầm không làm hỏng lượt chấm.
- **Đầu ra có cấu trúc:** `output_config.format` với JSON Schema → luôn trả đúng khuôn (band từng tiêu chí, mảng lỗi `{wrong, right, why_vi, type, lesson?}`, `corrected`, `weakest`, `actions[3]`, `word_count`, `personal_errors[]`).
- **Prompt:** phần cố định (vai trò giám khảo, thang band descriptor tự viết từ `english-tutor/references/tieu-chi-cham-diem.md`, danh sách lỗi riêng của học viên, quy ước trả lời bằng tiếng Việt) đặt trong `system` và bật **prompt caching**. Phần thay đổi (đề bài, bài làm, buổi học, điểm ngữ pháp/từ vựng mục tiêu của buổi) nằm sau → chi phí phần cố định giảm ~90% từ lần thứ hai.
- **Bảng mới** `writing_grades` (RLS: mỗi người chỉ đọc bài của mình): `user_id, lesson, prompt, text, result jsonb, model, created_at`.
- **UI:** nút "Chấm bài" (chỉ hiện khi đã đăng nhập và đủ số từ tối thiểu), trạng thái "Đang chấm…" (30–90 giây), rồi hiển thị kết quả; trang "Bài viết đã chấm" liệt kê lịch sử và biểu đồ band theo thời gian.

## 4. Chi phí ước tính (giá API Anthropic 2026)

| Mô hình | Giá vào / ra (USD cho 1 triệu token) | Ước tính mỗi bài Task 2 (~280 từ) |
|---|---|---|
| `claude-opus-5` (đề xuất) | $5 / $25 | ~0,10–0,15 USD (~2 500–4 000 đ) |
| `claude-sonnet-5` (rẻ hơn, nếu bạn chọn) | $2 / $10 | ~0,04–0,06 USD (~1 000–1 500 đ) |

Giả định: ~4 000 token vào (phần lớn được cache), ~4 000–5 000 token ra (gồm suy luận + bảng lỗi + bản sửa). Học 1 bài/ngày ≈ 3–4,5 USD/tháng với Opus 5. Có hạn mức ngày để tránh tốn ngoài ý muốn.

## 5. Độ tin cậy của điểm

- Band là **ước lượng**, không thay giám khảo thật. Mỗi kết quả hiện ghi chú "Band ước lượng bởi AI".
- Kiểm tra chất lượng trước khi mở cho dùng: chấm 10–15 bài mẫu (gồm bài bạn đã được chấm trong chat, VD bài Buổi 0/1 trong `nhat-ky-hoc-tap`) và so với nhận xét của gia sư; chỉnh prompt đến khi lệch không quá 0,5 band.
- Không gửi thông tin cá nhân thừa: chỉ gửi đề + bài làm + mã buổi học.

## 6. Điều kiện trước khi làm

1. **Tài khoản phải bật trên web.** Hiện site deploy với tài khoản TẮT vì Supabase còn `disable_signup = false`. Cần tắt đăng ký tự do trước (nếu không, người lạ tạo tài khoản và dùng chấm bài tốn tiền của bạn).
2. **Khóa Claude API** (tạo ở console.anthropic.com, nạp tiền trả trước). Khóa chỉ lưu làm secret của Supabase (`supabase secrets set ANTHROPIC_API_KEY=…`), **không gửi qua chat**.
3. Cài Supabase CLI để deploy Edge Function (hoặc dán code qua dashboard).

## 7. Các bước

| Bước | Việc | Kết quả |
|---|---|---|
| W0 | Bạn chốt: mô hình, hạn mức/ngày, có lưu lịch sử không | Chốt |
| W1 | Viết prompt + JSON Schema; script thử `pnpm en:grade:try <file>` chạy trên máy với 10–15 bài mẫu | Bạn duyệt chất lượng chấm |
| W2 | Edge Function `grade-writing` + bảng `writing_grades` + RLS (SQL để bạn chạy như `en-progress.sql`) | Chấm được qua API |
| W3 | UI trong HomeworkBox + trang lịch sử | Chạy local |
| W4 | Test (schema, lỗi mạng, hết hạn mức, bị từ chối) + commit + deploy khi bạn đồng ý | Lên web |

## 8. Phương án không tốn tiền API (tạm thời)

Nút "Gửi cho gia sư": lưu bài vào `nhat-ky-hoc-tap/tieng-anh/` rồi nhắn Claude trong chat (skill `english-tutor`) để chấm như hiện nay. Không tự động, nhưng không cần khóa API.
