# Chấm phát âm tiếng Anh bằng OpenPronounce (2026-10-07)

## 1. Là gì
[OpenPronounce](https://github.com/Halleck45/OpenPronounce) (MIT) — máy chấm phát âm mã nguồn mở: nhận bản ghi âm + câu cần đọc, trả về điểm 0–100, các từ đọc sai kèm IPA cần đọc / IPA nghe thấy, từng âm sai. Dùng 2 mô hình Wav2Vec2 (~1,2 GB mỗi cái, tự tải lần đầu từ Hugging Face) + espeak-ng + ffmpeg. Chỉ tiếng Anh được hiệu chỉnh với điểm của giám khảo người.

## 2. Vì sao chạy trên máy người dùng
Web là site tĩnh trên GitHub Pages, không chạy được Python và mô hình 2,4 GB. Nên:

```
Trang web (GitHub Pages hoặc localhost)
   │  POST /pronunciation  (bản ghi webm + expected_text, lang=en)
   ▼
http://localhost:8765  ← OpenPronounce trên máy tính (D:\Lean - Ngoại ngữ\OpenPronounce, ngoài repo)
```
- Bản ghi âm chỉ gửi tới máy chấm này, không lưu ở Supabase hay đâu khác.
- Chrome cho phép trang https gọi `http://localhost`; Chrome mới có thể hỏi quyền "truy cập mạng cục bộ" — chọn Cho phép.
- Điện thoại: chạy máy chấm với `--host 0.0.0.0`, rồi nhập địa chỉ Tailscale của máy tính ở ô "Địa chỉ máy chấm" (trang /en/luyen-noi). Lưu ý: trang https gọi `http://<ip>` sẽ bị chặn mixed content — chỉ dùng được qua `http://localhost` hoặc khi có HTTPS (vd. `tailscale serve`).

## 3. File
| File | Vai trò |
|---|---|
| `src/features/en/pronounce.ts` | gọi máy chấm, địa chỉ lưu localStorage (`chinese-app:pronounce-url`, mặc định `http://localhost:8765`) |
| `src/features/en/PronounceCheck.tsx` | nút 🎤 Chấm / khung ghi âm → điểm, tô đỏ từ sai, danh sách IPA |
| `src/features/en/SpeakingLab.tsx`, `src/app/en/luyen-noi/page.tsx` | trang Luyện nói: trạng thái máy chấm, chọn câu theo buổi, câu tự gõ |
| `src/features/en/Cards.tsx` (`EnSentenceRow`) | nút 🎤 Chấm cạnh mọi câu ví dụ (bước Câu ví dụ, ví dụ ngữ pháp) |
| `OpenPronounce\lean_server.py` (ngoài repo) | bọc `server.app` + CORS (`allow_private_network=True`), đặt đường dẫn espeak-ng DLL và HF_HOME |
| `OpenPronounce\Chạy chấm phát âm.bat` (ngoài repo) | bật máy chấm ở cổng 8765 |

## 4. Cài lại từ đầu (nếu đổi máy)
1. `winget install Python.Python.3.12` và `winget install eSpeak-NG.eSpeak-NG`; ffmpeg đã có (winget Gyan.FFmpeg).
2. `git clone https://github.com/Halleck45/OpenPronounce.git "D:\Lean - Ngoại ngữ\OpenPronounce"`
3. Trong thư mục đó: `py -3.12 -m venv .venv` → `.venv\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cpu` → `.venv\Scripts\pip install -e ".[app]"`.
4. Chép lại `lean_server.py` và `Chạy chấm phát âm.bat` (nội dung ở mục 5).

## 5. lean_server.py
```python
import os
os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", r"C:\Program Files\eSpeak NG\libespeak-ng.dll")
os.environ.setdefault("HF_HOME", os.path.join(os.path.dirname(os.path.abspath(__file__)), ".models"))
from fastapi.middleware.cors import CORSMiddleware
from server import app
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
                   allow_private_network=True)
```
`Chạy chấm phát âm.bat`: `.venv\Scripts\python.exe -m uvicorn lean_server:app --host 127.0.0.1 --port 8765`. Mô hình lưu ở `OpenPronounce\.models` (HF_HOME).
