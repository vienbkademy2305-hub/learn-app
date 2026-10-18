// Dựng danh mục đề Study4 (chỉ tiêu đề + liên kết, KHÔNG chép nội dung đề)
// từ sitemap công khai https://study4.com/sitemap-practicetest.xml (robots.txt cho phép).
// Chạy: node scripts/study4-catalog.mjs  →  src/content/study4-catalog.json
import { writeFileSync } from "node:fs";
import path from "node:path";

const xml = await (await fetch("https://study4.com/sitemap-practicetest.xml", { headers: { "user-agent": "Mozilla/5.0" } })).text();
const urls = [...xml.matchAll(/<loc>https:\/\/study4\.com\/tests\/(\d+)\/([^/<]+)\/<\/loc>/g)].map((m) => ({ id: +m[1], slug: m[2] }));

const title = (s) => s.split("-").map((w) => (/^(ielts|toeic|hsk|gt|sw|lr|bc)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(" ");
const natural = (a, b) => a.slug.localeCompare(b.slug, "en", { numeric: true });

function classify({ slug }) {
  let m = slug.match(/^hsk-([1-3])(-advanced)?-/);
  if (m) return { lang: "zh", group: `HSK ${m[1]}`, level: +m[1] };
  if (/^(recent-)?ielts.*(listening)/.test(slug) || /^bc-asia.*listening/.test(slug)) return { lang: "en", group: "IELTS Listening", skill: "listening" };
  if (/^(gt-)?(recent-)?ielts.*reading|ielts-general.*reading/.test(slug)) return { lang: "en", group: slug.startsWith("gt-") || slug.includes("general") ? "IELTS General Reading" : "IELTS Academic Reading", skill: "reading" };
  if (/^(recent-)?ielts.*writing/.test(slug)) return { lang: "en", group: "IELTS Writing", skill: "writing" };
  if (/^(recent-)?ielts.*speaking/.test(slug)) return { lang: "en", group: "IELTS Speaking", skill: "speaking" };
  return null;
}

const items = urls.map((u) => ({ ...u, c: classify(u) })).filter((u) => u.c).sort(natural).map(({ id, slug, c }) => ({
  id, title: title(slug), url: `https://study4.com/tests/${id}/${slug}/`, ...c,
}));
const out = path.resolve(import.meta.dirname, "../src/content/study4-catalog.json");
writeFileSync(out, JSON.stringify({ source: "https://study4.com/sitemap-practicetest.xml", fetched: new Date().toISOString().slice(0, 10), items }, null, 0));
const by = {}; for (const i of items) by[i.group] = (by[i.group] ?? 0) + 1;
console.log(items.length, by);
