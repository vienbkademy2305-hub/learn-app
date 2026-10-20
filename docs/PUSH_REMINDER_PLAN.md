# Nhắc học tự động theo tài khoản (Web Push)

Mục tiêu: mỗi người dùng đã đăng nhập tự nhận thông báo vào giờ mình chọn, **chỉ khi hôm đó chưa học**.

## Luồng
1. Trang `/hom-nay` → thẻ "Nhắc học tự động" ([PushPanel.tsx](../src/features/activity/PushPanel.tsx)): xin quyền, đăng ký `PushManager`, lưu `endpoint/p256dh/auth`, múi giờ, giờ nhắc vào `public.push_reminders` ([supabase/push.sql](../supabase/push.sql)).
2. Khi hôm nay có XP > 0, [PushSync.tsx](../src/features/activity/PushSync.tsx) ghi `last_study_date` (ngày địa phương) lên bảng đó.
3. `pg_cron` gọi Edge Function `push-reminder` mỗi 15 phút. Hàm gửi push cho dòng thỏa [`isDue`](../supabase/functions/push-reminder/due.ts): đã qua giờ nhắc, chưa học hôm nay, chưa gửi hôm nay. Endpoint hết hạn (404/410) thì xoá dòng.
4. [public/sw.js](../public/sw.js) hiện thông báo và mở `/hom-nay/` khi bấm.

## Giới hạn
- Chỉ tài khoản đăng nhập; mỗi tài khoản một thiết bị (bật trên máy mới thì thay máy cũ).
- iPhone chỉ nhận khi đã thêm app vào màn hình chính (iOS 16.4+).
- Độ trễ tối đa ~15 phút so với giờ đặt.

## Triển khai (làm một lần; ảnh hưởng dữ liệu thật nên chỉ chạy khi chủ dự án đồng ý)
1. `node scripts/push-keys.mjs` → ghi `NEXT_PUBLIC_VAPID_PUBLIC_KEY` vào `.env.local`.
2. Supabase → SQL Editor: chạy [supabase/push.sql](../supabase/push.sql); bật extension `pg_cron`, `pg_net`.
3. `npx supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:… PUSH_CRON_SECRET=… --project-ref nxdjmkcnslhhbpvmrlju`
4. `npx supabase functions deploy push-reminder --no-verify-jwt --project-ref nxdjmkcnslhhbpvmrlju`
5. Chạy đoạn `cron.schedule(...)` ở cuối push.sql (thay `<PROJECT_REF>`, `<PUSH_CRON_SECRET>`).
6. `pnpm deploy:pages` (build phải có `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
7. Thử: đăng nhập, bật thông báo với giờ nhắc = vài phút nữa, chưa học → nhận thông báo trong ≤ 15 phút.
