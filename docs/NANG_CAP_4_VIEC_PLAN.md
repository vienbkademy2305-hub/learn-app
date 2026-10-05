# Kế hoạch nâng cấp: giọng nữ, Giai đoạn 3, tự chấm bài viết, game học thuộc từ

Trạng thái: **CHỜ DUYỆT** (2026-09-29). Chưa sửa code app hay dữ liệu.

Kế hoạch này gom 4 việc bạn yêu cầu. Nó dùng lại 2 kế hoạch có sẵn và nói rõ phần nào thay đổi:
- `docs/EN_AUDIO_PLAN.md`: thay giọng đọc tiếng Anh bằng file MP3.
- `docs/EN_WRITING_GRADER_PLAN.md`: chấm bài viết tiếng Anh bằng AI.

## 0. Việc phải làm trước

1. **Commit Buổi 31–45, gd2-mini-3, gd2-mini-4 và gd2-final.** Các buổi này đã soạn xong nhưng chưa commit. Giai đoạn 3 sẽ ghi vào cùng các file `data/en/lexicon/*.yaml`, nên phải commit trước để không lẫn thay đổi.
2. **Tránh hai phiên Claude cùng sửa một chỗ.** Hiện có một phiên khác (`lean-ngo-i-ng-77`) đang chạy. Trước mỗi đợt ghi vào `data/en` hoặc `src/features/en`, phải xem `git status` và danh sách phiên đang chạy.

---

## Việc 1. Giọng đọc tiếng Anh: giọng nữ, rõ ràng

**Hiện trạng.** `src/features/en/speech.tsx` dùng giọng có sẵn của trình duyệt. Code ưu tiên giọng Anh-Anh, không phân biệt nam hay nữ. Trên Windows, giọng Anh-Anh đầu tiên thường là *Microsoft George* hoặc *Ryan*, đều là giọng nam. Máy khác nhau thì giọng cũng khác nhau.

### 1a. Làm ngay: chọn giọng nữ trong trình duyệt
Việc nhỏ, làm khoảng 1 giờ.
- Thêm bộ lọc giọng nữ theo tên, lần lượt theo thứ tự ưu tiên:
  1. Giọng Anh-Anh *Natural/Online* của Edge: Sonia, Libby, Maisie.
  2. `Google UK English Female`.
  3. Hazel (Windows).
  4. Giọng Anh-Mỹ nữ: Aria, Jenny, Zira, Samantha.
  5. Nếu không có giọng nào ở trên thì dùng giọng tiếng Anh bất kỳ.
- Đổi tốc độ đọc thường từ 0,95 xuống **0,9** cho dễ nghe. Tốc độ chậm giữ 0,6.
- Hội thoại: người nói thứ nhất và mọi đoạn đọc đơn (từ, câu, bài nghe) dùng giọng nữ. Nếu nhãn là `Man`, `Mr …` hoặc tên nam thì dùng giọng nam để bài nghe IELTS vẫn phân biệt được người nói.
- Hạn chế: kết quả vẫn phụ thuộc máy. Nếu máy không có giọng nữ nào thì vẫn phải dùng giọng khác.

