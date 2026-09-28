# SPEAKING — AUDIT & ARCHITECTURE (Phase 4A của người dùng)

- **Ngày:** 2026-09-28. **Trạng thái:** chỉ audit + đề xuất. **Chưa implement speaking.**
- **Phạm vi kiểm tra:** toàn bộ `src/`, `scripts/`, `importers/`, `package.json`, và 3 repo nguồn (`xue-hanzi`, `hsk-sentences-audio`, `hsk1-chinese-learning`) tại commit đã pin trong `sources/manifest.json`.
- **Nhãn** (CLAUDE.md §11): **[CODE]** = đã thấy trong source; **[DOC]** = tài liệu chính thức bên ngoài (có link); **UNKNOWN** = chưa kiểm chứng; **UNRESOLVED** = cần quyết định/thử nghiệm.

> **Nguyên tắc xuyên suốt:** *nhận dạng giọng nói (speech-to-text) ≠ chấm phát âm.* Speech-to-text chỉ trả về **chữ** mà máy đoán được. Máy có thể đoán đúng chữ dù người nói sai thanh điệu (nhờ ngữ cảnh), hoặc đoán sai chữ dù người nói phát âm đúng. Không được dùng kết quả nhận dạng như một "điểm phát âm".

---

## 1. Năng lực hiện có (audit source thực tế)

Cách kiểm: tìm `MediaRecorder|getUserMedia|mediaDevices|SpeechRecognition|webkitSpeechRecognition|speechSynthesis|AudioContext|AnalyserNode|AudioWorklet|decodeAudioData|pitch|phoneme|pronunciation|score` trong code app và 3 repo nguồn.

| Năng lực | Có? | Bằng chứng / ghi chú |
|---|---|---|
| **Microphone recording** | ❌ Không | Không có `getUserMedia`, `mediaDevices`, `MediaRecorder` ở bất kỳ file nào [CODE]. |
| **Browser speech recognition** | ❌ Không | Không có `SpeechRecognition` / `webkitSpeechRecognition` [CODE]. |
| **Speech-to-text** | ❌ Không | Không có thư viện/API STT trong `package.json` (dependencies: pglite, drizzle-orm, hanzi-writer, next, react, yaml) [CODE]. |
| **Pronunciation scoring** | ❌ Không | Các chỗ khớp chữ "score" đều là **điểm bài tập trắc nghiệm** (`ExerciseRunner.tsx`, `progress.ts` `recordExercise`), không liên quan âm thanh [CODE]. |
| **Phoneme comparison** | ❌ Không | Không có mã phân tích âm vị. |
| **Pinyin pronunciation comparison** | ⚠️ Chỉ **pinyin gõ bằng tay** | `checkPinyin()` (`src/domain/exercises.ts:203`) so **chuỗi pinyin người học gõ** với đáp án → `correct / tone / wrong`. Không nhận âm thanh. Có thể tái dùng để so pinyin *suy ra* từ kết quả nhận dạng (§3), nhưng vẫn không phải chấm phát âm. |
| **Audio playback** | ✅ Có | `AudioButtons` / `PlayAll` phát MP3 thường/chậm, có `playbackRate` (`src/features/audio/AudioButtons.tsx:41-43`, `PlayAll.tsx:60-61`) [CODE]. |
| **Audio recording playback (nghe lại giọng mình)** | ❌ Không | Không có ghi âm nên không có phát lại bản ghi. |
| **Text-to-speech (giọng máy đọc)** | ✅ Có | `speechSynthesis` + chọn giọng zh-CN (`src/features/audio/speech.ts:12-56`); dùng cho từ/chữ và Bài 0 [CODE]. **Không lấy được tín hiệu âm thanh** của giọng máy để phân tích (Web Speech API không đưa output vào Web Audio) → không dùng làm mẫu so sánh cao độ được. |
| **Nội dung phát âm (Bài 0)** | ✅ Có | Sơ đồ thanh điệu, bảng thanh mẫu/vận mẫu, quiz *nghe* chọn thanh/âm (`src/domain/pronunciation.ts`, `src/features/pronunciation/*`) — đều là **nghe**, không có **nói** [CODE]. |
| **Audio mẫu để so sánh** | ⚠️ Một phần | 562 MP3 câu HSK1 (thường + chậm) của hsk-sentences-audio, **giọng tổng hợp CosyVoice2**, có thời lượng đo được (`audio_assets.duration_ms`). **Không có audio mẫu cho từ/chữ/âm tiết** (REPO_AUDIT §9). |
| **3 repo nguồn** | ❌ | xue-hanzi và hsk-sentences-audio: không có API giọng nói. hsk1-chinese-learning: chỉ `speechSynthesis` (`js/app.js`), chế độ "Luyện phát âm" = nghe rồi tự đọc, **không ghi âm, không chấm** [CODE]. |

