# DATA MAPPING — quy tắc ánh xạ dữ liệu nguồn → canonical model

- **Tạo:** 2026-09-25, bởi Claude, ở bước DATA MODEL. File này **chưa tồn tại** khi PHASE 1 được yêu cầu. Nội dung được suy ra từ `docs/ARCHITECTURE.md` §18–21 và `docs/REPO_AUDIT.md` §7–8, **cần người dùng duyệt**.
- **Nhãn** theo `CLAUDE.md` §11: [ĐO] / [CODE] = đã kiểm; UNKNOWN; UNRESOLVED; README CLAIM — NOT VERIFIED.
- **Phạm vi PHASE 1:** HSK1 (chuẩn **HSK 3.0 – 2021**, mặc định theo ARCHITECTURE D5 vì người dùng chưa chốt §23).

## 1. Nguồn và cách đọc

| `source.id` | Đọc từ | Phiên bản cố định | License | `publishable` |
|---|---|---|---|---|
| `cvdict` | `repos/xue-hanzi/src/data/CVDICT.u8` (bản nguyên văn CVDICT, header xác nhận) [ĐO] | qua xue-hanzi@`c1e7610` | CC-BY-SA 4.0 [ĐO] | ✅ |
| `unihan-kvietnamese` | `repos/xue-hanzi/src/data/kVietnamese.json` (Unihan `kVietnamese` đã được xue-hanzi chuyển sang JSON) | qua xue-hanzi@`c1e7610` | Unicode License — **UNKNOWN** (chưa đối chiếu bản gốc) | ✅ (tạm, chờ xác minh) |
| `xue-hanzi-sinoviet-overrides` | `repos/xue-hanzi/src/data/sinoViet-overrides.json` (11 chữ, do tác giả xue-hanzi viết) | `c1e7610` | **Không có license** | ❌ |
| `makemeahanzi` | `repos/xue-hanzi/src/data/makemeahanzi-dictionary.txt` | qua xue-hanzi@`c1e7610` | **UNKNOWN** | ✅ (tạm, chờ xác minh) |
| `complete-hsk-vocabulary` | `sources/raw/complete-hsk-vocabulary/<sha>/new/{1..6}.json` (tải về) | `7ac65bf1a6387d35f1ade478906172a19311c7f9` | MIT [ĐO qua GitHub API] | ✅ |
| `hsk-sentences-audio` | `repos/hsk-sentences-audio/dist/sentences.json`, `dist/audio/*` | `857dfba` | data CC-BY-SA 4.0, code MIT [ĐO] | ✅ |
| `hsk-grammar-krmanik` | `repos/hsk-sentences-audio/data/grammar_points.json` | `857dfba` | **UNKNOWN** (nguồn krmanik/HSK-3.0) | ❌ (chờ xác minh) |
| `hsk1-chinese-learning` | `repos/hsk1-chinese-learning/js/vocabulary.js`, `js/sentences.js` | `8d635bd` | **Không có license** [ĐO] | ❌ |
| `derived` | sinh bởi importer (VD cấp HSK của chữ, bản nháp lesson) | theo lần chạy | — | ✅ |

- `publishable = false`: dữ liệu vẫn được import để **mapping/đối chiếu**, nhưng tầng hiển thị không được dùng. Đây là cột bổ sung vào bảng `sources` so với ARCHITECTURE §18.1; lý do: người dùng yêu cầu adapter cho repo không có license.
- **Importer không đọc `xue-hanzi/public/data/dictionary.json`**, vì đây là sản phẩm build của xue-hanzi, không phải dữ liệu gốc.
- Importer kiểm tra commit của từng repo (`git rev-parse HEAD`) và sha256 các file trong `sources/manifest.json` → sai là dừng.

## 2. Chuẩn hóa

