/**
 * `pnpm smoke` — browser check of the static build (PHASE2_PLAN §7).
 * Serves out/ under the same base path as GitHub Pages, visits the learning
 * flow at mobile/tablet/desktop widths, and fails on console errors, failed
 * requests, HTTP errors or horizontal overflow. Screenshots: .data/screenshots/.
 */
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium, type Page } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const SHOTS = path.join(ROOT, ".data", "screenshots");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PORT = 4310;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
};

function startServer() {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url ?? "/").split("?")[0]!);
    if (BASE && !url.startsWith(BASE)) {
      res.writeHead(404).end("outside base path");
      return;
    }
    url = url.slice(BASE.length) || "/";
    let file = path.join(OUT, url);
    if (!file.startsWith(OUT)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!existsSync(file)) {
      res.writeHead(404, { "content-type": TYPES[".html"] });
      createReadStream(path.join(OUT, "404.html")).pipe(res);
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise<http.Server>((resolve) => server.listen(PORT, () => resolve(server)));
}

const LESSON = "hsk1-01-greetings";
const PAGES = [
  ["home", "/"],
  ["hsk1", "/hsk/1/"],
  ["lesson-vocab", `/lesson/${LESSON}/`],
  ["lesson-word", `/lesson/${LESSON}/word/lao3shi1-8001-5e08/`],
  ["lesson-examples", `/lesson/${LESSON}/examples/`],
  ["lesson-writing", `/lesson/${LESSON}/writing/`],
  ["lesson-summary", `/lesson/${LESSON}/summary/`],
  ["word", "/word/ai4-7231/"],
  ["sources", "/sources/"],
] as const;
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

let abortedPrefetches = 0;

interface Problem {
  viewport: string;
  page: string;
  kind: string;
  detail: string;
}

function watch(page: Page, problems: Problem[], ctx: () => { viewport: string; page: string }) {
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push({ ...ctx(), kind: `console.${m.type()}`, detail: m.text() });
  });
  page.on("pageerror", (e) => problems.push({ ...ctx(), kind: "pageerror", detail: e.message }));
  page.on("requestfailed", (r) => {
    // Link prefetches cancelled by the next navigation are expected, not user-visible errors.
    if (r.failure()?.errorText === "net::ERR_ABORTED") {
      abortedPrefetches++;
      return;
    }
    problems.push({ ...ctx(), kind: "requestfailed", detail: `${r.url()} ${r.failure()?.errorText}` });
  });
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push({ ...ctx(), kind: `http ${r.status()}`, detail: r.url() });
  });
}

