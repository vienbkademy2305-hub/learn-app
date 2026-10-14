# HSK2 (2026-10-14)

Yêu cầu: "tiếp các tài liệu tiếng Trung đã gửi, đọc và viết tài liệu cho HSK2". Nguồn dùng lại (cùng nguồn HSK1, `sources/manifest.json`):
hsk-sentences-audio (538 câu HSK2 có audio thường/chậm), complete-hsk-vocabulary (750 từ HSK2), xue-hanzi (CVDICT nghĩa Việt, Hán Việt).

## Đã làm
| Phần | File | Trạng thái |
|---|---|---|
| Nhập dữ liệu HSK1+HSK2 một lần | `pnpm import:hsk2` (`importers/run.ts --level 2` nạp mọi cấp ≤ 2; chỉ sinh bản nháp bài của cấp 2) | xong |
| Snapshot nhiều cấp | `pnpm content:export` → `.data/content/zh.json` (`levels`, bài đánh số lại theo từng cấp) | xong |
| 23 bài HSK2 | `data/editorial/lessons/hsk2/` — 18 chủ đề sinh tự động; 4 bài dài (>60 từ) chia phần (status `split`, không bị generator ghi đè) | bản nháp |
| Dịch câu | `data/editorial/sentences-vi/hsk2.yaml` — 538 câu, Claude dịch | bản nháp, chờ duyệt |
| Ngữ pháp | `data/editorial/grammar-vi/hsk2.yaml` — 60 điểm g2-01…g2-60, tự viết (không chép krmanik), có lỗi hay gặp | bản nháp, chờ duyệt |
| Hội thoại đóng vai | `data/editorial/dialogues/hsk2.yaml` — 23 bài × 6–7 câu | bản nháp, chờ duyệt |
| UI | `/zh/hsk/2`, mục HSK2 ở `/zh`, menu "HSK2", nhãn "HSK2 · Bài N" (`src/content/lesson-label.ts`) | xong |

Game học từ dùng số thứ tự bài trên toàn bộ các cấp (`lessonOrdinal`) vì số bài HSK1 và HSK2 trùng nhau.

## Còn lại
- 7 từ HSK2 không có nghĩa Việt trong CVDICT (不太, 不一会儿, 见过, 送到, 笑话儿, 有空儿, 这时候) — UI chỉ hiện nghĩa tiếng Anh.
- Người duyệt: đổi `status: reviewed` cho câu/điểm ngữ pháp đã duyệt.
- HSK3: chạy `importers/run.ts --level 3`, thêm `sentences-vi/hsk3.yaml`, `grammar-vi/hsk3.yaml`, `dialogues/hsk3.yaml`.
