# REPO AUDIT — 3 repository nguồn cho nền tảng học tiếng Trung cho người Việt

- **Ngày audit:** 2026-09-25
- **Vị trí repo được audit:** `C:\Users\Admin\hoc-tieng-trung\repos\` (không nằm trong `D:\Lean - Ngoại ngữ`)
- **Phạm vi:** chỉ đọc source code + chạy script Node đọc trực tiếp file data để đếm/đối chiếu. Không sửa, xóa, merge, cài/đổi dependency, migrate gì.
- **Commit đã audit:**

| Repo | Commit | Nội dung commit |
|---|---|---|
| xue-hanzi (app "Hiểu Chữ Hán" v2.8.0) | `c1e7610` | Merge branch 'feature/flashcards' |
| hsk-sentences-audio (v1.0.0) | `857dfba` | feat: publish live HSK dataset browser (#3) |
| hsk1-chinese-learning | `8d635bd` | merge: pinyin labial type reclassification |

- **Ký hiệu độ tin cậy** (theo quy tắc mục 11 của dự án): **[ĐO]** = tự đếm/kiểm từ file thật · **[CODE]** = đọc từ source · **README CLAIM — NOT VERIFIED** = chỉ theo README/docs, chưa xác nhận bằng source · **UNKNOWN** = chưa kiểm tra (thông tin nằm ở repo gốc bên ngoài, chưa mở) · **UNRESOLVED** = đã kiểm nhưng không xác định được.

---

## 0. Tóm tắt

1. **Ba repo bổ sung cho nhau, rất ít chồng chéo:**
   - **xue-hanzi:** từ điển Trung – Hán Việt – Việt (119.210 entry), hoạt ảnh thứ tự nét, nhận dạng chữ viết tay, flashcard SM-2. Là app Next.js full-stack (Turso).
   - **hsk-sentences-audio:** 4.354 câu HSK 3.0 (cấp 1–6) kèm pinyin, tách từ, audio MP3 tốc độ thường/chậm và 413 điểm ngữ pháp. **Không có một chữ tiếng Việt nào.**
   - **hsk1-chinese-learning:** web tĩnh chỉ cho HSK1, gồm 152 mục từ + 75 câu có nghĩa Việt viết tay, bảng pinyin có audio, quiz trắc nghiệm, tiến độ lưu localStorage.
2. **Hai repo không có LICENSE** (xue-hanzi, hsk1-chinese-learning) [ĐO] → mặc định mọi quyền thuộc tác giả; **không được copy code/nội dung** khi chưa xin phép. Dữ liệu bên thứ ba bên trong (CVDICT, Unihan, makemeahanzi, hanzi_lookup) phải lấy từ **nguồn gốc** của chúng.
3. **Share-alike:** CVDICT, CC-CEDICT và toàn bộ `dist/` của hsk-sentences-audio là **CC-BY-SA 4.0**. Phần dữ liệu dẫn xuất của nền tảng mới phải phát hành CC-BY-SA; code có thể dùng license riêng.
4. **Các vấn đề dữ liệu nghiêm trọng:**
   - Trường `hsk` của xue-hanzi **không dùng được**: gán cho 116.753 entry, có cả "cấp 7"; 1.812 từ khác nhau được gắn HSK1 [ĐO].
   - Trường `sv` (Hán Việt) của **từ nhiều chữ** trong xue-hanzi chỉ là âm của **chữ đầu**: 学习 → `"học"` [ĐO][CODE `getSinoViet` lấy `[...simp][0]`].
   - **Thiếu Hán Việt cho cả chữ cơ bản:** 35/301 chữ Hán trong câu HSK1 và 337/1.799 chữ trong toàn bộ câu HSK1–6 không có Hán Việt trong dữ liệu xue-hanzi. Ví dụ 很, 您, 谁, 这, 识, 问, 坐, 她, 爸, 北, 饭… [ĐO].
   - hsk1-chinese-learning có **152** mục (UI và README ghi 150). 2 mục cuối **庞立亮, 卢氏芳 là tên người thật** → phải loại [ĐO].
5. **Handwriting thực tế đi qua Google:** UI tìm kiếm của xue-hanzi (`search-dialog.tsx:239-240`) dùng `HanziInput` → `/api/handwriting` → **endpoint không chính thức của Google Input Tools**. Bộ nhận dạng offline WASM (`public/hanzi-worker.js` + `hanzi_lookup`) **có trong repo nhưng không được component nào gọi** [CODE].
6. **Cả 3 repo đều thiếu:**
   - nghĩa Việt cho câu HSK2–6;
   - giải thích ngữ pháp bằng tiếng Việt;
   - bài đọc (reading passage);
   - bài tập nghe có câu hỏi;
   - chấm phát âm;
   - luyện viết có chấm nét;
   - audio cho từng từ;
   - lộ trình bài học HSK2–6;
   - danh sách từ HSK chuẩn kèm cấp độ;
   - tài khoản người dùng thật.

---

## 1. Tech stack · Entry point · Backend · Dependencies

| Hạng mục | xue-hanzi | hsk-sentences-audio | hsk1-chinese-learning |
|---|---|---|---|
| Loại | Web app + PWA, full-stack | Dataset + pipeline build (Python) + loader npm/PyPI + web xem dataset tĩnh | Static site (GitHub Pages) |
| Ngôn ngữ / framework | TypeScript, Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui (Base UI), Serwist (PWA) | Python (build), JS thuần (loader), React + Vite (ví dụ) | HTML/CSS/JS thuần, không build, không framework |
| Entry point | `src/app/layout.tsx`, `src/app/page.tsx`; trang từ `src/app/word/[simp]/page.tsx`; flashcard `src/app/flashcards/page.tsx`; service worker `src/app/sw.ts` | Build: `build.py`. Data: `dist/sentences.json`. Web: `dist/index.html`. Loader: `packages/npm/index.js`, `packages/python/src/hsk_sentences_audio/__init__.py` | `index.html` nạp `js/vocabulary.js` → `pinyin.js` → `sentences.js` → `surprise.js` → `app.js` (IIFE) |
| API / backend | API routes: `/api/ai/stream`, `/api/ai/recognize`, `/api/handwriting`, `/api/history`, `/api/history/[id]`, `/api/history/verify`, `/api/report` (gửi Discord webhook). Server actions: `src/app/actions.ts`, `actions/flashcards.ts`, `actions/aiExplanation.ts`. DB **Turso/libSQL** (`src/lib/turso.ts`). AI: OpenRouter, Langfuse/OpenTelemetry (`instrumentation.ts`) | Không có backend runtime | Không có |
| Auth | **Không có tài khoản**: mọi dữ liệu ghi dưới `GUEST_USER_ID = "anonymous"` (`src/lib/aiConstants.ts:1`). Lịch sử/flashcard được bảo vệ bằng **1 passphrase chung** (`HISTORY_PASSPHRASE`, gửi Bearer, lưu localStorage `hch_passphrase`). `src/proxy.ts` là no-op (`matcher: []`) | — | — |
| Dependencies chính | `next ^16.2.6`, `react ^19.2.4`, `hanzi-writer ^3.7.3`, `chinese-lexicon ^1.0.43` (Node-only, dùng lúc build), `@libsql/client`, `@serwist/next`, `gsap`, `react-markdown`, `cmdk`, `lucide-react`, `@tabler/icons-react`, `@langfuse/*`, `@opentelemetry/*`. Có **cả** `package-lock.json` và `pnpm-lock.yaml` | Build: `pypinyin`, `opencc`, `PyYAML`, `jieba` (`requirements.txt`) + CosyVoice2 + ffmpeg cài riêng. Loader npm: **0 dependency**, Node ≥18 | Không có `package.json`; Google Fonts qua CDN; script tải audio chạy bằng Node |
| Cài đặt trong máy | Đã `pnpm install` (2026-09-25), `next dev` chạy được (xem mục 12) | Không cài Python (máy không có `python`) → không chạy pipeline | Không cần |
| Kích thước | `public/data/dictionary.json` 35 MB + `src/data/` ~27 MB | `dist/audio` 173 MB (8.708 mp3) + JSON ~6,7 MB | ~1 MB |
| Biến môi trường | `.env.example`: `TURSO_*`, `HISTORY_PASSPHRASE`, `OPENROUTER_API_KEY`, `LANGFUSE_*`, `NEXT_PUBLIC_DISCORD_WEBHOOK_URL`, `NEXT_PUBLIC_COUNTERAPI_KEY`, `NEXT_PUBLIC_SW_URL` | — | — |
| Deploy | Vercel (theo docs). README nhắc `ARCHITECTURE.md` ở root nhưng file **không tồn tại** (tài liệu thật ở `.claude/docs/`) | GitHub Pages (`.github/workflows/pages.yml`), npm, PyPI, Hugging Face (`huggingface/README.md`) | GitHub Pages |

Phụ thuộc mạng lúc runtime [CODE]:
- **xue-hanzi — dữ liệu nét:** tải từ `cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/<chữ>.json`. `StrokeBox.tsx:72` gọi HEAD để kiểm tra, `sw.ts:37` cache kết quả.
- **xue-hanzi — handwriting:** `recognize.ts:3` gọi `inputtools.google.com/request?ime=handwriting…`.
- **hsk-sentences-audio:** loader mặc định lấy audio từ `raw.githubusercontent.com/no7z/hsk-sentences-audio/main/dist/` (`DEFAULT_AUDIO_BASE_URL`). Sản phẩm thật **phải tự host**.
- **hsk1-chinese-learning:** phát âm từ và câu dùng `speechSynthesis` (`zh-CN`, rate 0,65 / 0,45). Giọng phụ thuộc thiết bị; máy không có giọng tiếng Trung thì không phát được.

---

## 2. Folder structure

### 2.1 xue-hanzi
```
src/app/                  App Router: page, layout, sw.ts, actions*.ts
  api/ai/{stream,recognize}  AI giải thích từ / AI nhận dạng chữ
  api/handwriting/         proxy Google IME
  api/history/…            đồng bộ lịch sử (passphrase)
  api/report/              gửi báo lỗi Discord
  flashcards/              DeckList, FlashcardDashboard, AuthGate, deck/[deckId], excluded, study/StudySession
  word/[simp]/             trang chi tiết từ
src/components/
  word/        WordInfoBox, DefinitionSection, EtymologySection, RelatedSection, StrokeBox, WordTabs, WordTabContent, WordAIExplanation, AddToFlashcardsButton
  hanzi/       HanziPad (canvas), HanziInput, recognize.ts, types.ts
  search/      search-dialog, WordRow, RecentSearch
  layout/      AppLayout, HistoryList, right-sheet, history/*
  ui/          ~27 component shadcn
src/core/      logic thuần TS: srs.ts, flashcard-engine.ts, flashcard-streak.ts, flashcard-types.ts,
               dictionary.ts (server), client-dictionary.ts (browser), segmenter.ts, stroke.ts, types.ts, pwa.ts
src/data/      CVDICT.u8, cvdict.json, kVietnamese.json, sinoViet-overrides.json, makemeahanzi-dictionary.txt
src/lib/       turso.ts (schema + migration), openrouter.ts, aiModels.ts, passphrase.ts, historyAuth.ts, slugify.ts
public/data/dictionary.json    dữ liệu runtime đã build (commit vào repo)
public/hanzi_lookup.js|_bg.wasm, hanzi-worker.js   nhận dạng offline (không được UI dùng)
public/prompts/                prompt AI
scripts/       build-dictionary.ts, parse-cvdict.ts, backfill-flashcards.ts
.claude/docs/  architecture.md, flashcards.md, agents.md, ux-search.md
```

### 2.2 hsk-sentences-audio
```
data/sentences/hsk1..6.yaml   NGUỒN câu (chỉ 3 trường: chinese, en, grammar)
data/grammar_points.json      413 điểm ngữ pháp
data/overrides.json           lớp sửa tay: polyphone, token_pinyin, seg_blocklist, segmentation
data/reference/               giọng tham chiếu TTS
build.py + lib/{cedict,flags,pinyin,segment,tts}.py + scripts/*.py   pipeline
dist/sentences.json           DỮ LIỆU CHÍNH (4.354 bản ghi) · dist/data.js (bản JS cho browser offline)
dist/audio/*.mp3              8.708 file
dist/index.html, setup.html   trình duyệt dataset / hướng dẫn tích hợp
dist/review_flags.txt         816 cờ chờ người duyệt (chủ yếu "polyphone?")
packages/npm, packages/python  loader + test
examples/react/               ví dụ React+Vite
```

### 2.3 hsk1-chinese-learning
```
index.html            1 trang, 6 section: home / learn / pinyin / sentence / pronounce / quiz
css/style.css
js/vocabulary.js      HSK1_VOCABULARY (152)
js/sentences.js       HSK1_SENTENCE_COURSES (15 bài × 5 câu)
js/pinyin.js          initials/finals/tones + nhóm khẩu hình môi (nhãn tiếng Việt)
js/app.js             toàn bộ UI, quiz, progress, TTS (~800 dòng)
js/surprise.js        đếm giờ học + "quà bất ngờ"/pháo hoa (cá nhân)
audio/pinyin/*.mp3    38 clip + manifest.json (README ghi 39)
scripts/              build-pinyin-audio.{mjs,py}, check-hsk-audio.mjs
```

---

## 3. Bảng so sánh tính năng

✅ có, dùng được · ⚠️ có nhưng hạn chế/có lỗi · ❌ không có

| Feature | xue-hanzi | hsk-sentences-audio | hsk1-chinese-learning | Nên lấy từ đâu |
|---|---|---|---|---|
| **HSK level** | ⚠️ `hsk` 1–7 trên 116.753/119.210 entry (1:1.969, 2:3.562, 3:9.337, 4:17.491, 5:25.844, 6:27.251, 7:31.299). Gán theo chinese-lexicon, quá rộng → **không dùng** | ✅ `hsk_level` 1–6 theo HSK 3.0 (GF0025-2021). Số câu: 281 / 538 / 727 / 801 / 965 / 1.042. Danh sách từ chuẩn **không có trong repo** (chỉ tải qua `download_hsk.py` để validate) | ⚠️ Chỉ HSK1, ~150 từ (bộ HSK 2.0) | Cấp của từ: **`complete-hsk-vocabulary` (MIT, nguồn ngoài)**. Cấp của câu: **hsk-sentences-audio** |
| **Vocabulary** | ✅ 119.210 entry; 4.147 chữ/từ có >1 entry (đa âm) | ⚠️ Không có bảng từ; 5.340 từ khác nhau trong `tokens` (pinyin + gloss EN) | ⚠️ 150 từ (+2 tên người) | Kho tra cứu: **xue-hanzi dictionary** (nhưng dựng lại từ nguồn gốc), lọc theo danh sách HSK chuẩn |
| **Pinyin** | ✅ `p` (dấu, ngăn âm tiết bằng `U+200B`), `pt` (`xue2xi2`), `sp` (không dấu) | ✅ `pinyin`, `pinyin_numbered`, pinyin từng token; xử lý thanh nhẹ, đa âm, lớp `overrides.json`. 816 cờ đa âm chưa duyệt | ⚠️ Viết tay; sau khi chuẩn hóa khoảng trắng chỉ **3/150** lệch xue-hanzi (不客气 bú/bù, 先生, 小姐 – thanh nhẹ). Có bảng âm vị (initials/finals/tones) | Câu: **hsk-sentences-audio**. Từ: **xue-hanzi `pt`** (chuẩn hóa). Bảng âm vị: ý tưởng từ hsk1-cl |
| **Hanzi** | ✅ giản + phồn (`s`,`t`); 15.566 mục 1 chữ; 2.249 mục chỉ phồn thể (`key`); etymology/thành phần | ✅ `chinese` + `traditional` (OpenCC) | ⚠️ Chỉ giản thể | **xue-hanzi** (chữ), **hsk-sentences-audio** (câu) |
| **Hán Việt** | ⚠️ Nguồn `kVietnamese.json` (Unihan, 8.300 chữ) + 11 override. Chỉ 5.843/15.566 mục 1 chữ có `sv`. Thiếu cả chữ cơ bản (很, 您, 谁, 这). `sv` của từ nhiều chữ = âm chữ đầu. App ghép lúc chạy (`client-dictionary.ts:102-111`, thiếu thì hiện `[字]`) | ❌ | ❌ | **Unihan kVietnamese từ nguồn gốc + tự biên tập**. Bắt buộc bổ sung: 35 chữ (HSK1) → 337 chữ (HSK1–6) |
| **Nghĩa tiếng Việt (từ)** | ✅ `vi` (CVDICT) cho 116.234/119.210 entry; phủ **5.278/5.278** từ trong câu HSK có trong từ điển. Chất lượng không đều: 1.547 entry chứa "(Tw)"/"LT:", nhiều nghĩa dịch sát CC-CEDICT | ❌ Chỉ EN (`gloss_en`) | ✅ 150 từ, ngắn gọn, thân thiện người học | **CVDICT (nguồn gốc)** làm nền; biên tập tay cho từ HSK. Nghĩa của hsk1-cl chỉ dùng nếu tác giả cho phép |
| **Câu ví dụ** | ❌ Chỉ có từ liên quan (`tw`), không có câu | ✅ 4.354 câu; 19 topic; `sentence_type` (statement 4.061 / imperative 217 / question 76); tokens + grammar tags | ⚠️ 75 câu (15 bài), chỉ **5/75** trùng dataset kia | **hsk-sentences-audio** |
| **Vietnamese content (câu)** | ❌ | ❌ (`translation.vi` = 0/4.354) | ✅ 75/75 câu | **Thiếu** – phải dịch (có thể thêm trường `vi:` vào YAML nguồn) |
| **Ngữ pháp** | ❌ | ⚠️ 413 điểm (cấp 1–6: 49/82/70/75/71/66), `{id, level, cat, sub, label, label_full, pattern, exclude, examples[]}`. Nhãn và ví dụ **tiếng Trung**; 70 điểm có regex tự nhận diện; 3.770/4.354 câu có `grammar_tags` | ❌ | **hsk-sentences-audio** (khung) + **tự viết giải thích tiếng Việt**. Xem license mục 7 |
| **Listening** | ❌ | ⚠️ Audio câu (thường + chậm), không có bài tập | ⚠️ TTS trình duyệt + audio âm vị | Audio: **hsk-sentences-audio**. Bài tập nghe: **thiết kế mới** |
| **Speaking / pronunciation** | ❌ | ❌ | ⚠️ "Luyện phát âm" = nghe TTS nhanh/chậm rồi tự đọc; **không** có `SpeechRecognition`, không chấm | **Thiếu** – cần STT/chấm thanh điệu. UX tham khảo hsk1-cl |
| **Audio** | ❌ | ✅ 8.708 MP3, CosyVoice2-0.5B, giọng **tổng hợp** `zh-female-studio`, 24 kHz, 173 MB; thiếu 0 file | ⚠️ 38 clip âm vị (34 "isolated" từ zxq432/py, 4 thanh "ma" từ mp3-chinese-pinyin-sound / audio-cmn) | Câu: **hsk-sentences-audio**. Âm vị: **tự làm lại/lấy nguồn có license rõ**. Audio từ: **thiếu** |
| **Reading** | ❌ | ⚠️ Chỉ câu rời | ❌ | **Thiếu** |
| **Writing Hanzi / Stroke order** | ✅ `hanzi-writer` bọc trong `src/core/stroke.ts` + `StrokeBox.tsx` (hoạt ảnh + danh sách nét). **Không dùng chế độ `quiz()`** của hanzi-writer | ❌ | ❌ | Dùng **thư viện `hanzi-writer` + `hanzi-writer-data` trực tiếp**, tự host data; chế độ quiz có sẵn trong thư viện |
| **Handwriting (nhận dạng)** | ⚠️ `HanziPad` (canvas) → `HanziInput` → `/api/handwriting` → **Google IME không chính thức**. Có thêm `/api/ai/recognize` (OpenRouter) và WASM `hanzi_lookup` nhưng UI không dùng | ❌ | ❌ | **`hanzi_lookup` (gugray) từ nguồn gốc**, chạy offline; chỉ tham khảo cách làm canvas của xue-hanzi |
| **Quiz** | ❌ Chỉ flashcard tự chấm (2 nút) | ❌ | ✅ 10 câu: chữ + pinyin → chọn nghĩa Việt (1 đúng + 3 nhiễu ngẫu nhiên); quiz câu; lưu điểm lần cuối | Ý tưởng từ **hsk1-cl**, **viết lại**; sinh câu hỏi từ dataset câu |
| **SRS / ôn tập** | ✅ SM-2 chuẩn trong `src/core/srs.ts` (thuần, 60 dòng), chỉ 2 mức (q=2/5); `lapses`, leech (≥3 lần sai hoặc gắn cờ tay), "mastered" ≥21 ngày, tối đa 50 thẻ mới/phiên, deck tự động (`all`, `hsk:N`, `month:…`, `leech`), phiên luyện trước hạn không đổi lịch, `flashcard_review_log` | ❌ | ❌ | **Tham khảo xue-hanzi, viết lại** (SM-2 là thuật toán công khai). Nên chấm 4 mức. Không dùng deck `hsk:N` vì `hsk` sai |
| **Progress tracking** | ⚠️ Turso: `flashcard_*`, `user_words` (lượt xem), `user_history`, streak (`flashcard-streak.ts`). Chỉ 1 user `anonymous` | ❌ | ⚠️ localStorage: `hsk1-learned-words`, `hsk1-sentence-mastered`, `hsk1-sentence-progress`, `hsk1-sentence-settings`, `hsk1-sentence-last-score`, `hsk1-study-ms` | **Thiết kế mới có tài khoản**; tham khảo schema xue-hanzi |
| **Lesson / learning path** | ❌ | ⚠️ Không có bài; dựng được từ `hsk_level` + `topic` + `grammar_tags` | ⚠️ 15 bài HSK1: 打招呼, 自我介绍, 国家和语言, 数字和时间, 家庭成员, 地点和方向, 日常活动, 吃饭点餐, 购物, 天气和季节, 交通出行, 电话沟通, 学校生活, 爱好和朋友, 复习和鼓励 | **Dựng mới** trên dataset câu; khung chủ đề HSK1 tham khảo hsk1-cl |
| Etymology / bộ thủ (thêm) | ✅ chinese-lexicon + makemeahanzi fallback | ❌ | ❌ | makemeahanzi (nguồn gốc) |
| AI giải thích (thêm) | ✅ OpenRouter, prompt `public/prompts/*.md`, log sử dụng | ❌ | ❌ | Tham khảo; cân nhắc chi phí |
| PWA / offline (thêm) | ✅ Serwist, cache từ điển + dữ liệu nét | ⚠️ `dist/index.html` chạy offline | ✅ Tĩnh | Tham khảo `sw.ts`, `pwa.ts` |

---

## 4. File chứa DỮ LIỆU

| File | Repo | Nội dung | Số lượng [ĐO] |
|---|---|---|---|
| `public/data/dictionary.json` | xue-hanzi | Từ điển runtime đã build (35 MB) | 119.210 entry |
| `src/data/CVDICT.u8` → `cvdict.json` | xue-hanzi | Nghĩa Việt CVDICT (nguồn + bản parse) | 10,9 MB / 13,9 MB |
| `src/data/kVietnamese.json` | xue-hanzi | Hán Việt theo chữ (Unihan), `{chữ: [âm…]}` | 8.300 chữ |
| `src/data/sinoViet-overrides.json` | xue-hanzi | Sửa tay Hán Việt | 11 chữ |
| `src/data/makemeahanzi-dictionary.txt` | xue-hanzi | Phân rã/etymology, JSON-lines | 2,6 MB |
| (npm) `chinese-lexicon` | xue-hanzi | Nguồn EN, pinyin, HSK, tần suất, etymology — chỉ dùng lúc build, **chưa cài** | — |
| `public/prompts/*.md` | xue-hanzi | Prompt AI | 2 file |
| `data/sentences/hsk{1..6}.yaml` | hsk-sentences-audio | Nguồn câu | 4.354 |
| `data/grammar_points.json` | hsk-sentences-audio | Điểm ngữ pháp | 413 |
| `data/overrides.json` | hsk-sentences-audio | Sửa pinyin/tách từ | — |
| `dist/sentences.json`, `dist/data.js` | hsk-sentences-audio | Dataset đã build | 4.354 |
| `dist/audio/*.mp3` | hsk-sentences-audio | Audio câu | 8.708 (173 MB) |
| `dist/review_flags.txt` | hsk-sentences-audio | Cờ cần duyệt | 816 dòng |
| `js/vocabulary.js` | hsk1-cl | `HSK1_VOCABULARY` | 152 |
| `js/sentences.js` | hsk1-cl | `HSK1_SENTENCE_COURSES` | 15 bài / 75 câu |
| `js/pinyin.js`, `audio/pinyin/manifest.json`, `audio/pinyin/*.mp3` | hsk1-cl | Âm vị + audio | 38 clip |

### Schema

**xue-hanzi `dictionary.json`** (kiểu `DictEntry` trong `scripts/build-dictionary.ts`; kiểu UI `WordEntry` trong `src/core/types.ts`):
```jsonc
{"s":"学习","t":"學習","p":"xué\u200bxí","pt":"xue2xi2","sp":"xuexi","b":31.3,
 "vi":"học / tìm hiểu","sv":"học","en":["to learn","to study"],"hsk":1,"mwr":1218,"bwr":352,
 "tw":[{"word","trad","gloss"}],                       // từ liên quan
 "etym":{"notes","components":[{"char","type","def","p","sv"}]},   // chỉ chữ đơn
 "key":"殺"}                                           // chỉ mục phồn thể riêng
```
Không có `id`; khóa `s` **không duy nhất** (4.147 giá trị lặp do đa âm).

**xue-hanzi Turso** (`src/lib/turso.ts`):
- **Flashcard:** `flashcard_cards` (SM-2 + `lapses`, `excluded_at`, `flagged_hard_at`, `UNIQUE(user_id, simp)`), `flashcard_decks`, `flashcard_deck_cards`, `flashcard_sessions`, `flashcard_review_log`.
- **Lịch sử và ghi chú:** `user_words`, `user_history`, `notebook_groups`, `notebook_lyrics`, `word_etymology_links`.
- **AI:** `ai_explanations`, `ai_usage_log`.
- **Cách tạo schema:** chạy DDL `IF NOT EXISTS` lúc runtime rồi `ALTER TABLE` có điều kiện; **không có công cụ migration**.

**hsk-sentences-audio `sentences.json`** (có `index.d.ts`):
```jsonc
{"id":"hsk1-0002","hsk_level":1,"topic":"greetings","sentence_type":"statement",
 "chinese","traditional","pinyin","pinyin_numbered","translation":{"en"},
 "tokens":[{"word":"你","pinyin":"nǐ","gloss_en":"you (informal…)"}],
 "grammar_points":["很 + adj"],"grammar_tags":["1-09"],
 "audio":{"normal":"audio/hsk1-0002.mp3","slow":"audio/hsk1-0002_slow.mp3"},
 "audio_meta":{"engine":"cosyvoice2-0.5B","voice":"zh-female-studio","license":"Apache-2.0","sample_rate":24000}}
```

**hsk1-chinese-learning:** `HSK1_VOCABULARY = [{hanzi, pinyin, vietnamese}]`; `HSK1_SENTENCE_COURSES = [{courseId, courseTitle, sentences:[{hanzi, pinyin, translation}]}]`; pinyin: `{…, audio, audioKey, audioSource}`. Không có id → khóa là chuỗi `hanzi`.

---

## 5. File chứa COMPONENT / LOGIC

| Chức năng | xue-hanzi | hsk-sentences-audio | hsk1-cl |
|---|---|---|---|
| Hiển thị từ | `components/word/WordInfoBox.tsx`, `DefinitionSection.tsx`, `WordTabs.tsx`, `WordTabContent.tsx`, `RelatedSection.tsx`, `EtymologySection.tsx` | `dist/index.html` | `app.js` → `renderVocabGrid` |
| Tra cứu / tìm kiếm | `components/search/search-dialog.tsx`, `core/client-dictionary.ts`, `core/segmenter.ts` | `packages/npm/index.js` (`filterSentences`) | `setupSearch` |
| Stroke order | `core/stroke.ts`, `components/word/StrokeBox.tsx` | — | — |
| Handwriting | `components/hanzi/HanziPad.tsx`, `HanziInput.tsx`, `recognize.ts`, `app/api/handwriting/route.ts`, `app/api/ai/recognize/route.ts`, `public/hanzi-worker.js` | — | — |
| SRS / flashcard | `core/srs.ts`, `core/flashcard-engine.ts`, `core/flashcard-streak.ts`, `core/flashcard-types.ts`, `app/actions/flashcards.ts`, `app/flashcards/**` | — | — |
| Audio | — | `audioUrl()` trong loader | `speak()`, `playPinyinAudio()` |
| Quiz | — | — | `startQuiz`/`showQuizQuestion`/`handleQuizAnswer`, `startSentenceQuiz`… |
| Tiến độ | `app/flashcards/FlashcardDashboard.tsx`, `DeckSessionsTable.tsx` | — | `load*/save*` localStorage, `updateProgressBadge`, `surprise.js` |
| Pinyin chart | — | — | `renderPinyinInitials/Finals/Tones`, `js/pinyin.js` |

---

## 6. Tái sử dụng vs Tham khảo

"Tái sử dụng" chỉ áp dụng khi license cho phép. Mọi file của repo **không có license** mặc định chỉ được **tham khảo**.

### 6.1 Có thể tái sử dụng

| File | Repo | Điều kiện |
|---|---|---|
| `dist/sentences.json`, `dist/audio/*` | hsk-sentences-audio | CC-BY-SA 4.0: ghi công, dữ liệu dẫn xuất cùng license, ghi "giọng tổng hợp" |
| `data/sentences/hsk*.yaml` | hsk-sentences-audio | Như trên. Là chỗ tốt để thêm bản dịch Việt rồi build lại |
| `packages/npm/index.js` + `index.d.ts` | hsk-sentences-audio | MIT (code) |
| `lib/pinyin.py`, `lib/segment.py`, `scripts/hsk_validate.py`, `build.py` | hsk-sentences-audio | MIT (code). Cần Python + pypinyin/jieba/opencc |
| `data/grammar_points.json` | hsk-sentences-audio | ⚠️ Khung lấy từ GF0025-2021 qua **krmanik/HSK-3.0** – nguồn này **không có trong ATTRIBUTION.md** → xác minh license trước khi dùng |
| CVDICT, kVietnamese (Unihan), makemeahanzi, hanzi_lookup | nằm trong xue-hanzi nhưng là của bên thứ ba | **Lấy từ repo gốc**, không copy qua xue-hanzi; tuân thủ license gốc (mục 9) |

### 6.2 Chỉ nên tham khảo (không copy)

| File | Repo | Học được gì |
|---|---|---|
| `src/core/srs.ts`, `flashcard-engine.ts`, `flashcard-types.ts`, `flashcard-streak.ts`, `.claude/docs/flashcards.md` | xue-hanzi | SM-2, leech, cap thẻ mới, phiên luyện trước hạn, log ôn tập, streak |
| `src/lib/turso.ts` | xue-hanzi | Mô hình bảng flashcard/log |
| `scripts/build-dictionary.ts`, `parse-cvdict.ts`, `src/core/client-dictionary.ts` | xue-hanzi | Pipeline gộp nhiều nguồn, tải lười JSON lớn, ghép Hán Việt |
| `src/core/stroke.ts`, `StrokeBox.tsx` | xue-hanzi | Cấu hình hanzi-writer |
| `components/hanzi/HanziPad.tsx`, `public/hanzi-worker.js` | xue-hanzi | Thu nét canvas → WASM worker |
| `src/app/sw.ts`, `src/core/pwa.ts` | xue-hanzi | Chiến lược cache offline |
| `public/prompts/*.md`, `src/lib/openrouter.ts`, `aiModels.ts` | xue-hanzi | Prompt + rate limit AI |
| `src/components/ui/*` | xue-hanzi | shadcn — sinh lại bằng CLI, không copy |
| `js/app.js` (quiz, sentence mode, progress), `js/pinyin.js` (nhóm khẩu hình môi, nhãn Việt) | hsk1-cl | Luồng quiz, UX bảng pinyin cho người Việt |
| `js/sentences.js` (15 chủ đề), `js/vocabulary.js` | hsk1-cl | Khung bài HSK1, văn phong dịch Việt |
| `dist/index.html`, `dist/setup.html`, `examples/react/*` | hsk-sentences-audio | Lọc cấp/chủ đề/ngữ pháp, xuất Anki/CSV, tích hợp React |

### 6.3 Không nên dùng

| Thứ | Lý do |
|---|---|
| Trường `hsk` của xue-hanzi | Sai phạm vi (có cấp 7, 1.812 từ HSK1) |
| Trường `sv` của từ nhiều chữ | Chỉ là âm chữ đầu |
| `recognize.ts` / `/api/handwriting` (Google IME) | Endpoint không chính thức → ToS, có thể bị chặn |
| `庞立亮`, `卢氏芳` trong `vocabulary.js` | Tên người thật |
| `js/surprise.js` | Tính năng cá nhân |
| `audio/pinyin/*.mp3` (hsk1-cl) | Nguồn zxq432/py chưa rõ license |
| Logo/tên "Hiểu Chữ Hán", icon `public/icons/*` | Thương hiệu của tác giả |

---

## 7. Dữ liệu bị TRÙNG

| Giữa | Chi tiết [ĐO] |
|---|---|
| hsk1-cl ↔ xue-hanzi (từ) | 150/152 từ có trong xue-hanzi (thiếu 2 tên người). Pinyin chỉ lệch 3 từ. Nghĩa Việt chồng với `vi` CVDICT |
| hsk1-cl ↔ hsk-sentences (từ) | 148/152 xuất hiện trong `tokens`; 135 trong câu cấp 1 (câu cấp 1 có 476 từ khác nhau) |
| hsk1-cl ↔ hsk-sentences (câu) | Chỉ 5/75 câu trùng (bỏ dấu câu) → hai kho câu gần như độc lập |
| xue-hanzi ↔ hsk-sentences (từ) | 5.278/5.340 token có trong xue-hanzi (98,8%), tất cả đều có `vi` |
| Nội bộ hsk-sentences | 5 cặp câu trùng khác id: `hsk2-0390`≡`hsk6-0226`, `hsk4-0061`≡`hsk6-0476`, `hsk4-0705`≡`hsk6-1027`, `hsk5-0666`≡`hsk5-0938`, `hsk5-0803`≡`hsk5-0952` |
| Nội bộ xue-hanzi | 4.147 giá trị `s` có nhiều entry (đa âm) — hợp lệ nhưng phải khử khi join. `CVDICT.u8` và `cvdict.json` là cùng dữ liệu (nguồn + bản parse) |
| Nguồn gốc chung | Nghĩa EN của xue-hanzi và `gloss_en` hsk-sentences cùng gốc **CC-CEDICT** |

## 8. Dữ liệu có thể MAPPING

| Từ → Đến | Khóa | Lưu ý |
|---|---|---|
| `tokens[].word` → entry xue-hanzi | giản thể `s`, khử đa âm bằng pinyin | Chuẩn hóa: `pt` (`xue2xi2`) vs token pinyin dấu; `p` chứa `U+200B`. 62 token không khớp (请坐, 看到, 早点儿, 那会儿…) là cụm từ jieba, cần tách về từ gốc |
| `HSK1_VOCABULARY.hanzi` → xue-hanzi | `s` | 150/152 |
| `grammar_tags` → `grammar_points.id` | `"1-09"` | Khóa sạch |
| Chữ → Hán Việt | ký tự → `kVietnamese` (thử cả giản và phồn) | Thiếu 337/1.799 chữ trong câu HSK |
| Từ → cấp HSK | `complete-hsk-vocabulary` | Nguồn ngoài, lệch ~1% so với chuẩn chính thức **README CLAIM — NOT VERIFIED** |
| Câu → audio | `audio.normal` / `audio.slow` | 100% file tồn tại |
| Chủ đề bài hsk1-cl → `topic` dataset | map thủ công (打招呼→greetings, 家庭成员→family, 购物→shopping…) | 15 bài ↔ 19 topic |
| Chữ → dữ liệu nét | ký tự → `hanzi-writer-data/<chữ>.json` | Dùng dạng phồn/giản đúng (StrokeBox dùng `trad`) |

## 9. Dữ liệu THIẾU

| Thiếu | Chi tiết |
|---|---|
| Danh sách từ HSK1–6 chuẩn kèm cấp | Không repo nào có (xue-hanzi sai cấp; hsk-sentences chỉ tải để validate) |
| Hán Việt | Thiếu 35 chữ (≤HSK1), 81 (≤HSK2), 115 (≤HSK3), 169 (≤HSK4), 250 (≤HSK5), 337 (≤HSK6) trong số chữ xuất hiện ở câu |
| Nghĩa Việt biên tập cho từ HSK | Chỉ có CVDICT; 1.547 entry còn nhãn "(Tw)"/"LT:" |
| Dịch Việt cho câu | 0/4.354 (chỉ có 75 câu riêng của hsk1-cl) |
| Giải thích ngữ pháp tiếng Việt | 413 điểm chỉ có tiếng Trung |
| Audio từ đơn, audio âm vị có license rõ | Không có |
| Reading, bài nghe có câu hỏi, chấm phát âm, luyện viết có chấm | Không có |
| Learning path HSK2–6 | Không có |
| Tài khoản người dùng | Không có ở repo nào |
| Chất lượng pinyin câu | 816 cờ đa âm chưa duyệt (`review_flags.txt`) |
| Script tải ngữ pháp | `gen_grammar_registry.py` nhắc `scripts/download_grammar.py` nhưng **file không tồn tại** → không tái tạo được `grammar_points.json` từ đầu |

---

## 10. LICENSE

| Thành phần | License | Hệ quả |
|---|---|---|
| **Code xue-hanzi** | **Không có** (không file LICENSE, không trường `license` trong package.json) [ĐO] | Không copy/fork khi chưa có văn bản cho phép của tác giả (phucbm) |
| **Code + nội dung hsk1-cl** (kể cả nghĩa Việt, câu dịch) | **Không có** [ĐO] | Như trên (tác giả ALiangPang) |
| Code hsk-sentences-audio | MIT (`LICENSE`, ghi rõ chỉ áp cho code) [ĐO] | Tự do, giữ notice |
| `dist/` hsk-sentences-audio | CC-BY-SA 4.0 (`ATTRIBUTION.md`, `DATASET_LICENSE` trong loader) [ĐO] | Ghi công; dữ liệu dẫn xuất cùng license |
| Audio CosyVoice2 | Model Apache-2.0; tác giả khuyên ghi "合成语音 / giọng tổng hợp" [ĐO] | Ghi nhãn trong UI |
| `grammar_points.json` | Dựa trên GF0025-2021 (tiêu chuẩn quốc gia TQ), số hóa bởi krmanik/HSK-3.0 — **không được ghi công trong ATTRIBUTION** [CODE] | **UNKNOWN** license krmanik/HSK-3.0 |
| CC-CEDICT | CC-BY-SA 4.0 | Share-alike |
| CVDICT | CC-BY-SA 4.0 (header `CVDICT.u8`) [ĐO] | Ghi công ph0ngp/CVDICT, share-alike |
| Unihan `kVietnamese` | Unicode License **UNKNOWN** | Thường cho phép dùng kèm notice |
| makemeahanzi | **UNKNOWN** — xem `COPYING` repo gốc (dữ liệu dẫn xuất từ Arphic) | Kiểm tra trước khi dùng |
| `hanzi-writer` / `hanzi-writer-data` | Thư viện **MIT** [ĐO, `node_modules/hanzi-writer/package.json`]. `COPYING.md` ghi rõ data nét lấy từ Make Me a Hanzi + font Arphic → **Arphic Public License** | Code dùng tự do; tự host data nét phải kèm notice Arphic PL |
| `hanzi_lookup` (WASM) | **UNKNOWN** — xem repo gốc gugray/hanzi_lookup | Lấy từ gốc, tuân thủ notice |
| `chinese-lexicon` | package.json ghi **ISC** nhưng không kèm file LICENSE [ĐO]; dữ liệu bên trong trộn CC-CEDICT (CC-BY-SA) + nguồn khác | Code ISC; phần dữ liệu vẫn chịu CC-BY-SA. Không phụ thuộc vào trường `hsk`/`etym` của nó |
| Audio âm vị hsk1-cl | zxq432/py: **UNKNOWN**; mp3-chinese-pinyin-sound, audio-cmn: **UNKNOWN** | Không dùng đến khi rõ |
| Google Input Tools | Không phải API công khai | Không dùng cho sản phẩm |
| Thương hiệu "Hiểu Chữ Hán", icon | Không license | Không dùng |

**Cần quyết định:**
1. Tách rõ license **code** (tự chọn) và **dữ liệu** (CC-BY-SA 4.0), như hsk-sentences-audio đã làm.
2. Với xue-hanzi và hsk1-cl, chọn một trong hai: (a) xin phép tác giả bằng văn bản, hoặc (b) chỉ tham khảo ý tưởng, tự viết lại và lấy dữ liệu từ nguồn gốc.
3. Làm trang "Ghi công" trong app cho CC-CEDICT, CVDICT, Unihan, hanzi-writer-data, hanzi_lookup, CosyVoice2 và hsk-sentences-audio.

---

## 11. Đề xuất "Nên lấy từ đâu" (tổng hợp, chưa hành động)

| Nhu cầu | Nguồn | Việc phải làm thêm |
|---|---|---|
| Danh sách từ + cấp HSK | `complete-hsk-vocabulary` (ngoài) | Đối chiếu chuẩn chính thức |
| Pinyin / nghĩa Việt / Hán Việt từ | CVDICT + Unihan (nguồn gốc) | Biên tập tay HSK1–3 trước; bổ sung Hán Việt cho chữ thiếu; khử đa âm |
| Câu + pinyin + tách từ + audio | hsk-sentences-audio | Dịch Việt; bỏ 5 câu trùng; duyệt 816 cờ đa âm; tự host 173 MB audio |
| Ngữ pháp | hsk-sentences-audio (khung) | Xác minh license; viết giải thích tiếng Việt |
| Stroke order + luyện viết | `hanzi-writer` + `hanzi-writer-data` | Tự host data; dùng `quiz()` cho luyện viết |
| Nhận dạng chữ viết tay | `hanzi_lookup` (offline) | Tuân thủ license gốc; không dùng Google IME |
| SRS | Tự viết SM-2/FSRS (tham khảo xue-hanzi) | Tài khoản người dùng, chấm 4 mức |
| Quiz / UX HSK1 / bảng pinyin | Ý tưởng hsk1-cl | Viết lại; sinh câu hỏi từ dataset |
| Learning path | Dựng từ `hsk_level` + `topic` + `grammar_tags` | Thiết kế bài HSK1–6 |
| Reading, bài nghe, chấm phát âm, audio từ | **Không có** | Tìm nguồn hoặc tự tạo |

---

## 12. Phương pháp & giới hạn

- Số liệu [ĐO] lấy từ script Node đọc trực tiếp `dictionary.json`, `kVietnamese.json`, `sentences.json`, `grammar_points.json`, `vocabulary.js`, `sentences.js` và kiểm tra sự tồn tại của file audio.
- Cập nhật 2026-09-25: đã `pnpm install` cho xue-hanzi (git status vẫn sạch) và chạy `next dev`. Trang chủ, `/word/学` và `/data/dictionary.json` đều trả về 200; không có Turso/OpenRouter nên phần flashcard/lịch sử/AI chưa thử. Không cài Python (hướng đi chỉ dùng TypeScript, dùng dữ liệu đã build sẵn của hsk-sentences-audio).
- Chưa nghe audio; chất lượng giọng CosyVoice2 chưa đánh giá.
- Chất lượng nghĩa Việt CVDICT chỉ lấy mẫu, chưa đánh giá toàn bộ.
- **So với bản audit 2026-09-24** (bản gốc vẫn ở `C:\Users\Admin\hoc-tieng-trung\docs\REPO_AUDIT.md`), bản này sửa/bổ sung:
  - handwriting trong UI thực tế dùng Google IME, không dùng WASM;
  - pinyin hsk1-cl chỉ lệch 3 từ (không phải 16);
  - `GUEST_USER_ID` = `"anonymous"`;
  - thêm số liệu thiếu Hán Việt theo cấp;
  - thêm nguồn krmanik/HSK-3.0 chưa được ghi công và file `download_grammar.py` bị thiếu;
  - thêm 816 cờ đa âm chưa duyệt;
  - thêm các bảng Turso ngoài flashcard;
  - thêm số câu theo cấp và theo loại câu.
- Audit này không phải tư vấn pháp lý.
