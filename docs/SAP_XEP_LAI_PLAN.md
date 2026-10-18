# Kế hoạch sắp xếp lại dự án (2026-10-18)

Trạng thái: **KẾ HOẠCH — chưa di chuyển file nào.** Chờ bạn duyệt rồi mới làm (mục 6).

## 1. Hiện trạng: vì sao thấy lộn xộn

**Thư mục gốc `D:\Lean - Ngoại ngữ\`** (không phải kho git):
- 2 file PDF sách (`[PREP sưu tầm] Essential Grammar in Use.pdf`, `…Tree_or_Three.pdf`, ~30 MB) và `HUONG_DAN_CLAUDE_MODEL.md` nằm lẻ ngoài cùng.
- `lexi-track` (dự án cũ, riêng), `mau-giong-doc` (mẫu giọng đọc thử), `.pnpm-store` (989 MB) đứng ngang hàng với thư mục việc hằng ngày.
- Cái nào quan trọng, cái nào lưu trữ — nhìn vào không biết.

**`chinese-app\`:**
- `docs/` 23 file phẳng, tên theo kiểu khác nhau (`PHASE2_…`, `EN_…`, `NANG_CAP_…`); không có mục lục.
- `scripts/` 21 file phẳng, trộn: deploy, kiểm tra, dữ liệu tiếng Anh, giọng đọc, tiện ích.
- `tests/` 26 file phẳng (Trung, Anh, chung).
- `supabase/` có 6 file `.sql` lẻ cạnh thư mục `functions/`.
- `src/features/en/` có 30 file lẫn nhau (bài học, nói, viết, kiểm tra, flashcard).
- File build nặng nằm cạnh mã nguồn: `out` 1 GB, `.next`, `.data` 261 MB, `tsconfig.tsbuildinfo`.

## 2. Nguyên tắc
1. **Không di chuyển thứ có đường dẫn tuyệt đối bên trong:** `OpenPronounce` (Python `.venv`, mô hình 3,6 GB, file `.bat`) — giữ nguyên chỗ cũ.
2. **Giữ tên các thư mục mà skill/tài liệu/cấu hình đang trỏ tới:** `tai-lieu-nguon`, `nhat-ky-hoc-tap`, `.claude` (89 chỗ nhắc trong 34 file, gồm `.claude/skills/*`, `.vscode/settings.json`, `data/en/sources.yaml`).
3. **Trong `chinese-app` dùng `git mv`** (giữ lịch sử) trên nhánh riêng `sap-xep-lai`; mỗi giai đoạn qua cổng `tsc` + `vitest` (230 test) + `build` rồi mới commit. Hoàn tác = `git revert`.
4. **Ở thư mục gốc (không có git):** mọi lần chuyển đều ghi vào `_luu-tru/NHAT_KY_DI_CHUYEN.txt` (đường dẫn cũ → mới) để đảo ngược được.
5. **Chỉ làm khi không có phiên Claude khác đang sửa/deploy** (hiện có một lần deploy đang chạy từ 22:37).

## 3. Cấu trúc đề xuất

### 3.1 Thư mục gốc
```
D:\Lean - Ngoại ngữ\
├─ chinese-app\          ← ứng dụng web (giữ)
├─ OpenPronounce\        ← máy chấm phát âm (giữ nguyên, KHÔNG di chuyển)
├─ tai-lieu-nguon\       ← tài liệu gốc (giữ tên)
│   ├─ tieng-anh\  (+ sach\ ← 2 PDF lẻ chuyển vào đây)
│   ├─ tieng-trung\
│   └─ tools\
├─ nhat-ky-hoc-tap\      ← nhật ký học (giữ)
├─ ghi-chu\              ← HUONG_DAN_CLAUDE_MODEL.md
├─ _luu-tru\             ← thứ ít dùng: lexi-track\, mau-giong-doc\, NHAT_KY_DI_CHUYEN.txt
└─ .claude\  .vscode\    ← giữ
```
`.pnpm-store` (989 MB): giữ nguyên (pnpm dùng liên kết cứng tới `node_modules`, di chuyển có thể làm hỏng cài đặt). Chỉ thêm vào bỏ qua của VS Code (`files.exclude`, `search.exclude`) để khỏi lẫn mắt.

### 3.2 `chinese-app\docs\` (23 file → 4 nhóm + mục lục)
```
docs\
├─ README.md                  ← mục lục: file nào nói về gì, trạng thái
├─ kien-truc\   ARCHITECTURE, REPO_AUDIT, DATA_MAPPING, SPEAKING_ARCHITECTURE
├─ tieng-trung\ PHASE2_PLAN, PHASE3_EXERCISES, PHASE4_PRACTICE, PHASE5_GRAMMAR, PHASE6_PINYIN,
│               LISTENING_PLAN, SPEAKING_PLAN, HSK2_PLAN, HSK3_PLAN
├─ tieng-anh\   ENGLISH_SPLIT_PLAN, EN_AUDIO_PLAN, EN_WRITING_GRADER_PLAN, EN_VIEC_CON_LAI,
│               OPENPRONOUNCE_PLAN, GRADING_IMPROVEMENTS, en-bundles\
└─ chung\       ACCOUNTS_PLAN, TTS_SERVICE_PLAN, NANG_CAP_4_VIEC_PLAN, ENGAGEMENT_AI_PLAN, SAP_XEP_LAI_PLAN
```
Cần sửa các liên kết `docs/XXX.md` trong `CLAUDE.md`, `README.md`, comment đầu file trong `src/`, `supabase/`, `scripts/`, và bộ nhớ dự án — làm bằng một script thay thế hàng loạt rồi dò lại bằng `grep`.

### 3.3 `chinese-app\scripts\`
```
scripts\
├─ deploy\   deploy-pages.ts, postbuild.ts, make-icons.mjs
├─ kiem-tra\ smoke.ts, smoke-accounts.ts, check-*.ts
├─ tieng-anh\ en-*.ts/.mjs, study4-catalog.mjs
├─ giong-doc\ tts-pregen.ts, setup-tts.ps1
├─ tai-khoan\ users.ts
└─ lib\      (giữ)
```
Phải sửa đường dẫn trong `package.json` (≈ 20 lệnh `pnpm`) và các `import.meta.dirname`/`ROOT` trong từng script (`path.resolve(import.meta.dirname, "..")` → thêm một cấp). `postbuild.ts` được `pnpm build` gọi, và `deploy-pages.ts` tự gọi `pnpm build` nên phải kiểm tra kỹ.

### 3.4 `chinese-app\tests\`
`tests\zh\`, `tests\en\`, `tests\chung\` (activity, account, browser-voices, tts-key, mp3, speech-match…). Sửa các import tương đối (`../supabase/...` → `../../supabase/...`). `vitest.config.ts` đã dùng glob `tests/**` nên không đổi (kiểm tra lại).

### 3.5 `chinese-app\supabase\`
`supabase\sql\` ← 6 file `.sql`; `functions\` giữ nguyên (CLI deploy cần đúng chỗ). Cập nhật hướng dẫn trong tài liệu nhắc tên file `.sql`.

### 3.6 `chinese-app\src\features\en\` (nhóm lớn nhất, làm sau cùng)
```
features\en\
├─ bai-hoc\  LessonChrome, EnStudy, ExerciseSet, Cards, DialoguePlayer, EnLessonGame, HomeworkBox
├─ noi\      PronounceCheck, pronounce.ts, SpeakingLab, LessonSpeaking, DialogueRoleplay
├─ viet\     WritingGrader, grader.ts
├─ kiem-tra\ TestRunner
├─ on-tu\    EnFlashcards, WordIndex
└─ chung\    progress.ts, sync.ts, EnSync, speech.tsx, EnVoicePicker
```
Mỗi lần di chuyển một nhóm, `tsc` báo ngay import nào hỏng (alias `@/features/en/...` nên sửa bằng tìm-thay). Giai đoạn rủi ro nhất, làm riêng từng nhóm.

### 3.7 File build / tạm
Thêm `pnpm clean` (xóa `out`, `.next`, `tsconfig.tsbuildinfo`) và ghi chú `.data` có thể dựng lại (`pnpm import:*` + `pnpm content:export`). Kiểm tra `.gitignore` đã bỏ qua tất cả các thư mục này.

## 4. Thứ tự thực hiện và cổng kiểm tra

| GĐ | Việc | Rủi ro | Cổng kiểm tra |
|---|---|---|---|
| A | Thư mục gốc: chuyển 2 PDF, ghi chú, `_luu-tru` (kèm nhật ký di chuyển); cập nhật nhắc tới PDF trong `ban-do-tai-lieu.md`/`sources.yaml` | Thấp | `grep` không còn đường dẫn cũ; `pnpm en:validate` |
| B | `docs/` + mục lục + sửa liên kết | Thấp | `grep` liên kết gãy = 0 |
| C | `supabase/sql/` | Thấp | Đọc lại tài liệu hướng dẫn |
| D | `tests/` | Thấp | `vitest` 230 test |
| E | `scripts/` + `package.json` | Trung bình | chạy thử `en:validate`, `smoke`, `deploy` ở chế độ khô, `build` |
| F | `src/features/en/` từng nhóm | Trung bình–cao | `tsc`, `vitest`, `build`, mở thử trang |
| G | `pnpm clean`, dọn `.gitignore` | Thấp | `git status` sạch |

Mỗi giai đoạn một commit riêng trên nhánh `sap-xep-lai`; gộp vào `master` sau khi qua GĐ G.

## 5. Không nằm trong kế hoạch
- Không đổi tên thư mục `chinese-app` (đang gắn với repo GitHub `learn-app`, đường dẫn trong bộ nhớ dự án và Pages).
- Không xóa gì. Các thư mục nặng (`out` 1 GB, `.pnpm-store` 989 MB, `.models`) chỉ được **liệt kê**, bạn tự quyết định xóa.
- Không đổi URL của web.

## 6. Cần bạn duyệt
1. Đồng ý cấu trúc mục 3? (đặc biệt `_luu-tru` cho `lexi-track` và `mau-giong-doc`).
2. Làm đến giai đoạn nào: **A–D** (an toàn), thêm **E**, hay đủ **A–G**? Đề xuất: A–E trước, F làm riêng.
3. Báo khi nào không còn phiên nào khác đang chạy/ deploy để bắt đầu.
