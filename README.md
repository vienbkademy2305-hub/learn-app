# Học tiếng Trung — HSK1 cho người Việt

Nền tảng học tiếng Trung Vietnamese-first. Quy tắc dự án: [CLAUDE.md](CLAUDE.md). Tài liệu: [docs/](docs/).

## Chạy trên máy

Cần Node 20+, pnpm, và 3 repo nguồn ở đường dẫn trong `sources/manifest.json` (hoặc đặt `SOURCE_REPOS_DIR`).

```bash
pnpm install
pnpm sources:fetch      # tải danh sách từ HSK (đã pin commit)
pnpm import:hsk1        # dựng database canonical (.data/pglite)
pnpm validate           # kiểm tra dữ liệu → reports/phase1-validation.md
pnpm content:export     # xuất nội dung cho website (.data/content, public/assets)
pnpm dev                # http://localhost:3000
```

## Kiểm tra

```bash
pnpm test               # unit test
pnpm typecheck
pnpm build              # site tĩnh trong out/
pnpm smoke              # mở trình duyệt thật: lỗi console, responsive, thao tác → reports/phase2-smoke.md
```

## Đưa lên GitHub Pages

```bash
pnpm deploy:pages       # build với /learn-app và đẩy out/ lên nhánh gh-pages
```

Trong GitHub → Settings → Pages chọn **Deploy from a branch → gh-pages / (root)**.
