# Tiếng Anh: việc đã xong và việc còn lại (bàn giao 2026-10-05)

Đọc file này đầu phiên mới. Liên quan: `EN_AUDIO_PLAN.md`, `EN_WRITING_GRADER_PLAN.md`, `NANG_CAP_4_VIEC_PLAN.md`, `ENGLISH_SPLIT_PLAN.md`. Skill soạn dữ liệu: `.claude/skills/english-content` (ở `D:\Lean - Ngoại ngữ\.claude\skills\`, ngoài repo).

## 1. Đã xong

- **Lộ trình đủ 80 buổi.** Giai đoạn 1–3 (Buổi 1–65) như trước; bài kiểm tra `gd1…gd3` (mini + final).
- **Giai đoạn 4 hoàn chỉnh (2026-10-05):** Buổi 66–80, không dạy nội dung mới, không có bước Từ vựng/Ngữ pháp, không có bài kiểm tra `gd4` (chính các buổi là đề thi thử).
  - 66–68: Mock Listening + Reading đủ 40 + 40 câu (Mock 3 có bản đồ, nối nửa câu, tóm tắt có hộp từ).
  - 69–71: Mock Writing đủ 2 Task trong 60 phút (đường + Agree/Disagree · quy trình + Discussion · bản đồ + Causes/Solutions). Một ô bài về nhà cho cả hai Task (`kind: task2`, 400–520 từ), mỗi buổi có bài mẫu ở `demo`.
  - 72–74: Mock Speaking đủ 3 Part (có câu trả lời mẫu), tự chấm FC/LR/GRA/P.
  - 75–76: luyện riêng theo lỗi trong hồ sơ học viên (F/NG, nhầm chủ thể, bẫy Part 1, giới hạn số từ · mạo từ, -s, comma splice, từ loại, danh từ không đếm được, âm cuối).
  - 77: mock đủ 4 kỹ năng · 78: chữa đề 77 + danh sách lỗi ngày thi · 79: chiến thuật phòng thi · 80: mock cuối + tổng kết lộ trình.
  - Bundle ở `docs/en-bundles/b66.yaml … b80.yaml`.
- **Game học thuộc từ: F1–F4 xong.**
  - F3: `definition_en` tự viết cho đủ 1.244 từ (≤ 15 từ, không chứa chính từ đó, provenance `ai-draft`) — `scripts/en-apply-definitions.mjs <defs.tsv> [--dry] [--force]`. Test giữ chất lượng trong `tests/en-grade.test.ts`. Game "nghĩa tiếng Anh → từ" của tiếng Anh dùng trường này.
  - F4: tiếng Trung — thẻ "🎯 Học thuộc (game)" trong bước Luyện tập (`/zh/lesson/<slug>/practice/game/`); tiếng Anh — khung "Học thuộc từ của buổi này" cuối bước Từ vựng. `WordGame` có prop `lockLesson`. Tiến độ dùng chung với trang flashcards.
- **Giọng đọc (Kokoro, Anh-Anh):** `pnpm en:audio` tạo MP3 vào `public/assets/en-audio/`; độc thoại + nghe chép giọng nữ `bf_emma`.

## 2. Việc còn lại

### 2.1 Âm thanh (không cần người dùng làm gì)
- `pnpm en:audio` chạy nền từ 2026-10-05 sáng (863 file thiếu, gồm Buổi 58–66; CHƯA gồm Buổi 67–80 vì bắt đầu trước khi soạn). Chạy lại đến khi báo "0 to create". Máy chậm khi đồng thời chạy chép lời video (whisper).
- Kiểm tra: `EN_AUDIO_CHECK=1 pnpm vitest run tests/en-audio.test.ts`. Sau khi đủ âm thanh: deploy lại.
- `public/assets/` không nằm trong git → deploy phải chạy từ máy đã có file.

### 2.2 Tự chấm bài viết (`EN_WRITING_GRADER_PLAN.md`) — chờ người dùng
Máy chủ chấm chỉ chấm cho danh sách tài khoản được phép (VD `vienthao`). Người dùng cần tạo khóa Claude API và lưu làm secret Supabase (`supabase secrets set ANTHROPIC_API_KEY=…`) — **không gửi khóa qua chat**. Sau đó làm W1 → W4.

### 2.3 Rà soát nội dung (khi người dùng có thời gian)
- Mọi mục mới đều `draft`. Định nghĩa `definition_en` và đề mock GĐ4 là bản nháp AI — nên duyệt dần.
- Chép lời video PREP Chuyên sâu (whisper) đang chạy nền trong scratchpad của phiên 76f48a1c; chỉ dùng tham khảo chiến thuật.

## 3. Quy trình soạn/sửa một buổi
Bundle YAML → `node scripts/en-quote-lists.mjs <bundle>` → `pnpm en:merge <bundle>` → `pnpm en:validate` → `pnpm content:export:en` → `pnpm vitest run tests/en-grade.test.ts tests/en-test.test.ts`. Luật: mỗi buổi ≥ 1 bài nghe hội thoại hai giọng + ≥ 1 bài nghe `tf`; `passage` bài nghe không chứa chuỗi đáp án (kể cả chữ số trùng số khác trong phiếu — dùng đáp án dạng chữ + `accept` chữ số); `gap-fill` không đặt chỗ trống ở đầu câu; số liệu giả định ghi rõ.

## 4. Deploy
- `pnpm deploy:pages` (GitHub Pages, >10 phút), bật tài khoản (giữ đăng ký tự do).
- Lần deploy 2026-10-02 (Buổi 66) THẤT BẠI vì mất mạng (không phân giải được github.com); lần deploy thành công trước đó: 2026-09-30.
