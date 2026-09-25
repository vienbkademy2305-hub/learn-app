# PHASE 2 — HSK1 LEARNING UI (kế hoạch)

- **Ngày:** 2026-09-25.
- **Đầu vào:** `CLAUDE.md`, `docs/ARCHITECTURE.md` (§3 Frontend, §4 Data layer, §15 Progress, §16 Lesson), `docs/DATA_MAPPING.md`, kết quả Phase 1 (`reports/phase1-validation.md`).
- **Ngoài phạm vi:** SRS hoàn chỉnh, speaking, handwriting, HSK2–6, quiz.

## 1. Learning flow

```
/                    → giới thiệu + "Tiếp tục học"
/hsk/1               → danh sách 14 lesson HSK1 (trạng thái + % tiến độ)
/lesson/[slug]       → bước 1: Từ vựng (thẻ từ, đánh dấu đã học)
/word/[simp]/[pinyin]?lesson=… → chi tiết từ (từ trước/sau trong lesson)
/lesson/[slug]/examples → bước 2: Câu ví dụ (audio thường/chậm)
/lesson/[slug]/summary  → bước 3: Tổng kết (từ đã/chưa học, hoàn thành, bài tiếp theo)
```

## 2. Hiển thị

- **Thẻ từ:**
  - Hán tự · pinyin · Hán Việt · nghĩa Việt · cấp HSK · một câu ví dụ.
  - Hán Việt được ghép từ từng chữ, chỉ hiện khi đủ mọi chữ; nếu thiếu thì trang chi tiết ghi "chưa có".
  - Audio: **không có audio cho từ** (không nguồn nào có, REPO_AUDIT §9) → thẻ chỉ hiện audio của câu ví dụ.
- **Câu:** Hán tự (mỗi từ bấm được để mở trang từ) · pinyin · nghĩa Việt · audio thường/chậm · cấp HSK.
- **Chỉ hiển thị dữ liệu từ nguồn `publishable = true`** (DATA_MAPPING §1).

## 3. Nghĩa tiếng Việt của câu

- **Vấn đề:** 0/281 câu HSK1 có bản dịch được phép hiển thị [ĐO, Phase 1].
- **Giải pháp** theo lớp editorial (ARCHITECTURE D4):
  - `data/editorial/sentences-vi/hsk1.yaml` chứa **bản dịch nháp do Claude viết** (`status: draft`), khóa theo id hsk-sentences-audio, kèm câu gốc để kiểm tra lệch;
  - nguồn mới `editorial` (publishable);
  - UI gắn nhãn "Bản dịch nháp" cho tới khi được duyệt (`status: reviewed`).

## 4. Data layer — site tĩnh (sửa 2026-09-25)

- **Lý do đổi:** người dùng muốn xem trên GitHub Pages (`https://vienbkademy2305-hub.github.io/learn-app/`, hiện trả về 404 vì nhánh `master` không có trang web). Pages chỉ phục vụ file tĩnh → không thể chạy Next.js server + PGlite.
- **Content snapshot:** `pnpm content:export` (`importers/export-content.ts`) đọc DB canonical → `.data/content/hsk1.json`.
  - Snapshot chỉ gồm dữ liệu từ nguồn `publishable`.
  - Snapshot copy audio được tham chiếu vào `public/assets/` (gitignored).
  - Đây là bản phát hành nội dung (ARCHITECTURE §21 `content_release`), không phải nguồn dữ liệu thứ hai: luôn sinh lại từ DB.
- **App:** `next build` với `output: "export"` đọc snapshot lúc build (`src/content/hsk1.ts`, server-only) → HTML tĩnh trong `out/`. Mọi route động có `generateStaticParams`.
- **URL chỉ dùng ký tự ASCII:** từ = `/word/<pinyin_key>-<mã unicode>` (VD `/word/ni3hao3-4f60-597d`), vì hosting tĩnh xử lý tên file tiếng Trung không ổn định.
- **Asset:** `src/lib/storage-url.ts` là nơi duy nhất đổi `storage_key` → URL (`NEXT_PUBLIC_BASE_PATH` + `/assets/`).
- **Triển khai:** `pnpm deploy:pages` build với `basePath=/learn-app`, rồi đẩy `out/` lên nhánh `gh-pages` (có `.nojekyll`). **Chỉ chạy khi người dùng đồng ý**, vì đây là đăng công khai.

## 5. Tiến độ (tạm thời cho Phase 2)

- **Lệch so với ARCHITECTURE §15** (bảng `app.*` theo user):
  - chưa có auth (§23 UNRESOLVED);
  - DB nội dung bị dựng lại mỗi lần import, sẽ xóa luôn tiến độ nếu lưu chung.
- **Phase 2 lưu ở trình duyệt:**
  - dùng `localStorage`, khóa `chinese-app:progress:v1`, qua interface `ProgressStore` để sau thay bằng server;
  - khóa dữ liệu **ổn định**: từ = `simplified|pinyin_key`, lesson = `slug` (không dùng id số, vì id có thể đổi khi import lại).
- **Trạng thái lesson:**
  - `chưa bắt đầu`: chưa học từ nào, chưa mở bài;
  - `đang học`: đã mở bài hoặc đã học ít nhất 1 từ;
  - `hoàn thành`: người học bấm "Hoàn thành bài học" ở trang tổng kết.
- **% tiến độ** = số từ đã đánh dấu ÷ số từ của lesson.

## 6. Tái sử dụng từ xue-hanzi

- xue-hanzi không có LICENSE → **không copy component** (REPO_AUDIT §10, ARCHITECTURE D7).
- **Tái sử dụng dữ liệu** mà repo đó chứa (CVDICT, Unihan, makemeahanzi) qua importer Phase 1.
- Thứ tự nét (hanzi-writer, MIT) chưa làm ở Phase 2: cần tự host dữ liệu nét (Arphic PL), để phase sau.

## 7. Kiểm tra

- `pnpm build` · `pnpm test` (unit test cho helper hiển thị + progress) · `pnpm typecheck`.
- `pnpm smoke`: Playwright mở các trang ở 3 kích thước (375 / 768 / 1280 px), ghi lỗi console, lỗi request, tràn ngang, và chụp ảnh vào `.data/screenshots/`.
