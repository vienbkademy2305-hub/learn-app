# TÀI KHOẢN & LƯU TIẾN ĐỘ THEO TÀI KHOẢN (kế hoạch + trạng thái)

- **Ngày:** 2026-09-28.
- **Yêu cầu người dùng:** "xây dựng tài khoản, đăng nhập bằng tên tài khoản và mật khẩu, sau khi đăng nhập lưu tiến độ của từng tài khoản".
- **Người dùng chốt:** dùng **Supabase** (giữ web tĩnh trên GitHub Pages); **chỉ quản trị viên tạo tài khoản** (không có đăng ký công khai).
- **Trạng thái:** đã nối project Supabase `nxdjmkcnslhhbpvmrlju` (2026-09-28): bảng + RLS đã tạo; kiểm tra thật với tài khoản tạm (đăng nhập, lưu/đọc, người khác không đọc/ghi được, trang web đăng nhập + đồng bộ giữa 2 trình duyệt) PASS, tài khoản tạm đã xoá. **Còn mở:** tắt sign-up trong Supabase (lúc kiểm tra `disable_signup = false`) trước khi deploy; nên xoay secret key vì đã lộ trong chat.

## 1. Kiến trúc
- Trình duyệt ↔ Supabase trực tiếp (`@supabase/supabase-js`), không có máy chủ riêng. ARCHITECTURE §18 "nhà cung cấp auth: UNRESOLVED" → chốt Supabase Auth.
- Supabase Auth cần e-mail → tên tài khoản được đổi thành địa chỉ ẩn `<tên>@learn-app.local` (không bao giờ gửi mail; đổi được bằng `NEXT_PUBLIC_ACCOUNT_EMAIL_DOMAIN`).
- Một bảng `public.progress(user_id, state jsonb, updated_at)` với **row-level security**: mỗi người chỉ đọc/ghi dòng của mình (`supabase/setup.sql`). Publishable key nằm trong trang web là bình thường; secret key chỉ ở `.env.local` trên máy quản trị.
- Không có biến `NEXT_PUBLIC_SUPABASE_*` → tài khoản tắt, app chạy như trước.

## 2. Tài khoản
- Tên: 3–32 ký tự `a-z 0-9 . _ -`, không phân biệt hoa thường. Mật khẩu ≥ 8 ký tự.
- Quản trị (máy có `.env.local`): `pnpm users:add <tên> <mk>` · `users:passwd <tên> <mk>` · `users:list` · `users:remove <tên>` (xoá cả tiến độ).
- Người học: `/login/` (tên + mật khẩu), `/account/` (trạng thái lưu, số liệu, đổi mật khẩu, đăng xuất). Menu có nút người dùng; chấm xanh = đã lưu, vàng = đang lưu, đỏ = chưa lưu được.
- Phải **tắt đăng ký công khai** trong Supabase (mục 5 bước 3), nếu không ai có publishable key cũng tự tạo được tài khoản qua API.

## 3. Lưu & đồng bộ tiến độ
- `src/features/progress/store.ts`: 2 phạm vi — khách (localStorage như cũ) và tài khoản (bản sao cục bộ theo user + đồng bộ). Mọi màn hình vẫn dùng `useProgress()` nên không phải sửa.
- Mỗi thay đổi khi đã đăng nhập: lưu cục bộ ngay, đẩy lên Supabase sau 1,5 giây (gộp nhiều thay đổi); đẩy ngay khi rời tab / đăng xuất.
- Khi đăng nhập hoặc quay lại tab: `resolveSync` (`src/domain/account.ts`) — sửa cục bộ chưa đồng bộ mà mới hơn bản trên máy chủ thì giữ và đẩy lên; ngược lại lấy bản máy chủ. Tài khoản mới tinh nhận tiến độ khách của trình duyệt đang dùng.
- Mất mạng: vẫn học bình thường trên bản sao cục bộ, trạng thái "Chưa lưu được", tự đẩy lại khi có mạng/quay lại tab.
- **UNRESOLVED:** "bản mới nhất thắng" cho cả khối tiến độ — nếu cùng lúc học trên 2 máy thì thay đổi của máy lưu trước có thể bị ghi đè. Chấp nhận được cho 1 người học; cần gộp theo từng mục nếu sau này có nhu cầu.
- Đăng xuất: màn hình quay về tiến độ khách; bản sao của tài khoản vẫn nằm trong trình duyệt (để đăng nhập lại nhanh) nhưng không hiển thị khi chưa đăng nhập.

## 4. Kiểm tra
- `tests/account.test.ts`: quy tắc tên, đổi tên ↔ e-mail, các nhánh của `resolveSync`.
- `pnpm smoke:accounts`: build với Supabase giả (Playwright trả lời Auth/REST): nút Đăng nhập cho khách, sai mật khẩu báo lỗi tiếng Việt, tài khoản mới nhận tiến độ khách, tự lưu lên máy chủ, trang Tài khoản, đăng xuất không lẫn tiến độ, máy thứ hai thấy đúng tiến độ, tải lại vẫn đăng nhập, menu vừa màn hình 375px. Sau lệnh này chạy `pnpm build` lại trước khi `pnpm smoke`/deploy.

## 5. Cài đặt Supabase (người dùng làm một lần)
1. https://supabase.com → đăng nhập → **New project** (tên tuỳ ý, vùng **Southeast Asia (Singapore)**, đặt mật khẩu database và cất đi).
2. **SQL Editor** → New query → dán toàn bộ `supabase/setup.sql` → **Run**.
3. **Authentication → Sign In / Providers**: tắt **Allow new users to sign up**.
4. **Project Settings → API Keys** (hoặc nút **Connect**): chép Project URL, Publishable key, Secret key vào `.env.local` theo mẫu `.env.example`.
5. `pnpm users:add <tên> <mật khẩu>` → `pnpm dev` thử đăng nhập → `pnpm deploy:pages` (build tự đọc `.env.local`).
