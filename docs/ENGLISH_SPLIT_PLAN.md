# Tách web: học tiếng Trung hoặc tiếng Anh — AUDIT & PLAN

Ngày: 2026-09-28 · Trạng thái: **ĐANG THỰC HIỆN** — người dùng chốt thứ tự: soạn xong Giai đoạn 1 → dựng UI → chạy local (xem mục 6)

Yêu cầu: người học vào web chọn 1 trong 2 ngôn ngữ (Tiếng Trung / Tiếng Anh) rồi học riêng ngôn ngữ đó. Dữ liệu tiếng Anh được biên soạn bằng skill `english-content` (research, tìm kiếm, biên soạn, sửa, kiểm tra), nguồn một phần do người dùng cung cấp.

## 1. AUDIT — hiện trạng (đã kiểm tra trong source)

| Mục | Hiện trạng | Ảnh hưởng khi tách |
|---|---|---|
| Route | Toàn bộ trang tiếng Trung ở gốc: `/`, `/hsk/[level]`, `/lesson/[slug]/…`, `/word/[word]`, `/practice`, `/listening`, `/flashcards`, `/pinyin`, `/sources`; chung: `/login`, `/account` | `/` phải thành trang chọn ngôn ngữ |
| Layout | `src/app/layout.tsx` cứng tên "Học tiếng Trung HSK1", logo 学, menu HSK1/Bài tập/Luyện nghe/Sổ từ, footer ghi nguồn tiếng Trung | Cần layout riêng cho từng ngôn ngữ, layout gốc chỉ giữ phần chung |
| Nội dung | `src/content/load.ts` đọc snapshot `.data/content/hsk1.json` (`pnpm content:export`); kiểu dữ liệu `src/content/types.ts` gắn với chữ Hán/pinyin | Tiếng Anh cần snapshot và kiểu riêng |
| Tiến độ | `src/features/progress/store.ts`: một `ProgressState` trong localStorage `chinese-app:progress:v1` (và `…:user:<uid>`); khóa theo slug từ/bài | Cần tách theo ngôn ngữ |
| Tài khoản | Supabase bảng `progress` (`supabase/setup.sql`): **1 dòng/người**, `state jsonb`, đồng bộ theo `updated_at` (bản mới hơn thắng) | Gộp 2 ngôn ngữ vào 1 dòng → học Anh trên máy này, Trung trên máy kia sẽ ghi đè nhau |
| Deploy | Site tĩnh `output: "export"`, GitHub Pages `/learn-app` | Không có redirect phía server; chuyển hướng URL cũ phải làm ở trình duyệt |
| Dữ liệu tiếng Anh | **Mới tạo hôm nay**: `data/en/` + `importers/en/load.ts` + `pnpm en:validate / en:search / en:stats` + `tests/en-content.test.ts`; Buổi 1 chuyển từ `nhat-ky-hoc-tap` (bản nháp) | Nguồn cho phần tiếng Anh của web |

## 2. Quyết định cần người dùng chốt (kèm đề xuất)

**Q1. Đường dẫn.**
- **(A) Đề xuất:** `/` = trang chọn ngôn ngữ; tiếng Trung chuyển vào `/zh/…`, tiếng Anh ở `/en/…`. Đường dẫn cũ (`/lesson/…`, `/hsk/1`…) được trang 404 tự chuyển sang `/zh/…` nên link đã lưu vẫn dùng được. Cấu trúc gọn, cân xứng.
- (B) Giữ nguyên URL tiếng Trung, chỉ thêm `/en/…`; `/` thành trang chọn. Ít thay đổi hơn nhưng lẫn lộn lâu dài.

**Q2. Tiến độ trên tài khoản.**
- **(A) Đề xuất:** thêm cột `lang` vào bảng `progress` (khóa chính `user_id, lang`) — mỗi ngôn ngữ đồng bộ độc lập. Cần chạy 1 đoạn SQL trong Supabase (an toàn, dữ liệu cũ tự thành `zh`).
- (B) Không đổi DB, gộp `{zh, en}` vào cùng `state` — có rủi ro ghi đè nêu ở mục 1.

**Q3. Âm thanh tiếng Anh:** giai đoạn đầu dùng giọng đọc của trình duyệt (chọn Anh-Anh/Anh-Mỹ), như Bài 0 pinyin. Dữ liệu đã chừa chỗ cho file audio thật sau này.

**Q4. License nội dung tự soạn:** đề xuất CC BY-SA 4.0 (cùng phần tiếng Trung) — đang ghi ở `data/en/sources.yaml`, chờ xác nhận.

## 3. DATA MODEL tiếng Anh

