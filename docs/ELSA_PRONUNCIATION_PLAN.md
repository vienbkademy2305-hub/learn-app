# Kế hoạch: chấm nói kiểu ELSA (chỉ ra từ/âm đọc sai + % phát âm)

Mục tiêu: người học đọc một câu, app trả về **% phát âm tổng**, **% từng từ**, chỉ ra **từ nào sai, âm nào sai** (IPA cần đọc vs IPA nghe thấy), cho nghe mẫu và nghe lại giọng mình, rồi luyện lại riêng những từ sai — giống ELSA Speak.

## 1. App đã có gì (OpenPronounce, docs/OPENPRONOUNCE_PLAN.md)
Máy chấm trả về cho mỗi lần đọc: `score` 0–100, danh sách từ sai (`position`, `word`, IPA cần đọc `expected`, IPA nghe thấy `actual`, `confidence`) và **từng âm** của từ đó (`phones[]`: `expected`, `heard`, `confidence`). Giao diện hiện tại ([PronounceCheck.tsx](../src/features/en/PronounceCheck.tsx)) mới chỉ hiện điểm, tô đỏ từ sai và liệt kê IPA. → **Dữ liệu đủ để làm giao diện kiểu ELSA; phần lớn việc là thiết kế lại cách hiển thị và thêm luyện tập.**

## 2. Khoảng cách so với ELSA
| ELSA có | Hiện tại | Cách bù |
|---|---|---|
| % tổng và nhãn (Xuất sắc/Tốt/Cần luyện) | chỉ số điểm | vòng tròn % + nhãn màu |
| % từng từ, tô màu xanh/vàng/đỏ | chỉ tô đỏ từ sai | suy ra % từng từ từ độ tin cậy các âm của từ |
| Chạm vào từ → xem từng âm đúng/sai | chỉ liệt kê IPA | bảng sheet theo từ: các âm cần đọc, âm nghe thấy, thanh % mỗi âm |
| Mẹo sửa âm | không | bảng mẹo tiếng Việt cho các âm người Việt hay sai |
| Nghe mẫu + nghe lại bản ghi của mình | có nghe mẫu, chưa so sánh | thêm nút so sánh hai bản |
| Trọng âm, ngữ điệu | không | OpenPronounce không đo; làm riêng bằng Azure (xem §3 phương án B) |
| Luyện lại riêng từ sai, tiến bộ theo âm | không | chế độ "Luyện các từ sai" + thống kê âm yếu |
| Dùng được trên điện thoại | **không** (cần máy chấm trên máy tính) | phương án B hoặc C bên dưới |

## 3. Chọn nguồn chấm (cần bạn quyết)
- **A. Giữ OpenPronounce chạy trên máy tính của bạn.** Miễn phí, riêng tư, có từng âm. Hạn chế: chỉ dùng được khi máy tính bật và trên máy tính; điện thoại không chấm được âm (chỉ nhận dạng giọng nói của trình duyệt xem đã nói đúng từ chưa).
- **B. Azure Speech – Pronunciation Assessment** qua một Supabase Edge Function (khóa Azure giấu trong secret, như phần chấm viết). Có điểm tổng, điểm từng từ, từng âm, **độ trôi chảy, trọng âm/ngữ điệu (prosody)**, chạy được trên điện thoại. Có hạn mức miễn phí (khoảng 5 giờ âm thanh/tháng), cần bạn tạo tài khoản Azure và cung cấp khóa. Bản ghi âm sẽ gửi tới Microsoft.
- **C. Kết hợp (khuyên dùng):** có máy chấm trên máy tính thì dùng A (miễn phí), không có thì dùng B; cùng một giao diện kết quả.

## 4. Giao diện kết quả (một thiết kế cho cả A và B)
1. **Vòng tròn % tổng** lớn + nhãn: ≥ 85 "Xuất sắc" (xanh), 60–84 "Khá" (vàng), < 60 "Cần luyện" (đỏ). Dưới đó 3 chỉ số: Phát âm · Trôi chảy · Đầy đủ (B) hoặc Phát âm · Từ đúng · Âm đúng (A).
2. **Câu được tô màu theo từng từ**: xanh (≥ 85), vàng (60–84), đỏ (< 60), kèm số % nhỏ dưới mỗi từ. Từ bị bỏ sót gạch ngang.
3. **Chạm vào một từ** → bảng trượt từ dưới lên (cùng kiểu bảng chặng): từ, IPA chuẩn, hàng các âm (xanh/đỏ), thanh % của từng âm, dòng "Bạn đọc /θ/ thành /s/", **mẹo tiếng Việt** ngắn ("đặt đầu lưỡi giữa hai hàm răng…"), nút 🔊 nghe mẫu chậm, nút ▶ nghe bản ghi của bạn, nút 🎤 đọc lại riêng từ này.
4. Nút **"Luyện các từ sai"**: chạy lần lượt từng từ sai (đọc → % → qua), cộng XP khi từ lên ≥ 85.
5. Màn kết thúc kiểu ELSA: sao, % trung bình, từ/âm tiến bộ, "Âm cần luyện hôm nay".