**Kết luận audit:** app hiện **chưa có bất kỳ thành phần speaking nào**, kể cả ghi âm. Chưa có pronunciation scoring engine.

---

## 2. Ràng buộc từ kiến trúc hiện tại

| Ràng buộc | Hệ quả cho speaking |
|---|---|
| **Site tĩnh** trên GitHub Pages (`output: "export"`), không có backend | Không giữ được API key bí mật → mọi dịch vụ cloud trả phí cần thêm **một backend nhỏ** (token ngắn hạn). |
| **HTTPS** (github.io) | `getUserMedia` yêu cầu secure context → dùng được micro trên site thật và `localhost`. |
| **Chỉ TypeScript** (CLAUDE.md §12) | Loại các giải pháp phải chạy Python/Kaldi phía server. |
| **Tiến độ lưu localStorage**, chưa có tài khoản | Bản ghi âm không nên lưu lâu dài (dung lượng, riêng tư); chỉ lưu **kết quả** (điểm/nhãn) vào `ProgressState`. |
| **Audio mẫu là giọng tổng hợp**, chỉ có cho câu | So sánh cao độ với mẫu chỉ làm được ở **cấp câu**; với từ/chữ phải dùng **khuôn thanh điệu lý thuyết** (55/35/214/51). |
| **Vietnamese-first** | Phản hồi phải giải thích bằng tiếng Việt, cụ thể (VD "thanh 3 chưa xuống đủ thấp"), không chỉ một con số. |

---

## 3. Các phương án kỹ thuật

| # | Phương án | Đo được gì | Không đo được gì | Dependency / API / model | Chi phí | Rủi ro |
|---|---|---|---|---|---|---|
| **A** | **Ghi âm + nghe lại + so với audio mẫu** (shadowing) | Không chấm; người học tự so | Mọi thứ tự động | Web API sẵn có: `getUserMedia`, `MediaRecorder`, `<audio>` | 0 | Thấp. Safari/iOS ghi ra định dạng khác (mp4/aac vs webm/opus) — dùng blob URL nên không ảnh hưởng phát lại. |
| **B** | **Web Speech API `SpeechRecognition`** (zh-CN) | **Chữ** máy nghe được → so với câu mẫu (đúng/thiếu/sai chữ), có thể đổi ra pinyin rồi dùng `checkPinyin()` | **Thanh điệu, âm vị** — không phải chấm phát âm | Web API; không thêm package | 0 | **Limited availability, không Baseline** [DOC MDN]. Trên Chrome **audio được gửi lên server** để nhận dạng, không chạy offline [DOC MDN]; có tùy chọn on-device (`processLocally`, `available()`, `install()`) [DOC MDN] — mức hỗ trợ zh-CN on-device: **UNKNOWN**. Kết quả phụ thuộc trình duyệt. |
| **C** | **Phân tích cao độ trên máy** (Web Audio: `decodeAudioData` + thuật toán tìm F0 như autocorrelation/YIN, chạy trong Web Worker) | **Đường thanh điệu** (contour) của người học: so với khuôn 4 thanh cho từ/âm tiết; so với contour audio mẫu (DTW) cho câu | Âm vị (b/p, zh/j…), độ rõ phụ âm/nguyên âm | Có thể tự viết (TypeScript thuần) hoặc thư viện pitch detection nhỏ — tên/license cụ thể: **UNKNOWN**, cần chọn và kiểm license trước | 0 | Tách âm tiết trong câu nhiều chữ khó; giọng nam/nữ khác cao độ → phải chuẩn hóa (bán cung theo trung bình người nói); tiếng ồn; biến điệu (3-3, 不, 一) phải áp dụng trước khi so. Độ chính xác: **UNRESOLVED**, cần thử nghiệm. |
| **D** | **Mô hình nhận dạng chạy trong trình duyệt** (VD Whisper/Paraformer qua ONNX/WebAssembly) | Chữ (như B) nhưng **không gửi audio ra ngoài**, chạy offline | Thanh điệu/âm vị (vẫn là STT) | Runtime ONNX/WASM + model tải về; tên gói và kích thước model cụ thể: **UNKNOWN** (thường hàng chục–hàng trăm MB) | 0 tiền; tốn băng thông/CPU người dùng | Tải nặng trên điện thoại, chậm; chất lượng tiếng Trung của model nhỏ **UNKNOWN**. |
| **E** | **API chấm phát âm trên cloud** — VD **Azure AI Speech Pronunciation Assessment** | Điểm **Accuracy / Fluency / Completeness** và `PronScore`; cấp **âm vị/từ/toàn câu**; lỗi Omission/Insertion/Mispronunciation [DOC Azure]. zh-CN hỗ trợ tên âm vị theo SAPI [DOC Azure] | **Prosody (ngữ điệu) chỉ có cho en-US** [DOC Azure]; điểm theo **âm tiết chỉ en-US** [DOC Azure] → với tiếng Trung không có điểm âm tiết riêng. Có đánh giá riêng **thanh điệu** hay không: **UNKNOWN** (tài liệu không nói rõ) | Azure Speech SDK (JavaScript có hỗ trợ) + **backend cấp token ngắn hạn** (VD serverless function) để không lộ key | **UNKNOWN** — trang giá không truy cập được lúc audit; tài liệu nói giá khác nhau giữa scripted/unscripted [DOC Azure]. Cần kiểm lại trước khi quyết. | Phải có tài khoản cloud + backend (lệch khỏi "site tĩnh"); **giọng người học gửi lên cloud** (riêng tư, cần đồng ý); phụ thuộc nhà cung cấp; chi phí theo lượt dùng. Nhà cung cấp khác (Tencent SOE, iFlytek…): khả năng/giá/điều khoản **UNKNOWN**. |
| **F** | **Tự dựng mô hình chấm (GOP, wav2vec2…)** | Âm vị + thanh điệu, tùy biến | — | Python/Kaldi/PyTorch + server GPU | Cao (hạ tầng + dữ liệu huấn luyện) | Trái quy tắc chỉ-TypeScript; cần dữ liệu người học có nhãn — **không phù hợp** giai đoạn này. |

