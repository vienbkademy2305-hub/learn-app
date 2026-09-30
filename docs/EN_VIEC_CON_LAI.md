# Tiếng Anh: việc đã xong và việc còn lại (bàn giao 2026-09-30)

Đọc file này đầu phiên mới. Liên quan: `EN_AUDIO_PLAN.md`, `EN_WRITING_GRADER_PLAN.md`, `NANG_CAP_4_VIEC_PLAN.md` (kế hoạch từ một phiên khác, chờ duyệt), `ENGLISH_SPLIT_PLAN.md`. Skill soạn dữ liệu: `.claude/skills/english-content`.

## 1. Đã xong

- **Giai đoạn 2 hoàn chỉnh:** Buổi 21–45, ngữ pháp `en-g2-01…25`, bài kiểm tra `gd2-mini-1…4` + `gd2-final` (101 câu, phủ Buổi 21–44). Nguồn tham khảo: khóa PREP Cơ bản + Trung cấp (`prep-co-ban`, `prep-trung-cap` trong `sources.yaml`; bản đồ ở skill `ban-do-tai-lieu.md` §5, §5.1).
- **Giai đoạn 3 hoàn chỉnh (2026-09-30):** Buổi 46–65 (`en-g3-01…20`), `gd3-mini-1…4` + `gd3-final` (phủ Buổi 46–64). Test giai đoạn 3 trong `tests/en-test.test.ts`. Buổi 58–65: đảo ngữ · Task 1 bảng + biểu đồ · điều kiện loại 3/hỗn hợp + Matching features · Part 2 chủ đề trừu tượng (quá khứ hoàn thành) · lỗi người Việt + soát lỗi 3 lượt · Task 2 đề kết hợp (câu chẻ) · ôn paraphrase (Reading/Listening) · tổng ôn + tự chấm 4 tiêu chí.
- IPA/CEFR: `en:research` + `apply` đã chạy cho từ đến Buổi 45; từ Buổi 46–65 xem mục 2.1.
- **Giọng đọc (Kokoro, Anh-Anh):** `pnpm en:audio` (`scripts/en-audio.ts`) tạo MP3 vào `public/assets/en-audio/` + `manifest.json`; `src/features/en/speech.tsx` phát MP3 nếu có, không có thì dùng giọng trình duyệt. Người dùng chọn **giọng nữ** cho độc thoại + nghe chép (2026-09-30): `MONOLOGUE_VOICE = "bf_emma"`. Hội thoại vẫn hai giọng nam/nữ.
- Sửa lỗi dữ liệu cũ: định nghĩa bị cắt đôi ở `b22-x6`, `b24-x5`, `b27-x5`.

## 2. Việc còn lại (theo thứ tự đề xuất)

### 2.1 Âm thanh + IPA/CEFR (không cần người dùng làm gì)
- `pnpm en:audio` chạy nền từ 2026-09-30 (khoảng 3.400 file cần tạo lúc bắt đầu, CHƯA gồm Buổi 58–65 vì lần chạy bắt đầu trước khi soạn). **Chạy lại** `pnpm en:audio` đến khi báo "0 to create" — chỉ tạo file còn thiếu. File giọng nam cũ của độc thoại vẫn nằm trong thư mục (không còn trong manifest), có thể xóa sau.
- Kiểm tra khi xong: `EN_AUDIO_CHECK=1 pnpm vitest run tests/en-audio.test.ts`.
- Nếu `pnpm en:research` + `pnpm en:research:apply` chưa chạy hết cho Buổi 46–65 (xem `.data/research/en-lexicon-report.md`), chạy lại rồi `pnpm content:export:en`.
- `public/assets/` không nằm trong git → deploy phải chạy từ máy đã có file.

### 2.2 Giai đoạn 3 — đã xong
Quy trình soạn (dùng lại khi sửa): bundle YAML ở thư mục tạm → `node scripts/en-quote-lists.mjs <bundle>` → `pnpm en:merge <bundle>` → `pnpm en:validate` → `pnpm vitest run tests/en-grade.test.ts tests/en-test.test.ts`. Mẫu bundle: `docs/en-bundles/b46.yaml`, `b54.yaml`. Luật: mỗi buổi ≥ 1 bài nghe hội thoại hai giọng + ≥ 1 bài nghe `tf`; `passage` bài nghe không chứa đáp án; `gap-fill` không đặt chỗ trống ở đầu câu; số liệu giả định ghi rõ.

### 2.3 Tự chấm bài viết (`EN_WRITING_GRADER_PLAN.md`) — chờ người dùng
Đã chốt: mô hình `claude-opus-5`. Người dùng cần làm trước:
1. Tắt đăng ký tự do trên Supabase (`disable_signup = true`).
2. Tạo khóa Claude API và lưu làm secret Supabase (`supabase secrets set ANTHROPIC_API_KEY=…`) — **không gửi khóa qua chat**.
Sau đó làm W1 → W4 trong kế hoạch.

### 2.4 Giai đoạn 4 (Buổi 66–80)
Người dùng có tài liệu ở thư mục Google Drive riêng tư `1dQlXWNkJRl_4Ryyzm0918N2K11C46RQb` — Claude không đọc được, cần tải về `D:\Lean - Ngoại ngữ\tai-lieu-nguon\tieng-anh\`. GĐ4 = luyện đề tổng hợp (mock test), không dạy nội dung mới.

### 2.5 Kế hoạch từ phiên khác (`NANG_CAP_4_VIEC_PLAN.md`) — chờ duyệt
Gồm: giọng nữ, Giai đoạn 3, tự chấm bài viết, **game học thuộc từ**. Ba việc đầu trùng với mục 2.1–2.3; game học từ chưa làm.

## 3. Deploy
- `pnpm deploy:pages` (GitHub Pages, >10 phút). Hiện deploy với **tài khoản TẮT** vì Supabase còn `disable_signup=false`: build với biến `NEXT_PUBLIC_SUPABASE_URL=` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` rỗng. Khi người dùng tắt đăng ký tự do → deploy bình thường.
- Âm thanh MP3 tiếng Anh chưa tạo xong thì web vẫn chạy (lùi về giọng trình duyệt cho phần thiếu).