## 5. Cách tính % (A)
- % một âm = `confidence` của âm đó nếu âm nghe thấy trùng âm cần đọc, ngược lại giảm mạnh (≤ 40%).
- % một từ = trung bình trọng số các âm của từ (âm nhấn nặng hơn). % tổng = trung bình các từ, thấp nhất không dưới điểm `score` gốc của máy chấm khi hai số lệch quá 15 điểm (để không tạo ra con số lạ).
- Có file kiểm tra bằng bộ ghi âm mẫu (một giọng chuẩn, một giọng cố tình sai âm cuối) để chốt ngưỡng; đây là bước bắt buộc vì mô hình khác ELSA nên **% sẽ không trùng ELSA**, chỉ cùng ý nghĩa (cao = tốt).

## 6. Dữ liệu và tiến bộ
- Lưu theo âm: số lần luyện, % trung bình, 30 lần gần nhất (localStorage, đồng bộ lên tài khoản như tiến độ truyện: gộp lấy tốt nhất).
- Trang **"Âm của tôi"**: lưới các âm tiếng Anh (IPA) tô màu theo độ thành thạo; chạm vào âm → mẹo + cặp từ tối thiểu (ship/sheep, think/sink, light/right) để luyện.
- Cặp từ tối thiểu dựa trên 1.244 từ đã có (tự động ghép các từ chỉ khác một âm), có giọng mẫu.

## 7. Các bước làm và khối lượng (giờ làm việc của mình)
| Bước | Việc | Ước tính |
|---|---|---|
| E1 | Giao diện kết quả mới trên dữ liệu OpenPronounce sẵn có: vòng %, câu tô màu, bảng từng từ/âm, tính % (§4–5) + test | 3–4 giờ |
| E2 | Bảng mẹo phát âm tiếng Việt cho ~25 âm hay sai, nút so sánh nghe mẫu / nghe lại bản ghi | 2–3 giờ |
| E3 | "Luyện các từ sai" + thống kê theo âm + trang "Âm của tôi" + cặp từ tối thiểu | 4–5 giờ |
| E4 | Phương án B: Edge Function Azure + chọn nguồn tự động (cần khóa Azure từ bạn) | 3–4 giờ |
| E5 | Thử với bản ghi thật, chỉnh ngưỡng, deploy | 1–2 giờ |

Tổng khoảng 13–18 giờ; **E1 + E2 (5–7 giờ) đã cho trải nghiệm giống ELSA trên máy tính**, E4 mới cần cho điện thoại.

## 8. Câu hỏi cần bạn trả lời
1. Bạn chủ yếu luyện nói trên **máy tính** hay **điện thoại**? (quyết định có cần phương án B không)
2. Bạn có sẵn/đồng ý tạo tài khoản **Azure Speech** (có gói miễn phí) và gửi khóa để mình đặt vào Supabase không?
3. Bắt đầu từ **E1 + E2** ngay chứ?

## 9. Trạng thái (2026-10-20) — làm theo hướng điện thoại, không dùng Azure
- ✅ Đã làm (E1+E2 bản "không máy chủ ngoài"): [pron-report.ts](../src/domain/pron-report.ts) (% từng từ, so âm bằng IPA, mẹo tiếng Việt cho ~25 âm), [PronounceReport.tsx](../src/features/en/PronounceReport.tsx) (vòng %, từ tô màu kèm %, danh sách từ cần luyện, bảng chi tiết từ: IPA cần đọc / máy nghe thấy / từng âm / mẹo / nghe mẫu / nghe bản ghi / đọc lại riêng từ), nối vào [PronounceCheck.tsx](../src/features/en/PronounceCheck.tsx) cho cả điện thoại (nhận dạng giọng nói của trình duyệt) và máy tính (OpenPronounce, có % từng âm thật). Từ điển IPA: `node scripts/export-ipa.mjs` → `public/assets/en-ipa.json` (936 từ + các cặp từ hay nhầm).
- ⚠️ Giới hạn trên điện thoại: máy chỉ biết bạn đọc ra **từ nào**; khi nghe thành từ khác (think → sink) app so IPA hai từ để chỉ âm khác nhau. Nếu từ không có trong từ điển thì chỉ báo "máy nghe thành …". Không có % từng âm, trọng âm hay ngữ điệu — muốn vậy cần Azure (phương án B) hoặc máy chấm trên máy tính.
- ⏳ Chưa làm: E3 (luyện lại hàng loạt các từ sai, thống kê âm yếu, trang "Âm của tôi", cặp từ tối thiểu), E4 (Azure).
