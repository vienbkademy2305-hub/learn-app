# Chinese Learning App

## 1. Product

Đây là nền tảng học tiếng Trung dành cho người Việt.

Mục tiêu:

* Học từ HSK1 trở lên
* Tiếng Việt là ngôn ngữ giải thích chính
* Học theo lesson
* Học từ vựng, câu, ngữ pháp
* Listening
* Speaking
* Reading
* Writing
* Quiz
* SRS
* Progress tracking

---

## 2. Repository roles

### xue-hanzi

Vai trò:

Chinese character / Hanzi engine.

Ưu tiên tái sử dụng:

* Hanzi data
* Pinyin
* Hán Việt
* Vietnamese meaning
* Radical
* Character structure
* Stroke order
* Handwriting
* Related words

Không coi xue-hanzi là nguồn duy nhất cho HSK curriculum.

---

### hsk-sentences-audio

Vai trò:

HSK sentence and listening dataset.

Ưu tiên:

* HSK1-HSK6 sentences
* Pinyin
* Grammar tags
* Topics
* Sentence types
* Normal audio
* Slow audio

Không coi repository này là learning UI hoàn chỉnh.

---

### hsk1-chinese-learning

Vai trò:

HSK1 beginner learning experience và Vietnamese learning content.

Ưu tiên tham khảo/tái sử dụng:

* Vietnamese explanations
* HSK1 vocabulary
* HSK1 sentence content
* Quiz ideas
* Progress logic
* Beginner learning flow
* Pinyin learning

Không giới hạn product ở HSK1.

---

## 3. Canonical data principle

Ứng dụng phải có một canonical data model.

Không được copy cùng một character/word/sentence thành nhiều bản độc lập nếu có thể mapping.

Mỗi imported entity phải giữ:

* source
* source_id

để có thể truy xuất nguồn gốc dữ liệu.

---

## 4. Vietnamese-first

UI và learning explanation ưu tiên tiếng Việt.

Ví dụ:

你好

nǐ hǎo

nhĩ hảo

Xin chào

Không chỉ hiển thị:

你好
nǐ hǎo
Hello

---

## 5. HSK architecture

Learning path:

HSK1
→ HSK2
→ HSK3
→ HSK4
→ HSK5
→ HSK6

Không hard-code app chỉ cho HSK1.

---

## 6. Data separation

Phân biệt:

Character
Word
Sentence
Lesson
Grammar

Ví dụ:

Character:
高

Word:
高兴

Sentence:
我很高兴认识你。

Không coi Character và Word là cùng một entity.

---

## 7. Audio

Audio phải có metadata:

* normal
* slow
* source

Không hard-code audio URL trong component nếu có thể quản lý bằng data layer.

---

## 8. Learning

Mỗi lesson có thể bao gồm:

1. Vocabulary
2. Pronunciation
3. Example sentences
4. Listening
5. Reading
6. Writing
7. Speaking
8. Quiz
9. Review

---

## 9. Repository modification rules

Không sửa source của repository gốc một cách tùy tiện.

Ưu tiên:

* adapter
* importer
* shared data layer
* reusable components

Trước khi thay đổi architecture lớn phải tạo plan.

---

## 10. Development workflow

Luôn theo thứ tự:

AUDIT
→ PLAN
→ DATA MODEL
→ IMPLEMENT
→ TEST
→ REVIEW

Không nhảy trực tiếp từ AUDIT sang IMPLEMENT.

---

## 11. Important rule

Không được tự suy đoán rằng một feature tồn tại trong repository.

Nếu chưa kiểm tra source code/data:

ghi rõ:

UNKNOWN

Nếu dữ liệu không thể xác định:

ghi:

UNRESOLVED

Nếu thông tin lấy từ README nhưng chưa xác nhận bằng source:

ghi:

README CLAIM — NOT VERIFIED

---

## 12. Trạng thái & ghi chú làm việc (bổ sung ngày 2026-09-25)

- Ngôn ngữ lập trình duy nhất: **TypeScript**. Không đưa Python vào dự án; dữ liệu hsk-sentences-audio dùng bản đã build sẵn (`dist/`).
- Repo nguồn hiện nằm ở `C:\Users\Admin\hoc-tieng-trung\repos\` (xue-hanzi, hsk-sentences-audio, hsk1-chinese-learning). Chỉ đọc, không sửa.
- Tài liệu: [docs/REPO_AUDIT.md](docs/REPO_AUDIT.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DATA_MAPPING.md](docs/DATA_MAPPING.md) (Claude tạo 2026-09-25, chờ duyệt).
- PHASE 2 — HSK1 LEARNING UI đã xong (kế hoạch: [docs/PHASE2_PLAN.md](docs/PHASE2_PLAN.md)). Site tĩnh Next.js (`output: "export"`) đọc snapshot `.data/content/hsk1.json` từ `pnpm content:export`; tiến độ học lưu localStorage. Kiểm tra: `pnpm build` → `pnpm smoke` (`reports/phase2-smoke.md`). Đăng GitHub Pages: `pnpm deploy:pages` (chỉ khi người dùng đồng ý). Bản dịch câu HSK1 trong `data/editorial/sentences-vi/hsk1.yaml` là bản nháp AI, chờ duyệt.
- PHASE 1 — DATA FOUNDATION (HSK1) đã xong: `pnpm sources:fetch` → `pnpm import:hsk1` → `pnpm validate`; `pnpm test`. DB cục bộ PGlite ở `.data/pglite`, audio ở `.data/assets` (gitignored, dựng lại được). Báo cáo: `reports/phase1-validation.md`. Chưa có UI.
- License (chi tiết ở mục 10 của audit):
  - xue-hanzi và hsk1-chinese-learning **không có LICENSE** → không copy code/nội dung khi chưa có cho phép; "tái sử dụng" ở mục 2 được hiểu là: tham khảo cách làm + import dữ liệu từ **nguồn gốc** (CVDICT, Unihan kVietnamese, makemeahanzi, hanzi-writer-data, hanzi_lookup), ghi `source` là nguồn gốc đó.
  - Dữ liệu CC-CEDICT / CVDICT / `dist/` hsk-sentences-audio là CC-BY-SA 4.0 → dữ liệu dẫn xuất phải cùng license; tách license code và data.
- Trả lời và viết tài liệu bằng tiếng Việt.