| Hàm | Quy tắc |
|---|---|
| `normalizeHanzi` | Unicode NFC, trim |
| `pinyinKey(numbered)` | chữ thường, bỏ khoảng trắng/`'`/`·`, `u:`/`ü` → `v`, thanh nhẹ = `5` (VD `ni3hao3`, `ba4ba5`). **Khóa canonical của Word.** |
| `numberedToMarked` | đặt dấu thanh theo quy tắc a/e > ou > nguyên âm cuối; `5` → không dấu |
| `pinyinCompare(x)` | NFC → chữ thường → bỏ khoảng trắng, `'`, `U+200B`, dấu câu → dùng để so pinyin có dấu của các nguồn |
| `pinyinToneless(x)` | như trên + bỏ dấu thanh → so khớp dự phòng |
| `sentenceHash` | NFC → bỏ mọi khoảng trắng + dấu câu (Trung/Latin) → sha1 |

## 3. Mapping theo entity

### 3.1 Character (`content.characters`)
- **Khóa:** `hanzi` (1 ký tự, giản thể như xuất hiện trong nguồn). `source_record_id` cho Unihan = `U+XXXX`.
- **Phạm vi PHASE 1:** mọi chữ Hán xuất hiện trong từ HSK1 và trong câu HSK1 (cả hai nguồn câu).
- **Thuộc tính:**
  - Hán Việt ← `unihan-kvietnamese` (thử chữ giản, rồi dạng phồn thể của nó theo CVDICT), sau đó `xue-hanzi-sinoviet-overrides` (không publish). Thiếu → `review_queue` (`missing_sino_viet`).
  - pinyin ← các entry 1 chữ trong CVDICT.
  - bộ thủ, cấu tạo, etymology ← `makemeahanzi`.

### 3.2 Word (`content.words`)
- **Khóa:** `(simplified, pinyin_key)`. Nhiều dòng CVDICT cùng khóa (khác phồn thể) → **1 word**, nhiều `entity_sources`.
- **Nghĩa Việt** ← CVDICT (`status=imported`). Nghĩa từ hsk1-chinese-learning → `word_senses` riêng với `source=hsk1-chinese-learning` (không publish).
- **Cấp HSK** ← complete-hsk-vocabulary `new/1.json` → `hsk_assignments(standard='hsk3-2021', level='1')`.
  - **Chọn cách đọc cho mỗi mục** (sửa 2026-09-25 sau khi đo dữ liệu thật). Mỗi mục liệt kê **mọi** cách đọc CC-CEDICT: 506 mục / 675 form [ĐO], VD 吧 = `ba1|ba5|bia1`. Không phải form nào cũng là cách đọc HSK, nên:
    1. bỏ form viết hoa (tên riêng) nếu có form viết thường; nếu chỉ có form viết hoa (北京, 中国…) thì giữ;
    2. gộp các form trùng `pinyin_key`;
    3. còn >1 cách đọc → giữ các cách đọc **xuất hiện trong token câu HSK1** của hsk-sentences-audio;
    4. vẫn không xác định được (không cách đọc nào xuất hiện) → giữ tất cả cách đọc viết thường + `review_queue` (`hsk_reading_ambiguous`). Đã đo: 9 mục (差 打 地 弟 分 干 正 中 子). 了 có cả `le5` và `liao3` xuất hiện trong câu → giữ cả hai theo bước 3.
  - Mỗi cách đọc được giữ = 1 word `in_curriculum = true`.
- **Word HSK không có trong CVDICT** → vẫn tạo word (`kind='word'`), gắn `missing_vi`.
- **`word_characters`:** tách chữ theo thứ tự, trỏ tới characters.
- **Hán Việt của từ:** **không lưu**, tính từ chữ lúc đọc.

### 3.3 Sentence (`content.sentences`)
- **Khóa chống trùng:** `content_hash` (UNIQUE). Nguồn thứ hai trùng hash → chỉ thêm `entity_sources`.
- `source_record_id`: hsk-sentences-audio = `id` (VD `hsk1-0002`); hsk1-chinese-learning = `<courseId>#<index>`.
- **Tokens (hsk-sentences-audio)** → `sentence_tokens`, map sang word:
  1. các word có `simplified = token.word`;
  2. khớp `pinyinCompare`, rồi khớp `pinyinToneless` (biến điệu 不/一);
  3. chỉ có 1 ứng viên → nhận;
  4. không có word → tra CVDICT, tạo word ngoài curriculum;
  5. không có trong CVDICT → `resolution='unresolved'` + `review_queue`.
  - Dấu câu → `resolution='punct'`.
