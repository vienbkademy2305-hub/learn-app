# HSK3 theo đề thi 2026 (2026-10-14)

Người dùng: "biên soạn HSK3 … phải dựa vào các đề thi thực tế có sẵn". Mục tiêu HSK3 trong 4–6 tháng ⇒ thi năm 2027 ⇒ đề HSK mới.

## Căn cứ
- **Kỳ thi HSK 3.0 bắt đầu 13/12/2026**, từ 2027 thay HSK 2.0 (nhiều nguồn; xác nhận lại ở chinesetest.cn trước khi đăng ký).
- **Đề cương HSK (CLEC, phát hành 2025-11, áp dụng 2026-07)** — `https://hsk.cn-bj.ufileos.com/3.0/新版HSK考试大纲1219.pdf` (406 tr.):
  từ vựng cấp 1/2/3 = 300/200/500 (lũy kế 1000), ngữ pháp cấp 3 (tr. 389–391 của sách), chủ đề, nhiệm vụ.
  Khác hẳn chuẩn 2021 (GF0025-2021, 500/772/973) mà HSK1–2 của app đang dùng.
- **Đề mẫu HSK mới cấp 3** (`HSK1-6级考试结构与样题.pdf`, 2025-12): 70 câu ≈ 83 phút —
  Nghe 30 (P1 hội thoại→chọn tranh 10; P2 hội thoại ngắn/dài + câu hỏi 3 lựa chọn 10; P3 đoạn độc thoại + câu hỏi 10),
  Đọc 30 (P1 ghép câu A–F 10; P2 chọn từ điền chỗ trống 10; P3 đoạn văn + câu hỏi 10),
  Viết 10 (P1 viết chữ Hán theo pinyin 5; P2 nhìn tranh + từ cho sẵn đặt câu 5). Nói (HSKK) bắt buộc từ cấp 3.
- Danh sách từ dạng dữ liệu: complete-hsk-vocabulary `wordlists/exclusive/newest/1-3.json` (MIT, cùng commit đã ghim),
  lưu thành chuẩn `hsk-2026` trong `hsk_assignments` → `WordData.examLevel` → nhãn "⭐ Đề thi HSKn".

## Đã làm
| Phần | File | Trạng thái |
|---|---|---|
| 9 bài từ mới, 214 từ = từ đề thi cấp 1–3 mà HSK1–2 chưa dạy (lọc theo pinyin đề cương) | `data/editorial/lessons/hsk3/hsk3-0N-*.yaml` (status `exam`) | bản nháp |
| 10 bài ôn, 324 từ = từ cấp 3 của đề thi đã dạy ở HSK1–2 (người dùng: "cả cấp 3") → HSK3 phủ đủ 487/487 từ cấp 3 | `hsk3-0Nr-*.yaml`, `hsk3-09s-*.yaml`; không có ngữ pháp mới (`isReviewLesson`) | bản nháp |
| 329 câu ví dụ có audio (≤ HSK3 trước, rồi HSK4–6 ngắn nhất) | importer nhập mọi câu được bài học tham chiếu | xong |
| Dịch 294 câu | `sentences-vi/hsk3.yaml` | bản nháp |
| 28 điểm ngữ pháp cấp 3 (把, 被, bổ ngữ khả năng, 除了, 只有…才…) | `grammar-vi/hsk3.yaml` | bản nháp |
| 47 câu tự soạn (không audio → giọng máy) | `sentences-extra/hsk3.yaml` | bản nháp |
| Hội thoại đóng vai 9 bài | `dialogues/hsk3.yaml` | bản nháp |

Lệnh: `pnpm import:hsk3` (= `run.ts --level 3 --no-drafts`) → `pnpm content:export` (mặc định cấp 3).

## Còn lại
- **Luyện đề**: người dùng sẽ gửi đề thi thật (để vào `D:\Lean - Ngoại ngữ\tai-lieu-nguon\tieng-trung\`). Đề có bản quyền:
  dùng làm khuôn dạng/độ khó, soạn câu hỏi mới, không chép nguyên văn lên web công khai.
- Phần Nói (HSKK cấp 3) chưa có.
- HSK1–2 vẫn theo chuẩn 2021 (rộng hơn đề thi); nhãn ⭐ cho biết từ nào có trong đề.