### 1b. Giải pháp lâu dài: file MP3 giọng nữ giống nhau trên mọi máy
Làm theo `EN_AUDIO_PLAN.md` phương án A (Kokoro, chạy trên máy, không tốn tiền), với các thay đổi sau:
- **Giọng chính là giọng nữ** cho từ vựng, câu ví dụ, bài nghe đơn và nghe chép. Hai lựa chọn:
  - Anh-Anh: `bf_emma`.
  - Anh-Mỹ: `af_heart`.
  - File nghe thử có sẵn ở `D:\Lean - Ngoại ngữ\mau-giong-doc\`.
- **Hội thoại:** giọng nữ thứ hai là `bf_isabella`. Người nói nam dùng `bm_george`. Nếu bạn muốn toàn bộ là giọng nữ, có thể đổi cả người nói nam sang giọng nữ, nhưng khi đó bài nghe khó phân biệt người nói hơn.
- Các bước A0 → A4 giữ nguyên như trong `EN_AUDIO_PLAN.md`.
  - Tạo file mất khoảng 3 giờ, chạy nền.
  - Dung lượng thêm khoảng 60–80 MB cho Buổi 1–45. Giai đoạn 3 thêm khoảng 30 MB nữa.
  - Chỉ những câu mới hoặc câu đã sửa mới phải tạo lại.
- Khi thiếu file MP3, app tự quay về giọng nữ của trình duyệt ở bước 1a.

---

## Việc 2. Tự soạn Giai đoạn 3 chi tiết (Buổi 46–65)

**Mục tiêu:** lên band 6.0–6.5. Nội dung từng buổi theo `lo-trinh-ielts-6.5.md` của skill english-tutor. Soạn bằng skill `english-content`, cùng định dạng với Giai đoạn 2.

### Mỗi buổi gồm
| Phần | Nội dung |
|---|---|
| Từ vựng | 18–22 từ/cụm theo chủ đề nâng cao, ưu tiên **collocation học thuật**. Có IPA (Anh + Mỹ), CEFR (B1–C1 tra Oxford 3000/5000), nghĩa Việt, ví dụ. |
| Phát âm | Trọng âm của từ học thuật dài, trọng âm câu, ngữ điệu khi phản biện. |
| Ngữ pháp | 1 điểm/buổi, mã `en-g3-01…`: mệnh đề danh từ, rút gọn mệnh đề (participle), đảo ngữ, câu điều kiện loại 3 và hỗn hợp, từ nối nâng cao, bài tổng hợp sửa lỗi người Việt. |
| Ví dụ | 6–8 câu, chỉ dùng từ và ngữ pháp đã học đến buổi đó. |
| Hội thoại | Có. Buổi Speaking Part 3 dùng hội thoại 3 người. |
| Kỹ năng | Bài hoàn chỉnh theo trọng tâm buổi: Task 1 quy trình, bản đồ, bảng số liệu; Task 2 dạng Two-part, Cause/Effect, Mixed; Speaking Part 1/2/3; Reading Yes/No/Not Given. |
| Bài tập | 5–6 dạng, bắt buộc có nghe hội thoại và nghe Đúng/Sai (như Giai đoạn 2). |
| Bài về nhà | Một đề Task 1 hoặc Task 2 đầy đủ. **Mới:** kèm **bài mẫu band 6.5**, dàn ý, danh sách lỗi cần tự soát và rubric. Việc 3 dùng các phần này để chấm. |

### Bài kiểm tra
Làm giống Giai đoạn 2:
- `gd3-mini-1` sau Buổi 50.
- `gd3-mini-2` sau Buổi 55.
- `gd3-mini-3` sau Buổi 60.
- `gd3-final` sau Buổi 65: bài thi thử Writing Task 1 + Task 2, chấm theo 4 tiêu chí.

### Nguồn tài liệu
- **PREP Trung cấp:** 26 file PDF đã giải nén. Phần chưa dùng ở Giai đoạn 2 có thể dùng cho Giai đoạn 3.
- **PREP Nâng cao: chưa có.** Nếu bạn có khóa này, hãy tải về `tai-lieu-nguon/tieng-anh/`.
- Không có nguồn thì Claude tự biên soạn (`source: editorial`, `ai-draft`). Riêng CEFR phải tra Oxford.

### Chia 4 đợt
Mỗi đợt chạy `en:merge`, `en:validate`, `content:export:en` và test, sau đó bạn duyệt trên máy trước khi sang đợt sau.

| Đợt | Buổi | Trọng tâm |
|---|---|---|
| 1 | 46–50 + gd3-mini-1 | Task 1 quy trình và bản đồ, Task 2 Two-part, Speaking Part 1 lên band 6.5, collocation học thuật |
| 2 | 51–55 + gd3-mini-2 | Từ nối nâng cao, Reading Yes/No/Not Given, Speaking Part 3 phản biện, mệnh đề danh từ, Task 2 Cause/Effect |
| 3 | 56–60 + gd3-mini-3 | Rút gọn mệnh đề, idiom tự nhiên, đảo ngữ, Task 1 bảng số liệu, câu điều kiện loại 3 và hỗn hợp |
| 4 | 61–65 + gd3-final | Speaking Part 2 chủ đề trừu tượng, sửa lỗi người Việt, Task 2 Mixed, ôn collocation, tổng ôn |

Ước tính khoảng **400 từ mới** (tổng số từ lên khoảng 1 300), 20 điểm ngữ pháp và 20 bài mẫu band 6.5.

---

## Việc 3. Tự chấm bài viết theo mẫu (tiếng Anh + tiếng Trung)

"Theo mẫu" nghĩa là kết quả có **đúng khuôn gia sư đang chấm trong chat**:
1. Bảng điểm từng tiêu chí.
2. Bảng lỗi: *Bạn viết → Sửa đúng → Vì sao*.
3. Bản sửa hoàn chỉnh.
4. Điểm yếu nhất và 3 việc cần làm.
5. Lưu lịch sử để xem tiến bộ.

Có 2 tầng. Tầng 1 miễn phí, làm được ngay. Tầng 2 chấm thật bằng AI.

### Tầng 1: chấm tự động bằng quy tắc và bài mẫu (miễn phí, không cần mạng)
Chạy ngay trong trình duyệt khi bạn bấm **"Chấm bài"**.

**Tiếng Anh** (trong `HomeworkBox`):
- Kiểm tra độ dài: số từ đạt yêu cầu chưa, số câu, câu dài nhất.
- Bắt các lỗi riêng của bạn bằng quy tắc:
  - `i` viết thường.
  - Tên riêng hoặc đầu câu không viết hoa.
  - `a/an` + danh từ số nhiều (ví dụ *a students*).
  - `a` + quốc tịch (ví dụ *a Vietnamese*).
  - Số đếm thiếu gạch nối (*twenty five*).
  - Dấu cách trước dấu chấm, câu cuối thiếu dấu chấm.
  - Nối hai câu bằng dấu phẩy (comma splice), đoán theo mẫu *", I/he/she/they + động từ"*.
  - Một danh từ lặp lại từ 3 lần trở lên (gợi ý dùng He/She/It).
  - Chính tả: từ không có trong từ điển của app và danh sách từ phổ biến sẽ được gạch dưới, kèm gợi ý từ gần giống.
- Đếm độ đa dạng câu: số câu ghép và câu phức (*because, although, which, if…*), số từ nối, số từ và collocation của buổi đã dùng.
- Hiện **bài mẫu của buổi** cạnh bài của bạn, kèm **rubric 4 tiêu chí** để bạn tự tích. App gợi ý mức cho từng tiêu chí dựa trên các con số ở trên.
- Tầng 1 **không đưa band IELTS chính thức**. Chấm bằng quy tắc không đủ tin cậy để cho band, nên app chỉ ghi "mức tham khảo".

**Tiếng Trung** (bước "Viết đoạn văn", `ParagraphPractice`):
- Đã có sẵn: số chữ, từ của bài đã dùng, chữ chưa học.
- Thêm các quy tắc bắt lỗi HSK1–3 hay gặp:
  - Dùng `吗` cùng với từ để hỏi (`什么/谁/哪`) trong một câu.
  - Tính từ làm vị ngữ thiếu `很`, hoặc dùng sai `是` + tính từ (*我是高*).
  - Đặt `在 + nơi chốn` hoặc thời gian sau động từ (thói quen dịch từ tiếng Việt).
  - Dùng lẫn `不` và `没`.
  - Thiếu hoặc sai dấu câu `。，？`.
- Thêm **đoạn văn mẫu cho mỗi bài** (bài 1–14 HSK1) và rubric 4 tiêu chí:
  1. Hoàn thành yêu cầu.
  2. Từ vựng và chữ Hán.
  3. Ngữ pháp.
  4. Mạch lạc.
  - Mỗi tiêu chí chấm theo thang 10.

Cả hai thứ tiếng đều lưu lịch sử bài đã chấm trong tiến độ học. Tiến độ đồng bộ Supabase dạng JSON nên không cần đổi bảng.

### Tầng 2: chấm bằng AI, giống gia sư
Làm theo `EN_WRITING_GRADER_PLAN.md` (Supabase Edge Function giữ khóa Claude API, trình duyệt không bao giờ thấy khóa), mở rộng như sau:
- Thêm tham số `lang: "en" | "zh"`.
  - Tiếng Trung dùng rubric HSK (4 tiêu chí ở trên, thang 10, quy ra mức HSK tương ứng).
  - Tiếng Anh dùng 4 tiêu chí IELTS.
- AI nhận thêm **bài mẫu và rubric của buổi**, **danh sách lỗi riêng của bạn** và **kết quả tầng 1**, để lần chấm sau có thể nhắc: "lỗi *a students* lặp lại lần 2".
- Chọn mô hình và kiểm tra lại giá khi bắt đầu làm. Có giới hạn số bài mỗi ngày.
- **Điều kiện bắt buộc:**
  - Tắt đăng ký tự do trên Supabase (hiện vẫn đang bật).
  - Bạn tạo khóa Claude API và tự đặt khóa vào Supabase secret. Không gửi khóa qua chat.

### Các bước
**Trạng thái (2026-09-30):** F1 + F2 xong — logic `src/domain/word-game.ts` (test `tests/word-game.test.ts`), giao diện `src/features/wordgame/WordGame.tsx`, tab "Học thuộc (game)" ở `/en/flashcards` và `/zh/flashcards` (`?mode=game`), kiểm tra trình duyệt `scripts/check-word-game.ts`. Tiếng Trung đã có game nghĩa tiếng Anh → chữ (CC-CEDICT). Khác kế hoạch: từ trả lời đúng xuống cuối hàng; từ sai quá 3 lần trong một lượt cũng xuống cuối hàng để không chặn các từ khác. **2026-10-05: F3 + F4 xong** — `definition_en` cho đủ 1.244 từ tiếng Anh (`scripts/en-apply-definitions.mjs`); game trong bước Luyện tập tiếng Trung (`/zh/lesson/<slug>/practice/game/`) và cuối bước Từ vựng tiếng Anh (`EnLessonGame`).

| Bước | Việc |
|---|---|
| C1 | Viết bài mẫu và rubric cho bài về nhà Buổi 1–45 và Giai đoạn 3 (làm cùng Việc 2), cùng đoạn mẫu HSK1 bài 1–14 |
| C2 | Làm tầng 1 cho tiếng Anh và tiếng Trung. Test bằng 2 bài bạn đã được chấm (Buổi 0, Buổi 1): quy tắc phải bắt được *a students*, *a Vietnamese*, *form*, *twenty five* |
| C3 | Làm tầng 2 khi đủ điều kiện. Thử trên 10–15 bài mẫu, lệch không quá 0,5 band so với gia sư chấm |

---

## Việc 4. Game học thuộc từ vựng trong Flashcard

Áp dụng cho `/en/flashcards` và `/zh/flashcards`. Thẻ lật hiện tại vẫn giữ. Thêm chế độ **"Học thuộc"** gồm các game sau.

### 4 game
| Game | Cách chơi | Tiếng Anh | Tiếng Trung |
|---|---|---|---|
| **Nối từ** | 5–6 cặp, nối từ với nghĩa Việt; nối sai thì cặp đó nháy đỏ | từ ↔ nghĩa Việt | chữ Hán ↔ nghĩa Việt (hoặc pinyin) |
| **Chọn từ** | Xem nghĩa Việt, chọn 1 trong 4 từ. Chiều ngược lại: xem từ, chọn 1 trong 4 nghĩa. Đáp án nhiễu lấy từ cùng buổi hoặc cùng loại từ để khó hơn | có | có |
| **Nghe từ** | Nghe, chọn từ đúng (mức 1). Nghe rồi **gõ lại từ** để luyện chính tả (mức 2) | gõ từ tiếng Anh | chọn chữ Hán / gõ pinyin |
| **Nghĩa tiếng Anh → chọn từ** | Đọc định nghĩa tiếng Anh đơn giản, chọn 1 trong 4 từ | **cần dữ liệu mới** (bên dưới) | đã có sẵn `meaningsEn` (CC-CEDICT) |

**Dữ liệu cần thêm cho tiếng Anh:**
- Trường `definition_en` cho khoảng 906 từ (khoảng 1 300 sau Giai đoạn 3).
- Định nghĩa **tự viết**, ngắn gọn theo kiểu từ điển cho người học, chỉ dùng từ dễ. Không chép định nghĩa của Oxford hay Cambridge vì vướng bản quyền. Dữ liệu đánh dấu `ai-draft`.
- Viết bằng skill `english-content`, chia theo buổi.

### Cách học thuộc bằng lặp lại
**1. Mỗi từ có 3 bậc, phải qua lần lượt từng bậc:**

| Bậc | Nhận ra | Nghe ra | Nhớ lại |
|---|---|---|---|
| Game | Nối từ, Chọn từ | Nghe chọn | Nghĩa tiếng Anh → từ, Nghe gõ lại |

**2. PASS một từ:**
- Điều kiện: làm đúng cả 3 bậc, và mỗi bậc đúng liền 2 lần. Có thể làm trong một lượt hoặc nhiều lượt.
- Khi PASS:
  - Từ được đánh dấu **"Đã thuộc"** kèm ngày PASS.
  - Từ được đẩy thẳng lên **hộp Leitner 3**, tức 3 ngày sau mới ôn lại.
  - Từ không hiện trong lượt lật thẻ hằng ngày cho tới hạn ôn. Đây là phần **"lưu lại nếu pass qua flashcard"** bạn yêu cầu.

**3. Lặp lại trong một lượt:**
- Từ làm sai quay lại sau **3–4 câu** (không phải đợi tới cuối lượt).
- Từ phải đúng 2 lần liền mới được đi tiếp.
- Từ sai từ 3 lần trở lên được thêm vào mục **"Từ khó"**.

**4. Lặp lại qua nhiều ngày (ôn ngắt quãng):**
- Dùng lại các hộp Leitner đang có: hộp 1 ôn ngay trong ngày, hộp 2 sau 1 ngày, hộp 3 sau 3 ngày, hộp 4 sau 7 ngày, hộp 5 sau 16 ngày.
- Khi từ đến hạn ôn, app ra **1 game ngẫu nhiên ở bậc "Nhớ lại"** thay cho lật thẻ. Đúng thì từ lên hộp, sai thì về hộp 1 và mất trạng thái "Đã thuộc".

**5. Lượt học mỗi ngày (khoảng 15 phút):**
- Màn hình đầu hiện: *"Hôm nay: ôn X từ đến hạn + học 10 từ mới"*.
- Bấm một nút là app tự trộn game theo bậc của từng từ.
- Có đếm chuỗi ngày học liên tục, thanh **Đã thuộc / Đang học / Từ khó** cho mỗi buổi, và nút học lại riêng mục Từ khó.

**6. Lưu tiến độ:**
- Thêm trường `mastery` vào tiến độ (`cards` đã có sẵn), ghi các bậc đã qua, số lần đúng liền và ngày PASS.
- Tiến độ lưu trên trình duyệt và đồng bộ Supabase khi đăng nhập. Không cần SQL mới.

### Các bước
| Bước | Việc |
|---|---|
| F1 | Viết phần logic chung cho cả hai thứ tiếng (ra câu hỏi, chọn đáp án nhiễu, bậc, PASS, xếp hàng từ sai) và test bằng vitest |
| F2 | Làm giao diện 3 game Nối từ, Chọn từ, Nghe từ cho tiếng Anh và tiếng Trung, cùng màn hình "Lượt học hôm nay" |
| F3 | Viết `definition_en` cho Buổi 1–45, rồi thêm game "Nghĩa tiếng Anh" (tiếng Trung làm được ngay từ F2) |
| F4 | Thêm game vào bước "Luyện tập" của từng buổi học. Test, smoke, build |

---

## Thứ tự đề xuất

| # | Việc | Lý do | Cần bạn |
|---|---|---|---|
| 1 | Bước 0 (commit Giai đoạn 2) + 1a (giọng nữ trình duyệt) | Nhanh, có tác dụng ngay | Chọn Anh-Anh hay Anh-Mỹ |
| 2 | Việc 4 (F1 → F2) | Dùng hằng ngày, không phụ thuộc việc khác | — |
| 3 | Việc 2 đợt 1 + C1 (bài mẫu) | Bài mẫu dùng chung cho Việc 3 | Duyệt đợt 1 |
| 4 | Việc 3 tầng 1 (C2) | Miễn phí | — |
| 5 | Việc 1b (MP3 giọng nữ) chạy nền, Việc 2 đợt 2–4, F3 | Nhiều thời gian máy và thời gian soạn | Nghe duyệt 2 buổi mẫu |
| 6 | Việc 3 tầng 2 (AI) | Phụ thuộc điều kiện bên ngoài | Tắt đăng ký Supabase, tạo khóa API |
| 7 | Commit + deploy | Chỉ làm khi bạn đồng ý | Đồng ý deploy |