---

## 4. Kiến trúc đề xuất

### 4.1 Tầng và module
```
src/domain/speaking/          TS thuần, test được bằng dữ liệu tổng hợp (sóng sin quét tần số)
  pitch.ts                    tìm F0 theo khung (YIN/autocorrelation), bỏ khung vô thanh
  contour.ts                  chuẩn hóa bán cung theo người nói, làm mượt, cắt theo năng lượng
  tones.ts                    khuôn thanh 1–4 + thanh nhẹ, áp biến điệu 3-3/不/一, phân loại contour → thanh
  compare.ts                  DTW contour học viên ↔ contour audio mẫu (cấp câu)
  assessment.ts               kiểu kết quả chung + diễn giải tiếng Việt
src/features/speaking/
  Recorder.tsx                xin quyền micro, ghi (MediaRecorder), dừng, nghe lại; KHÔNG upload
  ShadowingPanel.tsx          nghe mẫu → ghi → nghe lại xen kẽ (phương án A)
  ToneFeedback.tsx            vẽ contour học viên chồng lên khuôn/mẫu (phương án C)
  engines/                    các "PronunciationEngine" cắm được (xem 4.2)
  speaking.worker.ts          phân tích âm thanh ngoài luồng UI
```

### 4.2 Interface engine (để thêm/bớt phương án mà không đổi UI)
```ts
interface PronunciationEngine {
  id: "none" | "tone-contour" | "browser-stt" | "cloud-assessment";
  /** What this engine actually measures — shown to the learner, never overstated. */
  measures: Array<"playback" | "tone" | "text" | "phoneme" | "fluency">;
  available(): Promise<boolean>;
  assess(recording: Blob, target: { hanzi: string; pinyinKeys: string[]; referenceAudio?: string }): Promise<Assessment>;
}
```
- UI luôn hiển thị engine đang dùng đo **cái gì**. VD engine `browser-stt` ghi rõ "Máy nghe được chữ… — đây **không** phải điểm phát âm".

### 4.3 Dữ liệu
- **Không đổi canonical data model.**
  - Mục tiêu nói lấy từ dữ liệu có sẵn: `words` (pinyin key), `sentences` (tokens + pinyin), `audio_assets` (mẫu + `duration_ms`).
- **Bản ghi âm:** chỉ giữ trong bộ nhớ trình duyệt trong phiên (blob URL). Không lưu localStorage, không upload (trừ engine E khi người dùng bật và đồng ý).
- **Tiến độ:** thêm `ProgressState.speaking[<target key>] = { attempts, lastAt, lastResult }` (localStorage, như listening).

