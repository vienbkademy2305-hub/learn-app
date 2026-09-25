# ARCHITECTURE — Chinese Learning App (Vietnamese-first, HSK1 → HSK6)

- **Trạng thái:** ĐỀ XUẤT (bước PLAN/DATA MODEL theo `CLAUDE.md` §10). **Chưa có code.** Mọi tên bảng/thư mục dưới đây là thiết kế, chưa tồn tại.
- **Ngày:** 2026-09-25
- **Đầu vào:** `CLAUDE.md` · `docs/REPO_AUDIT.md`.
- **Thiếu:** `docs/DATA_MAPPING.md` **không tồn tại** (đã tìm trong `chinese-app/docs/` và `C:\Users\Admin\hoc-tieng-trung\docs\`). Phần mapping dưới đây dựa trên REPO_AUDIT §7–8. Những chỗ cần DATA_MAPPING chốt được đánh dấu **→ DATA_MAPPING**.
- **Nhãn** (theo `CLAUDE.md` §11):
  - **[ĐO]/[CODE]** = đã kiểm từ data/source;
  - **UNKNOWN** = chưa kiểm tra;
  - **UNRESOLVED** = đã kiểm nhưng chưa xác định được;
  - **README CLAIM — NOT VERIFIED** = chỉ theo README.

---

## 0. Quyết định chính (tóm tắt)

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **Next.js (App Router) + TypeScript + PostgreSQL + Drizzle ORM** | Một ngôn ngữ (TS). Người dùng đã quen stack này ở lexi-track. Postgres có full-text search, `pg_trgm`, `unaccent` cho mục Search |
| D2 | **Canonical DB là nguồn sự thật duy nhất ở runtime.** Repo nguồn chỉ là đầu vào cho **importer** chạy offline | `CLAUDE.md` §3, §9: không sửa repo gốc, không copy dữ liệu thành nhiều bản |
| D3 | **Import dữ liệu từ nguồn gốc**, không từ file build của xue-hanzi / hsk1-chinese-learning | Hai repo này không có LICENSE [ĐO]. CVDICT, Unihan, makemeahanzi, hanzi-writer-data là bên thứ ba có license riêng |
| D4 | **Hai lớp dữ liệu: `imported` (máy) và `editorial` (người biên tập, tiếng Việt).** Lớp editorial nằm trong git dưới dạng YAML và không bao giờ bị importer ghi đè | Vietnamese-first: phần lớn nội dung tiếng Việt phải tự viết (REPO_AUDIT §9) |
| D5 | **Chuẩn HSK: HSK 3.0 (GF0025-2021), cấp 1–6**, schema chừa chỗ cho `7-9` | Dataset câu dùng HSK 3.0 [ĐO]. **Cần người dùng xác nhận** (xem §23) |
| D6 | **File nhị phân (audio, dữ liệu nét) nằm ở object storage, DB chỉ lưu metadata + khóa lưu trữ** | 8.708 file mp3 / 173 MB [ĐO]; `CLAUDE.md` §7 |
| D7 | **Code của xue-hanzi và hsk1-chinese-learning: chỉ tham khảo, không copy** trừ khi tác giả cho phép bằng văn bản | Không có LICENSE [ĐO] |

---

## 1. Tổng quan hệ thống

```
             OFFLINE (máy dev / CI)                               RUNTIME (web app)
┌─────────────────────────────────────────┐        ┌───────────────────────────────────────────┐
│ sources/manifest.json  (pin phiên bản)  │        │ Next.js App Router (RSC + Server Actions) │
│ sources/raw/<src>/<ver>/  (gitignored)  │        │   src/features/*  (UI + server logic)     │
│            │                            │        │   src/domain/*    (TS thuần: pinyin, SRS, │
│            ▼                            │        │                    quiz, lesson)          │
│ importers/sources/*.ts  ──► staging ──┐ │        │   src/db/*        (Drizzle queries)       │
│ data/editorial/*.yaml   ──► editorial ┤ │        └───────────────┬───────────────────────────┘
│                                       ▼ │                        │
│             importers/validate/* (báo cáo)│                      ▼
│                    │                    │        ┌───────────────────────────────────────────┐
│                    ▼                    │ ─────► │ PostgreSQL (canonical content + user data)│
│             upsert canonical tables     │        └───────────────────────────────────────────┘
│             upload assets ─────────────────────► Object storage (audio, stroke JSON) + CDN
└─────────────────────────────────────────┘
```

Nguyên tắc tầng:
- **`src/domain/`:** TypeScript thuần, không I/O, không React. Chứa pinyin, SRS, sinh câu hỏi quiz và model lesson, test bằng unit test.
- **`src/db/`:** nơi duy nhất nói chuyện với Postgres.
- **`src/features/<module>/`:** component + server action cho từng module; chỉ gọi `src/db` qua hàm truy vấn, **không** tự dựng URL audio hay đọc file nguồn.
- **`importers/`:** chỉ chạy offline. App runtime **không** import gì từ `importers/` hay `sources/`.

---

## 2. Folder structure đề xuất

```
chinese-app/
├── CLAUDE.md
├── docs/
│   ├── REPO_AUDIT.md
│   ├── ARCHITECTURE.md          (file này)
│   ├── DATA_MAPPING.md          (CHƯA CÓ — cần tạo)
│   └── ATTRIBUTION.md           (ghi công mọi nguồn dữ liệu — sẽ sinh từ manifest)
├── sources/
│   ├── manifest.json            pin: url, commit/tag, license, sha256 từng file
│   └── raw/                     (gitignored) bản tải về theo phiên bản
├── data/
│   └── editorial/               NỘI DUNG TIẾNG VIỆT DO NGƯỜI VIẾT — có review trong git
│       ├── sentences-vi/hsk{1..6}.yaml     bản dịch câu, khóa = sentence key
│       ├── words-vi/hsk{1..6}.yaml         nghĩa Việt đã biên tập cho từ HSK
│       ├── sino-viet/overrides.yaml        bổ sung/sửa Hán Việt theo chữ
│       ├── grammar-vi/hsk{1..6}.yaml       giải thích ngữ pháp tiếng Việt
│       ├── reading/hsk{1..6}/*.yaml        bài đọc
│       ├── lessons/hsk{1..6}/*.yaml        cấu trúc bài học
│       └── pinyin/                         bảng âm vị + nhóm khẩu hình (nhãn Việt)
├── importers/
│   ├── run.ts                   CLI: pnpm import <source|all> [--dry-run]
│   ├── lib/                     pinyin-normalize, content-hash, provenance, upsert, storage-upload
│   ├── sources/                 unihan.ts · makemeahanzi.ts · hanzi-writer-data.ts · cvdict.ts ·
│   │                            hsk-wordlist.ts · hsk-sentences.ts · hsk-grammar.ts
│   ├── editorial/               load-yaml.ts + schema zod cho từng loại file editorial
│   └── validate/                coverage.ts · duplicates.ts · unresolved.ts → reports/*.md
├── drizzle/                     migration SQL do drizzle-kit sinh (commit vào git)
├── src/
│   ├── app/                     routes (xem §3)
│   ├── features/
│   │   ├── dictionary/          CharacterCard, CharacterPage, radical/decomposition view
│   │   ├── vocabulary/          WordCard, WordPage, WordList
│   │   ├── sentences/           SentenceCard, TokenizedSentence (bấm từng từ)
│   │   ├── grammar/             GrammarPointPage, GrammarExamples
│   │   ├── audio/               AudioButton, AudioPlayer (nhận AudioAsset, không nhận URL)
│   │   ├── pronunciation/       PinyinChart, ToneDrill
│   │   ├── speaking/            Recorder, ShadowingExercise, SpeechCheck
│   │   ├── writing/             StrokeAnimation, WritingPractice (hanzi-writer quiz)
│   │   ├── handwriting/         HandwritingPad (tra chữ bằng nét vẽ) — giai đoạn sau
│   │   ├── quiz/                QuizRunner + renderer theo từng loại câu hỏi
│   │   ├── srs/                 ReviewSession, ReviewQueue
│   │   ├── progress/            Dashboard, Streak, LevelProgress
│   │   ├── lesson/              LessonPlayer + step renderers (9 bước)
│   │   └── search/              SearchBox, SearchResults
│   ├── domain/                  pinyin.ts · sino-viet.ts · srs.ts · quiz-generator.ts · lesson.ts · types.ts
│   ├── db/                      schema/*.ts (Drizzle) · queries/*.ts · client.ts
│   ├── lib/                     auth, storage-url (resolver duy nhất cho asset URL), i18n (vi)
│   └── components/ui/           shadcn (sinh bằng CLI)
└── tests/                       unit (domain), integration (importers trên fixture nhỏ), e2e
```

---

## 3. Frontend

- **Framework:** Next.js App Router, React Server Components cho trang nội dung, Server Actions cho ghi tiến độ/SRS. UI 100% tiếng Việt; tiếng Anh chỉ là thông tin phụ (ẩn mặc định).
- **Routes đề xuất:**

| Route | Nội dung |
|---|---|
| `/` | Trang chủ: tiếp tục bài học, số thẻ ôn hôm nay |
| `/learn` | Learning path HSK1 → HSK6 |
| `/hsk/[level]` | Danh sách lesson + từ/ngữ pháp của cấp |
| `/lesson/[slug]` · `/lesson/[slug]/[step]` | Lesson player (9 bước, §15) |
| `/word/[key]` | Trang từ (hanzi, pinyin, Hán Việt, nghĩa Việt, câu ví dụ, audio) |
| `/char/[hanzi]` | Trang chữ (bộ thủ, cấu tạo, thứ tự nét, Hán Việt, từ chứa chữ) |
| `/sentence/[id]` | Câu + tokens + ngữ pháp + audio thường/chậm |
| `/grammar/[code]` | Điểm ngữ pháp (VD `1-09`) + giải thích Việt + câu ví dụ |
| `/pinyin` | Bảng pinyin, luyện thanh điệu |
| `/review` | Phiên ôn SRS |
| `/search` | Tìm kiếm |
| `/progress` | Tiến độ |

- **Quy tắc hiển thị (`CLAUDE.md` §4):** mọi `WordCard`/`SentenceCard` hiển thị theo thứ tự **Hán tự → pinyin → Hán Việt → nghĩa Việt**. Nếu thiếu Hán Việt/nghĩa Việt thì hiện trạng thái "chưa có bản Việt" chứ **không** tự rơi về tiếng Anh.
- **Offline/PWA:** giai đoạn sau. Tham khảo cách cache của xue-hanzi (`sw.ts`) nhưng tự viết.

---

## 4. Data layer

- **Postgres + Drizzle**; migration bằng `drizzle-kit generate` → SQL trong `drizzle/`, chạy có kiểm soát. **Không** dùng kiểu "DDL lúc runtime" như `xue-hanzi/src/lib/turso.ts` [CODE].
- **Nội dung (content)** và **dữ liệu người dùng (user)** tách schema: `content.*` chỉ importer ghi, app chỉ đọc; `app.*` do app ghi.
- **Provenance** (`CLAUDE.md` §3): mọi bản ghi import mang `source` + `source_id` + `source_version`. Một entity canonical có thể đến từ nhiều nguồn → bảng `content.entity_sources` (§12).
- **Asset URL:** chỉ `src/lib/storage-url.ts` biến `storage_key` → URL (theo env `ASSET_BASE_URL`). Component nhận object `AudioAsset`, không nhận chuỗi URL (`CLAUDE.md` §7).
- **Cache:** nội dung đổi theo lần import → dùng cache của Next (tag theo `content_release`), invalidate khi release dữ liệu mới.

---

## 5. HSK curriculum

- **Nguồn cấp độ từ:** `complete-hsk-vocabulary` (drkameleon) — hsk-sentences-audio tải từ `wordlists/exclusive/new/{lvl}.json` [CODE `scripts/download_hsk.py:12`]. **Schema các file JSON đó: UNKNOWN** (chưa mở). License MIT: **README CLAIM — NOT VERIFIED** (theo `ATTRIBUTION.md` của hsk-sentences-audio).
- **Không** dùng trường `hsk` của xue-hanzi (sai phạm vi, có cấp 7) [ĐO].
- **Cấp của câu:** `hsk_level` từ hsk-sentences-audio [ĐO].
- **Cấp của ngữ pháp:** `level` trong `grammar_points.json` [ĐO].
- **Cấp của chữ:** suy ra = cấp thấp nhất của từ HSK chứa chữ đó (tính trong importer, lưu kèm `derived=true`).
- **Mô hình:** `hsk_standard` (VD `hsk3-2021`) × `level` (`1..6`, `7-9`). Mỗi từ/câu/ngữ pháp gắn cấp qua bảng liên kết để sau này thêm chuẩn khác (HSK 2.0) không phải đổi schema.
- **Nội dung HSK1 150 từ của hsk1-chinese-learning** là bộ HSK 2.0 (**README CLAIM — NOT VERIFIED**, audit cũ nhận định, bản này chưa đối chiếu) → không dùng làm curriculum, chỉ tham khảo.

## 6. Character dictionary

| Thuộc tính | Nguồn import (gốc) | Ghi chú |
|---|---|---|
| Hán tự giản/phồn | Unihan (`kTraditionalVariant`/`kSimplifiedVariant`) + makemeahanzi. **UNKNOWN**: chưa mở file Unihan gốc | xue-hanzi chỉ tham khảo |
| Pinyin của chữ | Unihan `kMandarin` (**UNKNOWN**) + CVDICT entry 1 chữ [ĐO: định dạng `trad simp [pin1 yin1] /nghĩa/`] | Chuẩn hóa về pinyin số + dấu |
| Hán Việt | Unihan `kVietnamese` + `data/editorial/sino-viet/overrides.yaml` | Thiếu 35 chữ HSK1…337 chữ HSK1–6 [ĐO] → editorial bắt buộc |
| Bộ thủ, cấu tạo, etymology | makemeahanzi `dictionary.txt` (JSON-lines: `character, definition, pinyin, decomposition, etymology, radical`) [CODE `build-dictionary.ts`] | License makemeahanzi: **UNKNOWN** (repo gốc chưa mở; dữ liệu dẫn xuất Arphic theo `hanzi-writer/COPYING.md` [ĐO]) |
| Thứ tự nét | `hanzi-writer-data` (JSON mỗi chữ) — tự host | Arphic Public License [ĐO qua `COPYING.md`]. Phiên bản xue-hanzi dùng: `2.0.1` [CODE] |
| Nghĩa Việt của chữ | CVDICT (entry 1 chữ) | Biên tập tay cho chữ HSK |

- Component **tự xây**: `CharacterCard`, `CharacterPage`, `StrokeAnimation` (bọc hanzi-writer, cấu hình tham khảo `xue-hanzi/src/core/stroke.ts`).

## 7. Vocabulary

- **Khóa canonical của từ:** `(simplified, pinyin_numbered_normalized)` → tách được đa âm (VD 读 dú/dòu; 4.147 chữ/từ đa entry trong xue-hanzi [ĐO]).
- **Nguồn:**
  - danh sách + cấp: complete-hsk-vocabulary;
  - nghĩa Việt: CVDICT → rồi `words-vi` editorial ghi đè hiển thị;
  - nghĩa Anh (phụ): CC-CEDICT **UNKNOWN** (chưa tải; có thể bỏ ở giai đoạn 1);
  - Hán Việt của từ: **tính từ chữ** (`word_characters` × Hán Việt của chữ), không lưu chuỗi cứng. Tránh lỗi "chỉ âm chữ đầu" của xue-hanzi [ĐO].
- **Import toàn bộ CVDICT hay chỉ từ HSK?** Đề xuất: import toàn bộ (119k dòng, dùng cho tra cứu), gắn cờ `in_curriculum` cho từ HSK. Chất lượng: 1.547 entry có nhãn "(Tw)"/"LT:" [ĐO] → hiển thị có cảnh báo; từ HSK phải qua editorial.

## 8. Sentences

- **Import từ hsk-sentences-audio `dist/sentences.json`** (không dùng YAML nguồn, không chạy pipeline Python):
  - lấy: `id, hsk_level, topic, sentence_type, chinese, traditional, pinyin, pinyin_numbered, translation.en, tokens[], grammar_tags[], audio{normal,slow}, audio_meta`;
  - bỏ qua: `grammar_points[]` (nhãn tự do, trùng thông tin với `grammar_tags`).
- **Tokens → words:** map `tokens[].word` + pinyin token về `words`. 5.278/5.340 khớp được theo chữ [ĐO]; 62 token là cụm jieba (请坐, 看到…) [ĐO] → tạo word "phrase" hoặc tách → **→ DATA_MAPPING**. Đa âm không khử được → trạng thái **UNRESOLVED** trong hàng đợi review.
- **Bản dịch Việt:** 0/4.354 câu có sẵn [ĐO] → `data/editorial/sentences-vi/`. Thứ tự ưu tiên: câu dùng trong lesson HSK1 trước.
- **75 câu HSK1 của hsk1-chinese-learning:** không import (không license). Chỉ 5/75 trùng dataset [ĐO]. Nếu tác giả cho phép → import với `source = hsk1-chinese-learning`.
- **Chất lượng:** 816 cờ đa âm chưa duyệt (`dist/review_flags.txt`) [ĐO] → nạp vào hàng đợi review.

## 9. Grammar

- **Import `data/grammar_points.json`** (413 điểm; `id, level, cat, sub, label, label_full, pattern, exclude, examples[]`) [ĐO]. Liên kết câu qua `grammar_tags` (3.770 câu) [ĐO].
- **License:** dữ liệu số hóa từ `krmanik/HSK-3.0` [CODE `gen_grammar_registry.py:4`] — **UNKNOWN** license, không được ghi công trong ATTRIBUTION của repo → **chặn phát hành** cho tới khi xác minh.
- **Tự xây:** `grammar-vi` editorial (tên tiếng Việt, giải thích, cấu trúc, lỗi hay gặp của người Việt, ví dụ có dịch).
- `pattern` (regex, 70 điểm) dùng để gợi ý gắn tag cho câu mới/bài đọc mới.

## 10. Audio

- **Bảng `content.audio_assets`:** `owner_type` (sentence | word | character | syllable | passage), `owner_id`, `speed` (normal | slow), `storage_key`, `mime`, `duration_ms`, `voice`, `engine`, `is_synthetic`, `source`, `source_id`, `license`, `sha256`.
- **Nguồn:**
  - câu: 8.708 mp3 CosyVoice2, giọng tổng hợp, 24 kHz [ĐO] → upload lên storage. UI ghi nhãn "giọng tổng hợp" (khuyến nghị trong `ATTRIBUTION.md` [ĐO]);
  - âm tiết pinyin: **tự xây/tìm nguồn có license rõ**. Audio hsk1-chinese-learning có nguồn `zxq432/py` license **UNKNOWN** [ĐO nguồn trong `manifest.json`];
  - từ đơn: **không có ở repo nào** [ĐO] → giai đoạn sau (TTS hoặc nguồn khác, **UNRESOLVED**).
- `duration_ms`: **UNKNOWN** (dataset không có trường này [ĐO keys]) → importer đo khi upload.
- **Không dùng** `DEFAULT_AUDIO_BASE_URL` trỏ raw.githubusercontent của loader [CODE] → tự host.

## 11. Speaking

- **Không repo nào có chấm phát âm** [ĐO/CODE]. Tự xây theo giai đoạn:
  1. **Shadowing:** nghe audio mẫu (thường/chậm) → ghi âm bằng `MediaRecorder` → nghe lại so sánh → tự đánh giá. Tham khảo luồng "Luyện phát âm" của hsk1-chinese-learning (`setupPronounce`, nghe nhanh/chậm) [CODE].
  2. **Nhận dạng câu:** Web Speech API `SpeechRecognition` (`zh-CN`) so khớp văn bản. Mức hỗ trợ theo trình duyệt: **UNKNOWN** (chưa kiểm) → phải có fallback về mức 1.
  3. **Chấm thanh điệu** (phân tích cao độ): **UNRESOLVED**, cần nghiên cứu riêng.
- Ghi âm của người dùng: mặc định **không lưu lên server** (quyền riêng tư).

## 12. Writing

- **Thứ tự nét (xem):** thư viện `hanzi-writer` 3.7.3, MIT [ĐO].
- **Luyện viết có chấm:** chế độ quiz có sẵn của hanzi-writer (`leniency`, `showHintAfterMisses`, `onMistake`, `onComplete`) [ĐO `hanzi-writer.d.ts`]. xue-hanzi **không** dùng chế độ này [CODE] → **tự xây** `WritingPractice`.
- **Dữ liệu nét:** tự host `hanzi-writer-data`, nạp qua option `charDataLoader` [ĐO `.d.ts`] + `storage-url`. Không gọi jsdelivr như xue-hanzi (`StrokeBox.tsx:72`) [CODE].
- **Tra chữ bằng nét vẽ (handwriting search):** giai đoạn sau.
  - Loại bỏ: Google Input Tools (không chính thức).
  - Component `HanziInput/HanziPad` của xue-hanzi đến từ registry "react-hanzi-input" [CODE commit `96570d4`] → license **UNKNOWN**.
  - `hanzi_lookup` WASM: license **UNKNOWN**; xue-hanzi đã gỡ khỏi UI ở commit `96570d4` [CODE].
  - → **UNRESOLVED**: chọn thư viện nhận dạng offline có license rõ.

## 13. Quiz

- **Tự xây** `src/domain/quiz-generator.ts` (sinh câu hỏi từ canonical data) + `features/quiz` (renderer).
- **Loại câu hỏi** (giai đoạn 1 → 2):

| Loại | Dữ liệu |
|---|---|
| Hán tự → chọn nghĩa Việt (4 đáp án) | words + words-vi |
| Nghĩa Việt → chọn Hán tự | như trên |
| Nghe audio → chọn câu/nghĩa | sentences + audio |
| Chọn pinyin/thanh điệu đúng | words, syllables |
| Điền từ vào chỗ trống | sentences.tokens |
| Sắp xếp từ thành câu | sentences.tokens |
| Chọn cấu trúc ngữ pháp | grammar + sentence_grammar |
| Viết chữ (hanzi-writer quiz) | characters + stroke data |

- **Tham khảo từ hsk1-chinese-learning** [CODE `app.js`]: quiz 10 câu, 1 đúng + 3 nhiễu ngẫu nhiên (`getRandomWords`), quiz câu, lưu điểm lần cuối. **Cải tiến:** đáp án nhiễu cùng cấp HSK/cùng loại từ, không ngẫu nhiên thuần.
- Mỗi lần trả lời ghi `app.exercise_attempts` → nuôi SRS và Progress.

## 14. SRS

- **Đơn vị ôn:** `(user, item_type, item_id, skill)`. `item_type` ∈ word | character | sentence | grammar; `skill` ∈ recognition (nhìn → nghĩa) | recall (nghĩa → chữ) | listening | writing. Một từ có thể có nhiều thẻ theo kỹ năng.
- **Thuật toán:** tự viết SM-2 với 4 mức chấm (Again/Hard/Good/Easy) trong `src/domain/srs.ts`, qua interface `Scheduler` để đổi sang FSRS sau (thư viện FSRS: license **UNKNOWN**, chưa kiểm).
- **Tham khảo (không copy) xue-hanzi** [CODE]:
  - `srs.ts`: SM-2, 2 mức q=2/5;
  - các hằng số: leech ≥3 lapses, mastered ≥21 ngày, ≤50 thẻ mới/phiên;
  - phiên luyện trước hạn không đổi lịch;
  - `flashcard_review_log` lưu số liệu thô, tính "mastery" lúc đọc.
- **Nguồn thẻ:** tự động thêm khi hoàn thành bước Vocabulary/Writing của lesson; thêm tay từ trang từ.

## 15. Progress

- **Bảng:** `app.lesson_progress` (theo bước), `app.exercise_attempts`, `app.srs_cards`, `app.review_log`, `app.study_sessions` (thời lượng), `app.daily_activity` (streak).
- **Chỉ số:** % lesson theo cấp, số từ "đã thuộc" (interval ≥ ngưỡng), độ chính xác theo kỹ năng, streak, thời gian học.
- **Tham khảo hsk1-chinese-learning** [CODE]: các khóa localStorage (`hsk1-learned-words`, `hsk1-sentence-mastered`, `hsk1-sentence-progress`, `hsk1-study-ms`) = danh sách chỉ số cần có → chuyển thành bảng server theo user. Không dùng `surprise.js`.
- **Auth:** cần tài khoản thật (xue-hanzi chỉ có 1 user `anonymous` [CODE]). Nhà cung cấp auth: **UNRESOLVED** (§18).

## 16. Lesson

- **Lesson là dữ liệu, không phải code:** `data/editorial/lessons/hsk{N}/*.yaml` → importer → `content.lessons` + `content.lesson_steps`.
- **9 loại bước** (`CLAUDE.md` §8): vocabulary · pronunciation · examples · listening · reading · writing · speaking · quiz · review. Bước tham chiếu entity bằng khóa canonical (`word:学习|xue2xi2`, `sentence:<id>`, `grammar:1-09`), không nhúng nội dung.
- `LessonPlayer` render bước theo `step_type` → dùng lại component của từng feature.
- **Dựng lesson:**
  - khung chủ đề từ `topic` (19 giá trị) + `grammar_tags` + cấp HSK của dataset câu [ĐO];
  - 15 chủ đề bài HSK1 của hsk1-chinese-learning (打招呼, 自我介绍…) [ĐO] làm **tham khảo** thứ tự sư phạm;
  - nội dung bài do editorial viết.
- **Reading:** không có nguồn [ĐO] → `data/editorial/reading/` (bài đọc theo cấp, gắn token/từ/ngữ pháp như câu).

## 17. Search

- **Postgres:**
  - `pg_trgm` + GIN index trên: hán tự (giản + phồn), pinyin không dấu, pinyin số, Hán Việt không dấu, nghĩa Việt không dấu (`unaccent`);
  - bảng `content.search_documents` (entity_type, entity_id, fields…) do importer sinh.
- **Nhận diện loại truy vấn:** có ký tự Hán → tìm theo chữ/từ; chuỗi Latin có số thanh → pinyin; chuỗi Latin có dấu tiếng Việt → nghĩa/Hán Việt.
- **Kết quả:** gom theo loại (Chữ / Từ / Câu / Ngữ pháp), ưu tiên từ trong curriculum HSK.
- **Tách từ cho chuỗi dài:** tham khảo ý tưởng `xue-hanzi/src/core/segmenter.ts` (max-match trên từ điển) [CODE], tự viết.

---

## 18. Canonical schema đề xuất

> Tên bảng/cột là đề xuất cho bước DATA MODEL. Kiểu dữ liệu theo Postgres.

### 18.1 Nguồn & phiên bản
```
content.sources            id (text PK: 'cvdict','unihan','makemeahanzi','hanzi-writer-data',
                           'complete-hsk-vocabulary','hsk-sentences-audio','hsk-grammar-krmanik','editorial')
                           name, url, license, attribution_text
content.source_versions    id, source_id FK, version (commit/tag), fetched_at, files_sha256 jsonb, notes
content.import_runs        id, source_version_id FK, started_at, finished_at, status,
                           stats jsonb (inserted/updated/unchanged/unresolved), report_path
content.content_releases   id, semver, created_at, source_versions jsonb, notes
```

### 18.2 Provenance chung
```
content.entity_sources     entity_type, entity_id, source_id, source_record_id (source_id gốc),
                           source_version_id, role ('primary'|'merged'|'attribute')
                           UNIQUE (source_id, source_record_id, entity_type)
```

### 18.3 Nội dung
```
content.characters         id, hanzi (UNIQUE, NFC, 1 codepoint), traditional, radical, stroke_count,
                           decomposition, etymology jsonb, derived_hsk_level
content.character_readings id, character_id, pinyin_numbered, pinyin_marked, is_primary, source_id, source_record_id
content.character_sino_viet id, character_id, reading, is_primary, status ('imported'|'edited'|'verified'),
                           source_id, source_record_id
content.words              id, simplified, traditional, pinyin_numbered, pinyin_marked, pinyin_plain,
                           kind ('word'|'phrase'|'name'), in_curriculum bool
                           UNIQUE (simplified, pinyin_numbered)
content.word_characters    word_id, position, character_id          PK (word_id, position)
content.word_senses        id, word_id, lang ('vi'|'en'), text, sort, status, source_id, source_record_id
content.hsk_assignments    entity_type ('word'|'sentence'|'grammar'|'character'), entity_id,
                           standard ('hsk3-2021'), level ('1'..'6','7-9'), source_id, derived bool
content.sentences          id, key (VD 'hsk1-0002' hoặc hash), simplified, traditional,
                           pinyin_marked, pinyin_numbered, topic, sentence_type,
                           content_hash UNIQUE (NFC + bỏ khoảng trắng/dấu câu)
content.sentence_tokens    sentence_id, position, surface, word_id NULL, pinyin, gloss_en,
                           resolution ('matched'|'phrase'|'unresolved')
content.sentence_translations id, sentence_id, lang, text, status, source_id, source_record_id
content.grammar_points     id, code UNIQUE ('1-09'), level, category, subcategory, label_zh, label_full_zh,
                           pattern, exclude, title_vi, explanation_vi (md), status
content.grammar_examples   grammar_point_id, sentence_id NULL, text_zh, translation_vi
content.sentence_grammar   sentence_id, grammar_point_id, source_id    PK (sentence_id, grammar_point_id)
content.reading_passages   id, slug, hsk_level, title_vi, body_zh, body_pinyin, translation_vi, source_id
content.passage_tokens     (như sentence_tokens)
content.syllables          id, pinyin_numbered UNIQUE, initial, final, tone, lip_group, label_vi
content.audio_assets       id, owner_type, owner_id, speed, storage_key UNIQUE, mime, duration_ms,
                           engine, voice, is_synthetic, license, sha256, source_id, source_record_id
                           UNIQUE (owner_type, owner_id, speed, source_id)
content.stroke_assets      character_id PK, storage_key, source_id, source_version_id
content.lessons            id, slug UNIQUE, hsk_level, sort, title_vi, summary_vi, status
content.lesson_steps       id, lesson_id, sort, step_type, config jsonb
content.lesson_step_items  step_id, sort, entity_type, entity_id
content.search_documents   entity_type, entity_id, hanzi, pinyin_plain, sino_viet_plain, vi_plain, weight
content.review_queue       id, entity_type, entity_id, issue ('polyphone'|'missing_sino_viet'|'unmatched_token'|…),
                           detail jsonb, status ('open'|'resolved'|'wontfix')
```

### 18.4 Người dùng
```
app.users                  (theo nhà cung cấp auth — UNRESOLVED)
app.srs_cards              id, user_id, item_type, item_id, skill, ease, interval_days, reps, lapses,
                           due_at, last_reviewed_at, suspended_at, flagged_hard_at
                           UNIQUE (user_id, item_type, item_id, skill)
app.review_log             id, card_id, user_id, grade, reviewed_at, interval_after, ease_after, counted bool
app.lesson_progress        user_id, lesson_id, step_id, status, score, completed_at   PK (user_id, step_id)
app.exercise_attempts      id, user_id, exercise_type, entity_type, entity_id, correct, response jsonb,
                           duration_ms, created_at
app.study_sessions         id, user_id, started_at, ended_at, source ('lesson'|'review'|'quiz')
app.daily_activity         user_id, date, minutes, items_reviewed    PK (user_id, date)
```

---

## 19. Migration / import strategy

**Thứ tự chạy** (mỗi bước idempotent, có `--dry-run`, ghi `import_runs` + báo cáo):

| Bước | Importer | Đầu vào (pin trong manifest) | Ghi vào |
|---|---|---|---|
| 1 | `unihan.ts` | Unihan (kVietnamese, kMandarin, variants) — **UNKNOWN** phiên bản | characters, character_readings, character_sino_viet |
| 2 | `makemeahanzi.ts` | `dictionary.txt` repo gốc | characters (radical, decomposition, etymology) |
| 3 | `hanzi-writer-data.ts` | npm `hanzi-writer-data` (xue-hanzi dùng 2.0.1) | stroke_assets + upload |
| 4 | `cvdict.ts` | `CVDICT.u8` repo gốc (định dạng CEDICT [ĐO]) | words, word_characters, word_senses(vi) |
| 5 | `hsk-wordlist.ts` | complete-hsk-vocabulary `exclusive/new/*.json` — schema **UNKNOWN** | hsk_assignments(word), words.in_curriculum; từ chưa có trong CVDICT → tạo word mới |
| 6 | `hsk-sentences.ts` | hsk-sentences-audio `dist/sentences.json` + `dist/audio/` @ `857dfba` | sentences, sentence_tokens, audio_assets, hsk_assignments(sentence) |
| 7 | `hsk-grammar.ts` | hsk-sentences-audio `data/grammar_points.json` | grammar_points, sentence_grammar |
| 8 | `editorial/*` | `data/editorial/**/*.yaml` (git) | sino_viet(edited), word_senses(vi, edited), sentence_translations, grammar(vi), reading, lessons, syllables |
| 9 | `derive.ts` | DB | derived_hsk_level của chữ, search_documents |
| 10 | `validate/*` | DB | reports: coverage (Hán Việt, nghĩa Việt, audio, stroke theo cấp), duplicates, review_queue |

- **DB schema migrations:** drizzle-kit (SQL commit trong git), tách khỏi data import.
- **Môi trường:** import vào DB staging → chạy validate → nếu đạt ngưỡng thì tạo `content_release` → promote sang production (dump/restore schema `content` hoặc chạy lại importer với cùng manifest).
- **Không migrate dữ liệu user từ xue-hanzi/hsk1-chinese-learning** (không có user thật, dữ liệu localStorage cục bộ).

## 20. Tránh duplicate data

| Entity | Khóa chống trùng | Xử lý |
|---|---|---|
| Character | `hanzi` (NFC, giản thể); phồn thể là thuộc tính/variant | Mọi nguồn đều upsert vào cùng dòng |
| Word | `(simplified, pinyin_numbered)` sau **chuẩn hóa pinyin** (bỏ `U+200B`, khoảng trắng, hạ chữ thường, `ü`→`v`, dấu → số) | CVDICT, HSK list, token câu cùng trỏ về 1 word; nguồn phụ ghi vào `entity_sources` |
| Sentence | `content_hash` (NFC, bỏ khoảng trắng + dấu câu) | 5 cặp trùng trong hsk-sentences-audio [ĐO] → 1 sentence, 2 dòng `entity_sources`; cấp = cấp thấp nhất, ghi chú xung đột |
| Grammar | `code` chính thức (`1-09`) | — |
| Audio | `(owner_type, owner_id, speed, source_id)` + `sha256` | Không upload lại file trùng hash |
| Nghĩa/dịch | Không gộp: nhiều `word_senses`/`translations` có `status`, UI chọn theo ưu tiên `verified > edited > imported` | Tránh ghi đè biên tập |

- Character và Word **tách bảng** (`CLAUDE.md` §6). Từ 1 chữ (高) là 1 word liên kết tới 1 character qua `word_characters`, không phải cùng một bản ghi.
- **Hán Việt của từ:** không lưu chuỗi, tính từ chữ; chỉ lưu override khi từ đọc khác quy tắc.
- **Editorial không copy nội dung gốc:** YAML chỉ chứa khóa canonical + phần tiếng Việt.

## 21. Version dữ liệu nguồn

- **`sources/manifest.json`** (commit trong git), mỗi nguồn gồm:
  - `id, url, ref` (commit SHA hoặc tag/npm version), `license`, `files[{path, sha256}]`, `fetched_at`;
  - ví dụ hsk-sentences-audio: `ref = 857dfba` (commit đã audit).
- `pnpm sources:fetch` tải đúng `ref` vào `sources/raw/<id>/<ref>/`, kiểm `sha256`; sai hash → dừng.
- Mỗi bản ghi import mang `source_version_id`. Nâng version một nguồn:
  1. cập nhật manifest;
  2. `import --dry-run` → báo cáo diff (thêm/sửa/xóa);
  3. review;
  4. import thật;
  5. tạo `content_release` mới (semver).
- **Bản ghi biến mất ở version mới:** đánh dấu `deprecated`, không xóa cứng (user có thể đang có thẻ SRS trỏ tới).
- **Editorial** version theo git commit; `content_release` lưu cả commit editorial.
- `docs/ATTRIBUTION.md` + trang "Ghi công" trong app được sinh từ bảng `sources`.

---

## 22. Ma trận nguồn: tái dùng / import / tham khảo / tự xây

### 22.1 Component tái sử dụng từ xue-hanzi
**Không có component nào được copy**, vì repo không có LICENSE [ĐO]. Nếu tác giả cho phép bằng văn bản, các ứng viên là: `src/core/srs.ts`, `src/core/stroke.ts`, `components/word/StrokeBox.tsx`, `src/core/segmenter.ts`, `src/core/flashcard-engine.ts`.

Thứ **dùng lại được** là **thư viện gốc** mà xue-hanzi dùng:
- `hanzi-writer` (MIT) [ĐO];
- dữ liệu `hanzi-writer-data` (Arphic PL);
- dữ liệu CVDICT (CC-BY-SA 4.0) [ĐO], Unihan, makemeahanzi (license **UNKNOWN**).

**Tham khảo cách làm:**
- ghép Hán Việt (`client-dictionary.ts`);
- pipeline gộp nguồn (`build-dictionary.ts`);
- schema flashcard (`turso.ts`);
- cache PWA (`sw.ts`);
- prompt AI (`public/prompts/`).

### 22.2 Data import từ hsk-sentences-audio (MIT code / CC-BY-SA data [ĐO])
| Import | Không import |
|---|---|
| `dist/sentences.json` (câu, pinyin, tokens, topic, sentence_type, grammar_tags, translation.en) | Pipeline Python (`build.py`, `lib/*.py`) — trái quy tắc một ngôn ngữ |
| `dist/audio/*.mp3` (normal + slow) + `audio_meta` | `data/sentences/*.yaml` (đã có trong dist) |
| `data/grammar_points.json` (chờ xác minh license krmanik) | `dist/index.html`, `examples/` (chỉ tham khảo) |
| `dist/review_flags.txt` → review_queue | `DEFAULT_AUDIO_BASE_URL` |

Loader `packages/npm/index.js` (MIT) có thể tham khảo cho importer. Không cần làm dependency vì importer đọc JSON trực tiếp.

### 22.3 Logic tham khảo từ hsk1-chinese-learning (không license → không copy code/nội dung)
- Quiz trắc nghiệm 10 câu, 1 đúng + 3 nhiễu; quiz câu; lưu điểm lần cuối (`app.js`).
- Luồng học câu theo bài (course → câu → mastered), các chế độ học câu.
- "Luyện phát âm": nghe nhanh/chậm (rate 0,65/0,45) rồi tự đọc.
- Bảng pinyin phân nhóm theo khẩu hình môi với nhãn tiếng Việt (`pinyin.js`) → ý tưởng cho `content.syllables.lip_group`.
- Danh sách chỉ số tiến độ (khóa localStorage) → thiết kế bảng progress.
- 15 chủ đề bài HSK1 → tham khảo thứ tự bài.

### 22.4 Phải tự xây mới
- Toàn bộ app, auth, DB schema, importer, validate.
- **Nội dung tiếng Việt:**
  - dịch 4.354 câu (theo ưu tiên lesson);
  - nghĩa Việt biên tập cho từ HSK;
  - Hán Việt cho 337 chữ thiếu [ĐO];
  - giải thích 413 điểm ngữ pháp.
- Bài đọc (Reading), bài tập nghe, cấu trúc lesson HSK1–6.
- Speaking (ghi âm, shadowing, nhận dạng, chấm thanh điệu).
- WritingPractice (dùng hanzi-writer quiz).
- Quiz generator, SRS nhiều kỹ năng, Progress dashboard, Search.
- Audio âm tiết pinyin (nguồn license rõ) và audio từ đơn.
- Handwriting search (thư viện license rõ — **UNRESOLVED**).

---

## 23. Quyết định cần người dùng chốt

1. **Chuẩn HSK:** HSK 3.0 (2021, khớp dataset câu) hay HSK 2.0 (150/300/600… từ)? → Đề xuất HSK 3.0.
2. **Hạ tầng:**
   - Postgres: Neon như lexi-track? → Đề xuất Neon.
   - Object storage cho audio: Cloudflare R2 / Vercel Blob / khác? → **UNRESOLVED**.
   - Auth: Auth.js / Clerk / tự làm như lexi-track (passcode)? → **UNRESOLVED**.
3. **Có xin phép tác giả** xue-hanzi (phucbm) và hsk1-chinese-learning (ALiangPang) không? Nếu có → mở khóa copy component/nội dung Việt HSK1.
4. **License `krmanik/HSK-3.0`** (ngữ pháp), **makemeahanzi**, **hanzi_lookup**, audio pinyin: cần kiểm repo gốc (hiện **UNKNOWN**).
5. **Tạo `docs/DATA_MAPPING.md`** trước bước DATA MODEL: chốt quy tắc chuẩn hóa pinyin, khử đa âm, xử lý 62 token cụm, gộp 5 câu trùng.
6. **Quan hệ với lexi-track:** giữ riêng (đề xuất), hay sau này gộp phần SRS/từ vựng?

## 24. Bước tiếp theo (theo `CLAUDE.md` §10)
**PLAN** (duyệt file này + chốt §23) → **DATA MODEL** (DATA_MAPPING.md + Drizzle schema chi tiết) → IMPLEMENT (importer trước, UI sau) → TEST → REVIEW.