- **Câu hsk1-chinese-learning:** không có token → không tách từ ở PHASE 1 (UNRESOLVED: cần segmenter).
- **Bản dịch:** `translation.en` → `sentence_translations(lang='en')`; bản Việt hsk1-chinese-learning → `lang='vi'`, không publish.

### 3.4 Grammar
- `grammar_points` theo `code` (VD `1-09`) ← `grammar_points.json` level 1.
- `sentence_grammar` ← `grammar_tags`.

### 3.5 Audio (`content.audio_assets`)
- **File:** mỗi `audio.normal` / `audio.slow` của câu HSK1 → copy sang `.data/assets/audio/hsk-sentences-audio/<file>` (tách khỏi repo nguồn).
- **Metadata:**
  - `storage_key = audio/hsk-sentences-audio/<file>`;
  - `sha256`, `engine`, `voice`, `is_synthetic=true`, `license` lấy từ `audio_meta`;
  - `duration_ms` = UNKNOWN (dataset không có).

### 3.6 Lesson
- **ARCHITECTURE §16:** lesson là dữ liệu editorial. PHASE 1 sinh **bản nháp** `data/editorial/lessons/hsk1/<topic>.yaml`, mỗi bản nháp ứng với một `topic` của câu HSK1 (`status: draft`, `source: derived`), rồi importer editorial nạp YAML → `lessons` / `lesson_steps` / `lesson_step_items`.
- **Các bước trong bản nháp:**
  - `vocabulary`: từ HSK1 xuất hiện lần đầu trong các câu của topic;
  - `examples`: các câu;
  - `listening`: các câu có audio.
- Nếu file YAML đã tồn tại và `status` khác `draft`, generator **không ghi đè**.

### 3.7 HSK
- `hsk_assignments(entity_type, entity_id, standard, level, source, derived)`:
  - word ← complete-hsk-vocabulary;
  - sentence ← `hsk_level`;
  - grammar ← `level`;
  - character ← derived (cấp thấp nhất của word HSK chứa chữ);
  - lesson ← `hsk_level` của lesson.

## 4. Kiểm tra (validation)
- **Lỗi (fail):**
  - duplicate character (`hanzi`);
  - duplicate word (`simplified + pinyin_key`);
  - duplicate sentence (`content_hash`);
  - broken audio (file không tồn tại hoặc sha256 sai).
- **Cảnh báo (liệt kê trong báo cáo):**
  - thiếu pinyin (character / word / sentence);
  - thiếu nghĩa Việt (word thuộc curriculum; sentence);
  - thiếu cấp HSK (word thuộc curriculum, sentence, grammar);
  - thiếu Hán Việt (character);
  - token chưa map được.
- Báo cáo: `reports/phase1-validation.md`.

## 5. UNRESOLVED / cần duyệt
1. License của Unihan (bản xue-hanzi), makemeahanzi, krmanik grammar → đang để UNKNOWN.
2. Token là cụm từ jieba (VD 请坐) → PHASE 1 tạo word ngoài curriculum nếu CVDICT có, còn không thì unresolved.
3. Tách từ cho câu hsk1-chinese-learning.
4. Chuẩn HSK 3.0 vs 2.0 (mặc định 3.0).
5. Kết quả PHASE 1 (2026-09-25), **UNRESOLVED**:
   - token 谁 `shuí` (2 lần): CVDICT chỉ có `shei2`;
   - 9 mục HSK đa âm;
   - 1 từ HSK không có trong CVDICT (车上);
   - 45 chữ HSK1 chưa có Hán Việt publishable.
   Chi tiết ở `reports/phase1-validation.md`.
