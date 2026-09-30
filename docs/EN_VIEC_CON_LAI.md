# Tiếng Anh: việc đã xong và việc còn lại (bàn giao 2026-09-30)

Đọc file này đầu phiên mới. Liên quan: `EN_AUDIO_PLAN.md`, `EN_WRITING_GRADER_PLAN.md`, `NANG_CAP_4_VIEC_PLAN.md` (kế hoạch từ một phiên khác, chờ duyệt), `ENGLISH_SPLIT_PLAN.md`. Skill soạn dữ liệu: `.claude/skills/english-content`.

## 1. Đã xong (commit 2026-09-30)

- **Giai đoạn 2 hoàn chỉnh:** Buổi 21–45, ngữ pháp `en-g2-01…25`, bài kiểm tra `gd2-mini-1…4` + `gd2-final` (101 câu, phủ Buổi 21–44). Nguồn tham khảo: khóa PREP Cơ bản + Trung cấp (`prep-co-ban`, `prep-trung-cap` trong `sources.yaml`; bản đồ ở skill `ban-do-tai-lieu.md` §5, §5.1).
- **Giai đoạn 3, phần đầu:** Buổi 46–57 (`en-g3-01…12`), `gd3-mini-1` (46–50), `gd3-mini-2` (51–55).
- IPA/CEFR đã chạy `en:research` + `apply` cho từ đến Buổi 45 (từ Buổi 46 trở đi chưa).
- **Giọng đọc mới (Kokoro, Anh-Anh):** `pnpm en:audio` (`scripts/en-audio.ts`) tạo MP3 vào `public/assets/en-audio/` + `manifest.json`; `src/features/en/speech.tsx` phát MP3 nếu có, không có thì dùng giọng trình duyệt. Người thứ 3 trong hội thoại: cao độ khác (giọng trình duyệt).
- Sửa lỗi dữ liệu cũ: định nghĩa bị cắt đôi ở `b22-x6`, `b24-x5`, `b27-x5`.

## 2. Việc còn lại (theo thứ tự đề xuất)

### 2.1 Tạo xong âm thanh (không cần người dùng làm gì)
- Lần chạy đầu dừng ở khoảng 800/5.157 file (khi đóng phiên). **Chạy lại:** `pnpm en:audio` — chỉ tạo file còn thiếu (tên file = băm giọng + tốc độ + văn bản). Khoảng 17 file/phút → ~4–5 giờ. Chạy nền.
- Sau khi soạn thêm buổi mới: chạy lại `pnpm en:audio` (chỉ tạo phần mới).
- Kiểm tra khi xong: `EN_AUDIO_CHECK=1 pnpm vitest run tests/en-audio.test.ts` (mọi bài nghe/nghe chép có bản thường + chậm, mọi từ/câu có file, mọi file tồn tại).
- **Cần hỏi người dùng:** kế hoạch `NANG_CAP_4_VIEC_PLAN.md` ghi người dùng muốn **giọng nữ**. Hiện: từ/câu/cụm mẫu đọc bằng `bf_emma` (nữ), nhưng bài nghe độc thoại và nghe chép dùng `bm_george` (nam) — hằng số `MONOLOGUE_VOICE` trong `scripts/en-audio.ts`. Nếu đổi sang `bf_emma`, các file độc thoại sẽ được tạo lại (băm khác).
- `public/assets/` không nằm trong git → deploy phải chạy từ máy đã có file.

### 2.2 Soạn nốt Giai đoạn 3: Buổi 58–65 + 3 bài kiểm tra
Theo `english-tutor/references/lo-trinh-ielts-6.5.md`. Điểm ngữ pháp đã phân công (id tiếp theo `en-g3-13`):

| Buổi | Chủ đề · kỹ năng | Ngữ pháp dự kiến |
|---|---|---|
| 58 | Kinh tế & tiêu dùng · (Writing/Reading) | Đảo ngữ cơ bản: Never / Rarely / Not only … but also / Only when |
| 59 | Kinh tế & tiêu dùng · Writing Task 1 bảng số liệu + biểu đồ | So sánh nâng cao: considerably/marginally + so sánh hơn, by far, the + so sánh hơn … the + so sánh hơn |
| 60 | Nghệ thuật & giải trí · (Listening/Reading) | Câu điều kiện loại 3 + hỗn hợp |
| 61 | Nghệ thuật & giải trí · Speaking Part 2 chủ đề trừu tượng | Quá khứ hoàn thành (tiếp diễn) khi kể chuyện |
| 62 | Không gian & khoa học · sửa lỗi đặc trưng người Việt | Tổng hợp lỗi: -s, to be, word-by-word, trật tự tính từ, giới từ cố định |
| 63 | Không gian & khoa học · Writing Task 2 dạng tổng hợp | Câu chẻ nhấn mạnh: It is … that … / What … is … |
| 64 | Luật pháp & đạo đức xã hội · ôn collocation + paraphrase | Ôn paraphrase: chủ động ↔ bị động, danh từ hóa, đồng nghĩa theo ngữ cảnh |
| 65 | Tổng ôn Giai đoạn 3 | Chấm 1 bài Task 1 + Task 2 theo 4 tiêu chí band 6.5 |

Bài kiểm tra: `gd3-mini-3` (Buổi 56–60), `gd3-mini-4` (61–65), `gd3-final` (46–64, ≥ 50 câu). Thêm test cho giai đoạn 3 trong `tests/en-test.test.ts` như test giai đoạn 2.

**Quy trình mỗi buổi (đã dùng ổn định):**
1. Kiểm tra trùng từ: `pnpm en:search <từ>` (hoặc grep `^  - id:` trong `data/en/lexicon/*.yaml`).
2. Viết bundle YAML ở thư mục tạm (mẫu: `docs/en-bundles/b46.yaml` Writing, `b54.yaml` Listening).
3. `node scripts/en-quote-lists.mjs <bundle>` → `pnpm en:merge <bundle>` → `pnpm en:validate` → `pnpm vitest run tests/en-grade.test.ts tests/en-test.test.ts`.
4. Sau cả lô: `pnpm content:export:en`, `pnpm test`.

**Bài học rút ra (test/validator bắt buộc):**
- Mỗi buổi phải có ≥ 1 bài nghe **hội thoại hai giọng** (`Tên: lời` mỗi dòng) VÀ ≥ 1 bài nghe `tf`.
- Bài nghe dạng `completion` phải có `passage` (form/ghi chú) và **passage không được chứa đáp án**.
- `gap-fill`: đáp án phải khớp đúng chữ trong `bank` → không đặt chỗ trống ở đầu câu (tránh viết hoa).
- Trong list dạng `[...]`, mục có dấu phẩy trong ngoặc phải bọc `"..."` — `en-quote-lists.mjs` tự làm.
- Không đưa số liệu "thật" chưa kiểm chứng vào câu ví dụ: ghi "(số liệu giả định)" hoặc dùng quốc gia không nêu tên.
- Sau khi soạn xong GĐ3: `pnpm en:research` + `pnpm en:research:apply` cho từ mới.

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