async function main() {
  if (!existsSync(OUT)) throw new Error("out/ not found — run `pnpm build` first");
  mkdirSync(SHOTS, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const problems: Problem[] = [];
  const checks: string[] = [];
  const url = (p: string) => `http://localhost:${PORT}${BASE}${p}`;

  try {
    // ── Every page at every width ──────────────────────────────────────────
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: "vi-VN" });
      const page = await context.newPage();
      let current = "";
      watch(page, problems, () => ({ viewport: vp.name, page: current }));
      for (const [name, p] of PAGES) {
        current = name;
        await page.goto(url(p), { waitUntil: "networkidle" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) problems.push({ viewport: vp.name, page: name, kind: "horizontal-overflow", detail: `${overflow}px` });
        await page.screenshot({ path: path.join(SHOTS, `${vp.name}-${name}.png`), fullPage: vp.name === "mobile" });
      }
      await context.close();
    }

    // ── Interactions (desktop) ─────────────────────────────────────────────
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    let current = "interaction";
    watch(page, problems, () => ({ viewport: "desktop", page: current }));

    await page.goto(url(`/lesson/${LESSON}/`), { waitUntil: "networkidle" });
    const toggle = page.getByRole("button", { name: "Đánh dấu đã học" }).first();
    await toggle.click();
    const pressed = await page.locator('button[aria-pressed="true"]').count();
    checks.push(`${pressed === 1 ? "PASS" : "FAIL"} đánh dấu 1 từ đã học (aria-pressed=true: ${pressed})`);

    current = "hsk1-after-mark";
    await page.goto(url("/hsk/1/"), { waitUntil: "networkidle" });
    const firstCard = await page.locator("ol li").first().innerText();
    checks.push(`${/Đang học/.test(firstCard) && /1\/\d+ từ đã học/.test(firstCard) ? "PASS" : "FAIL"} bài 1 hiện "Đang học" và 1 từ đã học sau khi đánh dấu`);

    current = "audio";
    await page.goto(url(`/lesson/${LESSON}/examples/`), { waitUntil: "networkidle" });
    const audioResponse = page.waitForResponse((r) => r.url().endsWith(".mp3"), { timeout: 10_000 }).catch(() => null);
    await page.getByRole("button", { name: "Nghe câu với tốc độ bình thường" }).first().click();
    const res = await audioResponse;
    checks.push(`${res && res.status() < 400 ? "PASS" : "FAIL"} bấm "Nghe" tải audio (${res ? `${res.status()} ${new URL(res.url()).pathname}` : "không có request"})`);

    current = "play-all";
    await page.goto(url(`/lesson/${LESSON}/examples/`), { waitUntil: "networkidle" });
    const firstClip = page.waitForResponse((r) => r.url().endsWith(".mp3"), { timeout: 10_000 }).catch(() => null);
    await page.getByRole("button", { name: "▶ Nghe cả bài" }).click();
    const clip = await firstClip;
    const nowPlaying = await page.getByText(/Đang phát câu 1\//).count();
    const highlighted = await page.locator('li[data-playing="true"]').count();
    checks.push(`${clip && nowPlaying > 0 && highlighted === 1 ? "PASS" : "FAIL"} "Nghe cả bài" phát câu 1 và tô sáng câu đang đọc`);
    await page.getByRole("button", { name: "■ Dừng" }).click();

    current = "writing";
    const strokeResponse = page.waitForResponse((r) => r.url().includes("/assets/strokes/"), { timeout: 10_000 }).catch(() => null);
    await page.goto(url(`/lesson/${LESSON}/writing/`), { waitUntil: "networkidle" });
    const strokeRes = await strokeResponse;
    checks.push(`${strokeRes && strokeRes.status() < 400 ? "PASS" : "FAIL"} tải dữ liệu nét chữ (${strokeRes ? `${strokeRes.status()} ${new URL(strokeRes.url()).pathname}` : "không có request"})`);
    await page.getByRole("button", { name: "▶ Xem viết mẫu" }).click();
    await page.waitForTimeout(1500);
    const strokePaths = await page.locator('[aria-label^="Khung viết chữ"] svg path').count();
    checks.push(`${strokePaths > 0 ? "PASS" : "FAIL"} hoạt ảnh viết mẫu vẽ các nét (${strokePaths} path SVG)`);
    await page.getByRole("button", { name: /Tự viết thử/ }).click();
    const prompt = await page.getByText(/Hãy viết nét 1\//).count();
    checks.push(`${prompt > 0 ? "PASS" : "FAIL"} chế độ tự viết hiện hướng dẫn "Hãy viết nét 1/…"`);

    current = "summary";
    await page.goto(url(`/lesson/${LESSON}/summary/`), { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Hoàn thành bài học" }).click();
    const completed = await page.getByText("Hoàn thành", { exact: true }).count();
    checks.push(`${completed > 0 ? "PASS" : "FAIL"} bấm "Hoàn thành bài học" đổi trạng thái sang Hoàn thành`);

    current = "reload";
    await page.reload({ waitUntil: "networkidle" });
    const persisted = await page.getByRole("button", { name: "Bỏ đánh dấu hoàn thành" }).count();
    checks.push(`${persisted === 1 ? "PASS" : "FAIL"} tiến độ còn sau khi tải lại trang (localStorage)`);

    current = "404";
    const notFound = await page.goto(url("/lesson/khong-ton-tai/"));
    const notFoundOk = notFound?.status() === 404 && (await page.getByText("Không tìm thấy trang").count()) > 0;
    // The 404 response itself is expected here; drop it from the problem list.
    for (let i = problems.length - 1; i >= 0; i--) if (problems[i]!.page === "404") problems.splice(i, 1);
    checks.push(`${notFoundOk ? "PASS" : "FAIL"} trang không tồn tại hiện 404 tiếng Việt`);
    await context.close();

    // Word/character pronunciation uses the device voice. Headless Chromium has
    // no Mandarin voice, so a fake one records what would be spoken.
    const ttsContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    // Plain-JS string: a function would be transpiled with helpers (__name) that do not exist in the page.
    await ttsContext.addInitScript(`
      window.__spoken = [];
      const voice = { lang: "zh-CN", name: "Test Mandarin" };
      class FakeUtterance {
        constructor(text) { this.text = text; this.voice = null; this.lang = ""; this.rate = 1; this.onend = null; this.onerror = null; }
      }
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance });
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => [voice],
          speak: (u) => { window.__spoken.push(u.text + "@" + u.rate); setTimeout(() => u.onend && u.onend(), 50); },
          cancel: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      });
    `);
    const tts = await ttsContext.newPage();
    current = "tts";
    watch(tts, problems, () => ({ viewport: "desktop", page: current }));
    await tts.goto(url(`/lesson/${LESSON}/word/lao3shi1-8001-5e08/`), { waitUntil: "networkidle" });
    await tts.getByRole("button", { name: "Nghe lǎo shī" }).click();
    await tts.getByRole("button", { name: "Nghe chậm lǎo shī" }).click();
    await tts.getByRole("button", { name: "Nghe 老" }).first().click();
    const spoken = await tts.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
    checks.push(`${JSON.stringify(spoken) === JSON.stringify(["老师@0.85", "老师@0.5", "老@0.85"]) ? "PASS" : "FAIL"} nút nghe từ/chữ đọc đúng nội dung và tốc độ (${spoken.join(", ")})`);
    await ttsContext.close();
  } finally {
    await browser.close();
    server.close();
  }

  const failedChecks = checks.filter((c) => c.startsWith("FAIL"));
  const report = [
    "# PHASE 2 — Smoke test (static build)",
    "",
    `- Generated: ${new Date().toISOString()} by \`pnpm smoke\`, base path \`${BASE || "/"}\``,
    `- Pages × viewports: ${PAGES.length} × ${VIEWPORTS.map((v) => `${v.width}px`).join(" / ")}`,
    `- Link prefetches cancelled by navigation (ignored): ${abortedPrefetches}`,
    `- Result: **${problems.length === 0 && failedChecks.length === 0 ? "PASS" : "FAIL"}**`,
    "",
    "## Interactions",
    "",
    ...checks.map((c) => `- ${c}`),
    "",
    `## Console errors / failed requests / overflow (${problems.length})`,
    "",
    ...(problems.length === 0 ? ["None."] : problems.map((p) => `- [${p.viewport}] ${p.page} — ${p.kind}: ${p.detail}`)),
    "",
  ].join("\n");
  mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  writeFileSync(path.join(ROOT, "reports", "phase2-smoke.md"), report);
  console.log(report);
  process.exitCode = problems.length === 0 && failedChecks.length === 0 ? 0 : 1;
}

await main();
