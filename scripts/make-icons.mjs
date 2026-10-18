// Sinh icon PNG (iOS cần PNG) từ src/app/icon.svg. Chạy: node scripts/make-icons.mjs
// sharp chỉ có trong kho pnpm (phụ thuộc của Next), nên nạp qua đường dẫn đó.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const sharp = createRequire(import.meta.url)(path.join(root, "node_modules/.pnpm/sharp@0.34.5/node_modules/sharp"));
const svg = readFileSync(path.join(root, "src/app/icon.svg"));
// iOS tự bo góc: bản apple-touch/maskable dùng nền phủ kín, không bo.
const full = Buffer.from(svg.toString().replace('rx="14"', 'rx="0"'));
for (const [name, size, src] of [["icon-192.png", 192, svg], ["icon-512.png", 512, svg], ["maskable-512.png", 512, full], ["apple-touch-icon.png", 180, full]]) {
  await sharp(src, { density: 384 }).resize(size, size).png().toFile(path.join(root, "public/icons", name));
}
console.log("ok");