### 4.4 Quyền riêng tư & đồng ý
- Xin quyền micro **khi người học bấm "Ghi âm"**, không xin khi mở trang.
- Engine B (Chrome gửi audio lên server Google) và engine E (gửi lên cloud) phải **tắt mặc định**, bật bằng lựa chọn rõ ràng kèm giải thích.

---

## 5. Đánh giá độ phù hợp với kiến trúc hiện tại

| Phương án | Phù hợp site tĩnh + TS + localStorage? | Giá trị học tập | Đề xuất |
|---|---|---|---|
| A. Ghi âm + nghe lại | ✅ Hoàn toàn | Trung bình (shadowing có hiệu quả, nhưng tự đánh giá) | **Làm trước — Phase 4B** |
| C. Contour thanh điệu trên máy | ✅ Hoàn toàn | **Cao cho người Việt** (lỗi thanh điệu là lỗi phổ biến) | **Làm trong 4B cho từ/âm tiết đơn**, câu (DTW) làm thử nghiệm |
| B. Web Speech STT | ⚠️ Chạy được nhưng không ổn định giữa trình duyệt, gửi audio ra ngoài | Thấp–trung bình (chỉ kiểm "máy có hiểu chữ không") | Tùy chọn, **tắt mặc định**, ghi rõ không phải chấm điểm |
| D. STT trong trình duyệt | ⚠️ Nặng cho điện thoại | Như B | Để sau, khi có số liệu thử nghiệm |
| E. Cloud assessment | ❌ Cần backend + tài khoản + chi phí | Cao nhất cho âm vị (nhưng **không có prosody/âm tiết cho zh-CN**) | Chỉ khi người dùng chấp nhận chi phí + backend — **Phase 4C tùy chọn** |
| F. Tự dựng model | ❌ | — | Không làm |

**Đề xuất lộ trình:**
- **4B:** A (ghi âm, nghe lại, xen kẽ với mẫu) + C cho **từ 1–2 âm tiết và bài luyện thanh Bài 0**; phản hồi bằng hình contour + câu giải thích tiếng Việt, gắn nhãn "ước lượng thanh điệu".
- **4C (tùy chọn):** cloud assessment qua backend cấp token, chỉ khi người dùng quyết định về chi phí và riêng tư.

---

## 6. Dependency / API / model cần thêm (theo phương án)

| Phương án | Thêm vào project |
|---|---|
| A | Không có package mới (Web API có sẵn). |
| C | Không bắt buộc: tự viết pitch tracker TS. Nếu dùng thư viện: **UNKNOWN** — phải kiểm license trước khi thêm. |
| B | Không có package mới; cần phát hiện tính năng + phương án dự phòng. |
| D | Runtime WASM/ONNX + file model tự host — **UNKNOWN** (tên, kích thước, license). |
| E | Azure Speech SDK cho JavaScript + tài khoản Azure + **backend** (serverless) giữ key và phát token; biến môi trường server-side. |

---

## 7. Chi phí & rủi ro tổng hợp
- **Chi phí tiền:** A, B, C, D = 0. E = theo lượt dùng, **UNKNOWN** (cần kiểm trang giá chính thức; lúc audit không truy cập được).
- **Rủi ro kỹ thuật:**
  - C: độ chính xác tách âm tiết/thanh trên câu dài (**UNRESOLVED**);
  - B: khác biệt trình duyệt;
  - D: hiệu năng điện thoại.
- **Rủi ro sư phạm:** chấm sai làm người học mất tin tưởng. Vì vậy phải ghi rõ đo cái gì, cho **nghe lại** giọng mình cạnh mẫu, và không chấm "đậu/trượt" gắt ở giai đoạn đầu.
- **Rủi ro pháp lý/riêng tư:** giọng nói là dữ liệu cá nhân. B/E gửi audio ra ngoài cần đồng ý rõ ràng; không lưu bản ghi.
- **Audio mẫu là giọng tổng hợp:** contour mẫu có thể khác giọng người thật. Ưu tiên khuôn thanh điệu lý thuyết cho từ; với câu thì chỉ so hình dạng tương đối.

---

## 8. Nguồn tham khảo bên ngoài (đọc ngày 2026-09-28)
- MDN — SpeechRecognition (limited availability; Chrome gửi audio lên server; `processLocally`, `available()`, `install()`): https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Microsoft Learn — Use pronunciation assessment (scripted/unscripted, các điểm, granularity, prosody chỉ en-US, điểm âm tiết chỉ en-US): https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
- Microsoft Learn — Language support (pronunciation assessment; zh-CN dùng tên âm vị SAPI): https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment
- Trang giá Azure Speech: **không truy cập được lúc audit** → chi phí E = UNKNOWN.