Lược đồ đầy đủ ở `.claude/skills/english-content/references/data-schema.md` (thư mục `D:\Lean - Ngoại ngữ`). Tóm tắt:
- `data/en/sources.yaml` — nguồn + giấy phép + `usage` (import / fact / reference) + `publishable`. Sách người dùng gửi (VD *Essential Grammar in Use*, *Tree or Three?*) là `reference`, không công bố nội dung.
- `data/en/lexicon/<a-z>.yaml` — từ/cụm từ canonical, id `headword|pos` (IPA UK/US, CEFR, nghĩa Việt, collocation, lỗi người Việt, provenance).
- `data/en/sentences/buoi-NN.yaml` — câu (id `bNN-NNN`), liên kết từ + ngữ pháp.
- `data/en/grammar/giai-doan-k.yaml` — điểm ngữ pháp (id `en-gK-NN`), cùng dạng với ngữ pháp HSK1.
- `data/en/lessons/buoi-NN-slug.yaml` — buổi học theo lộ trình IELTS 80 buổi của skill `english-tutor`: vocabulary → pronunciation → grammar → examples → dialogue → exercises → homework. Bài tập có `kind` + mã dạng `bank_no` (#1–#33).

Snapshot cho web: `pnpm content:export:en` → `.data/content/en.json` (chỉ nguồn `publishable`), kiểu `EnContentSnapshot` riêng trong `src/content/en-types.ts`.

Tiến độ: `ProgressState` giữ nguyên hình dạng, có 1 bản cho mỗi ngôn ngữ. localStorage: tiếng Trung **giữ nguyên key cũ** (không mất tiến độ đang có), tiếng Anh dùng `chinese-app:en:progress:v1`.

## 4. IMPLEMENT — các bước (mỗi bước test xong mới sang bước sau)

| Bước | Nội dung | Kiểm tra |
|---|---|---|
| **E0** ✅ | Skill `english-content`, `data/en/`, công cụ validate/search/stats, Buổi 1 mẫu | `pnpm en:validate` 0 lỗi, `tests/en-content.test.ts` đạt |
| **E1** Tách khung | Trang chọn ngôn ngữ ở `/` (nhớ lựa chọn gần nhất, nút "Tiếp tục học …"); chuyển route Trung vào `src/app/zh/` + layout riêng; layout gốc chỉ còn phần chung + nút đổi ngôn ngữ; chuyển hướng URL cũ; store tiến độ nhận tham số ngôn ngữ; SQL `lang` (nếu Q2 = A) | `pnpm test`, `pnpm build`, `pnpm smoke` (cập nhật URL), `smoke:accounts`; tiến độ tiếng Trung cũ còn nguyên |
| **E2** Bài học tiếng Anh (xem) | Exporter + trang `/en`, `/en/lo-trinh`, `/en/lesson/[slug]/…` các bước Từ vựng, Phát âm, Ngữ pháp, Câu ví dụ, Hội thoại; trang từ `/en/word/[id]`; nghe bằng giọng máy; nhãn "Bản nháp" | build + smoke các trang tiếng Anh |
| **E3** Bài tập tiếng Anh | Bộ chấm theo `kind`: gap-fill, verb-form, mcq, error-correction, tfng trước; lưu điểm theo `exercise id`; bài về nhà: ô viết + đếm từ, lưu trên máy | unit test bộ chấm + smoke |
| **E4** Luyện tập | Dùng lại Sổ từ/Flashcard (tổng quát hóa để nhận từ tiếng Anh), nghe chép chính tả, luyện nói — **audit riêng trước khi làm** (chấm phát âm tiếng Anh khác hẳn chấm thanh điệu) | theo kế hoạch riêng |
| **E5** Deploy | `pnpm deploy:pages` | **chỉ khi người dùng đồng ý** |

Dùng chung giữa 2 ngôn ngữ: tài khoản, store tiến độ, khung bước bài học (`StepTabs`, `StepFooter`), `ExerciseRunner`, nút âm thanh, Flashcard (sau khi tổng quát hóa). Riêng tiếng Trung: chữ Hán, pinyin, Hán Việt, tập viết, chấm thanh điệu. Riêng tiếng Anh: IPA, trọng âm, hội thoại, các dạng bài IELTS. Không chuyển thư mục `src/features/` hiện có; phần mới đặt ở `src/features/en/`.

## 5. Rủi ro / UNRESOLVED
- Tên repo/thư mục vẫn là `chinese-app`; đổi tên để sau (đổi tên sẽ làm hỏng đường dẫn trong ghi chú/script).
- CEFR cho từng từ: chưa chọn nguồn chính (EVP hay Oxford 3000/5000, đều có bản quyền, chỉ lấy dữ kiện) — **UNRESOLVED**.
- Giọng máy tiếng Anh khác nhau theo trình duyệt/thiết bị; iPhone có thể thiếu giọng Anh-Anh.
- Luyện nói tiếng Anh (E4) chưa audit — UNKNOWN.

## 6. Kế hoạch thực hiện (chốt 2026-09-28)

Yêu cầu người dùng: "biên soạn xong bài chặng 1 → xây UI → chạy phần tiếng Anh trên local".

Mặc định đang dùng cho các câu hỏi ở mục 2 (đổi được, báo lại nếu không đồng ý): **Q1 = A** (`/zh` + `/en`), **Q3** giọng máy, **Q4** CC BY-SA 4.0. **Q2**: làm code theo phương án A nhưng **không tự chạy SQL trên Supabase** — trên local, tiến độ tiếng Anh lưu trong trình duyệt; đồng bộ tài khoản cho tiếng Anh bật sau khi người dùng chạy `supabase/en-progress.sql`.

### Chặng A — Biên soạn Giai đoạn 1 (Buổi 1–20)
Buổi 1 đã có (bản nháp). Soạn Buổi 2 → 20 theo đúng `lo-trinh-ielts-6.5.md` + bản đồ unit EGIU / ToT (`ban-do-tai-lieu.md`). Mỗi buổi:

| Phần | Khối lượng |
|---|---|
| Từ vựng | 15–20 mục (dùng lại id cũ nếu đã có) |
| Phát âm | 3–5 ghi chú theo âm ToT của buổi |
| Ngữ pháp | 1 điểm chính `en-g1-NN` (Buổi 20: bảng hệ thống 12 thì) |
| Câu ví dụ | 6–8 câu buổi + 1 câu cho mỗi từ chưa có ví dụ |
| Hội thoại | 6–10 lượt |
| Bài tập | 5 bài (nhóm A+B + 1 bài đọc T/F/NG hoặc nghe chép) |
| Về nhà | đoạn văn 60–120 từ |

Làm theo lô 4–5 buổi: A1 = Buổi 2–5, A2 = 6–10, A3 = 11–15, A4 = 16–20. `pnpm en:validate` sau **mỗi buổi** (0 lỗi), báo cáo sau mỗi lô.
Quy ước nghiên cứu: IPA điền `ai-draft` (ghi provenance), CEFR để `null` (UNRESOLVED) — đối chiếu IPA/CEFR là một đợt research riêng (R) sau khi chọn nguồn CEFR; không chặn UI. Toàn bộ `status: draft`.

### Chặng B — Dựng UI (E1–E3 ở mục 4)
- **E1** tách khung: `/` chọn ngôn ngữ, tiếng Trung sang `/zh/…` (URL cũ tự chuyển), store tiến độ theo ngôn ngữ.
- **E2** xem bài tiếng Anh: `pnpm content:export:en` → `.data/content/en.json`; trang `/en`, lộ trình 20 buổi, bài học 7 bước, trang từ, nút nghe giọng máy, nhãn "Bản nháp".
- **E3** bài tập: chấm gap-fill / verb-form / mcq / error-correction / tfng / word-form / transformation; bài về nhà có đếm từ.
- E4 (flashcard/luyện nói tiếng Anh) để sau, cần audit riêng.

### Chặng C — Chạy local
`pnpm test` + `pnpm build` + smoke; chạy `pnpm dev` (hoặc bản build tĩnh) và gửi đường dẫn `http://localhost:…/en`. **Không commit / push / deploy** khi người dùng chưa đồng ý.

### Kết quả (2026-09-28, chưa commit)
- **Chặng A xong**: Buổi 1–20 trong `data/en/` (358 từ, 308 câu, 20 điểm ngữ pháp `en-g1-01…20`), toàn bộ `draft`, IPA `ai-draft`, CEFR `null`. Soạn song song với phiên Claude thứ hai (Buổi 6–10, 16–20). Công cụ mới: `pnpm en:merge <bundle.yaml>` (scripts/en-merge.ts).
- **Chặng B xong (E1–E3)**: `/` chọn ngôn ngữ; tiếng Trung chuyển sang `/zh/…` (URL cũ được 404.html chuyển tiếp); header/footer theo ngôn ngữ (`src/features/site/`); tiếng Anh: `/en`, `/en/lesson/[slug]/{,pronunciation,grammar,examples,dialogue,exercises,homework}`, `/en/word/[slug]`, `/en/words`. Snapshot `pnpm content:export:en` → `.data/content/en.json` (chạy lại sau mỗi lần sửa `data/en`). Bộ chấm `src/domain/en-grade.ts`; tiến độ tiếng Anh ở localStorage `chinese-app:en:progress:v1` (chưa đồng bộ tài khoản — chờ Q2).
- Kiểm tra: `pnpm test` 133/133, `pnpm build` OK, `pnpm smoke` 0 lỗi (thêm 13 trang tiếng Anh + 5 kiểm tra tương tác).
- Còn lại: research IPA/CEFR (R), E4 luyện tập tiếng Anh, SQL `lang` cho tài khoản, commit/deploy khi người dùng đồng ý.
