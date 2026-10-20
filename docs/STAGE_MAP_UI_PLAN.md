# Giao diện "Bản đồ chặng" (mobile-first)

Mục tiêu: trang `/en` và `/zh` hiện là danh sách dài các buổi/bài. Đổi thành **bản đồ các chặng** — mỗi chặng là một icon lớn; chạm vào thì mở danh sách bài của chặng đó. Đẹp và dễ bấm bằng một ngón tay trên điện thoại (tham khảo ảnh màn "Bài học 36", vòng tròn tiến độ + sao + nút Bắt đầu).

## 1. Chia chặng (dữ liệu có sẵn, không phải soạn mới)
| Phần | Hiện có | Chặng đề xuất |
|---|---|---|
| Tiếng Anh | 80 buổi, 4 giai đoạn (20/25/20/15) | 8 chặng × 10 buổi, gom dưới 4 giai đoạn (GĐ1: chặng 1–2, GĐ2: 3–5 (đệm 25 buổi → 2×10 + 1×5, hoặc 5 chặng đều theo chủ đề), GĐ3: chặng 6–7, GĐ4: chặng 8) |
| Tiếng Trung | HSK1 14 bài · HSK2 23 bài · HSK3 19 bài | HSK1: 2 chặng × 7 · HSK2: 3 chặng (8/8/7) · HSK3: 3 chặng (6/6/7); chặng 0 "Pinyin" cho người mới |
- Mỗi chặng có: tên (vd "Chặng 3 · Chợ & mua sắm"), icon emoji/SVG, màu riêng, mô tả 1 dòng. Cấu hình ở một file duy nhất `src/content/stages.ts` (id, lang, tiêu đề, danh sách slug bài) — không đụng dữ liệu bài học.

## 2. Bố cục
**Điện thoại (chính):**
- Đầu trang: thẻ nhỏ "Tiếp tục: Buổi N …" + vòng tiến độ tổng + 🔥 chuỗi (dùng dữ liệu hiện có).
- Bản đồ dọc: các nút chặng nối bằng đường uốn lượn (zig-zag trái–phải). Nút tròn ~84px, vòng ngoài là **vòng tiến độ** (số bài đã xong / tổng), 3 trạng thái: đã xong (xanh + ✓), đang học (cam, nhịp nhẹ), chưa mở (xám, vẫn bấm được để xem — không khóa cứng).
- Chạm vào chặng → **bottom sheet** trượt từ dưới lên (chiếm ~75% màn hình, vuốt xuống để đóng): tiêu đề chặng, thanh tiến độ, danh sách bài (số, tên, ✓/●/○, số sao nếu có). Chạm bài → vào bài. Nút lớn "Học tiếp" ghim đáy sheet.
- Thanh điều hướng đáy (4 mục: Học · Luyện · Truyện · Tôi) thay cho hàng link trên đầu mà điện thoại đang ẩn (xem `NAV` trong SiteChrome).

**Máy tính:** cùng bản đồ nhưng 2 cột: trái bản đồ, phải là danh sách bài của chặng đang chọn (không dùng bottom sheet).

## 3. Kỹ thuật
- Server component dựng bản đồ từ `stages.ts` + `enContent()`/`lessonsOfLevel()`; phần tương tác (mở sheet, tiến độ) là client component nhỏ đọc `useProgress`/`useEnProgress` sẵn có → vẫn xuất tĩnh được.
- Chọn chặng lưu trong URL hash (`/en#chang-3`) để nút Back của điện thoại đóng sheet thay vì thoát trang.
- Tái dùng `EnLessonList` và danh sách bài HSK hiện có bên trong sheet — không viết lại.
- Truy cập: nút ≥ 44px, `aria-expanded`, đóng sheet bằng Esc/vuốt, tôn trọng `prefers-reduced-motion`.
- Test: hàm gom chặng (mỗi bài thuộc đúng 1 chặng, đủ số bài) + tính % tiến độ chặng.

## 4. Các bước làm
1. `stages.ts` + test độ phủ (mọi bài thuộc 1 chặng).
2. Component `StageMap` + `StageSheet`; thay danh sách ở `/en` và `/zh` (giữ đường dẫn cũ `/zh/hsk/[level]`).
3. Thanh điều hướng đáy cho mobile.
4. Kiểm bằng trình duyệt ở 390×844 và 1280px.

## Cần bạn chọn
- Đặt tên chặng theo **chủ đề** (khuyên dùng, dễ nhớ) hay chỉ "Chặng 1, 2, 3…"?
- Có muốn chặng **khóa dần** (xong chặng này mới mở chặng sau) hay mở hết?
