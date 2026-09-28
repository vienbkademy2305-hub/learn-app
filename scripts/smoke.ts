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
  ["pinyin", "/pinyin/"],
  ["lesson-vocab", `/lesson/${LESSON}/`],
  ["lesson-word", `/lesson/${LESSON}/word/lao3shi1-8001-5e08/`],
  ["lesson-grammar", `/lesson/${LESSON}/grammar/`],
  ["lesson-examples", `/lesson/${LESSON}/examples/`],
  ["lesson-writing", `/lesson/${LESSON}/writing/`],
  ["lesson-practice", `/lesson/${LESSON}/practice/`],
  ["practice-vocab", `/lesson/${LESSON}/practice/vocab/`],
  ["practice-flashcards", `/lesson/${LESSON}/practice/flashcards/`],
  ["practice-copy", `/lesson/${LESSON}/practice/copy/`],
  ["practice-sentences", `/lesson/${LESSON}/practice/sentences/`],
  ["practice-paragraph", `/lesson/${LESSON}/practice/paragraph/`],
  ["notebook", "/flashcards/"],
  ["lesson-exercises", `/lesson/${LESSON}/exercises/`],
  ["exercise-listening", `/lesson/${LESSON}/exercises/listening/`],
  ["exercise-sentences", `/lesson/${LESSON}/exercises/sentences/`],
  ["exercise-characters", `/lesson/${LESSON}/exercises/characters/`],
  ["lesson-summary", `/lesson/${LESSON}/summary/`],
  ["practice", "/practice/"],
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

    // ── Exercises: one full run of each type ──────────────────────────────────
    const finishRun = async (answerOne: () => Promise<void>) => {
      for (let i = 0; i < 12; i++) {
        await answerOne();
        if (await page.getByText("Kết quả").count()) return true;
        await page.getByRole("button", { name: "Câu tiếp →" }).click();
      }
      return false;
    };

    current = "exercise-listening";
    await page.goto(url(`/lesson/${LESSON}/exercises/listening/`), { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    const listeningDone = await finishRun(async () => {
      await page.locator("ul.grid li button").first().click();
    });
    checks.push(`${listeningDone ? "PASS" : "FAIL"} làm hết một lượt Bài nghe tới màn hình kết quả`);

    current = "exercise-sentences";
    await page.goto(url(`/lesson/${LESSON}/exercises/sentences/`), { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    let sawReorder = false;
    let sawPinyin = false;
    const sentencesDone = await finishRun(async () => {
      const pool = page.locator('[aria-label="Các từ"] button');
      if (await pool.count()) {
        sawReorder = true;
        while (await pool.count()) await pool.first().click();
      } else {
        sawPinyin = true;
        await page.getByLabel("Pinyin").fill("ni3");
      }
      await page.getByRole("button", { name: "Kiểm tra" }).click();
    });
    checks.push(`${sentencesDone && sawReorder && sawPinyin ? "PASS" : "FAIL"} làm hết một lượt Bài viết (có cả sắp xếp câu và viết pinyin)`);

    current = "exercise-characters";
    await page.goto(url(`/lesson/${LESSON}/exercises/characters/`), { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    const frame = page.locator('[aria-label="Khung viết bài tập"]');
    await frame.locator("svg").waitFor();
    await page.waitForTimeout(500);
    // Read the stroke data of the character actually being asked (data-stroke), not whatever loaded first.
    const strokeKey = await frame.getAttribute("data-stroke");
    const data = (await page.evaluate(async (u) => (await fetch(u)).json(), url(`/assets/${strokeKey}`))) as { medians: number[][][] };
    // Draw each stroke along its median, converting hanzi-writer coordinates
    // (1024 box, y up from -124) to the 260px canvas with 8px padding.
    await frame.scrollIntoViewIfNeeded();
    const box = (await frame.boundingBox())!;
    const scale = (260 - 16) / 1024;
    const toScreen = ([x, y]: number[]) => ({ x: box.x + 8 + x! * scale, y: box.y + 260 - (124 * scale + 8) - y! * scale });
    for (const median of data.medians) {
      const pts = median.map(toScreen);
      await page.mouse.move(pts[0]!.x, pts[0]!.y);
      await page.mouse.down();
      for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(400);
    }
    const drawnCorrectly = (await page.getByText("Chính xác!").count()) > 0;
    checks.push(`${drawnCorrectly ? "PASS" : "FAIL"} viết đúng từng nét bằng chuột → máy chấm "Chính xác!" (${data.medians.length} nét)`);
    let charactersDone = (await page.getByText("Kết quả").count()) > 0;
    if (!charactersDone) {
      await page.getByRole("button", { name: "Câu tiếp →" }).click();
      charactersDone = await finishRun(async () => {
        await page.getByRole("button", { name: "Xem đáp án" }).click();
      });
    }
    checks.push(`${charactersDone ? "PASS" : "FAIL"} làm hết một lượt Viết chữ tới màn hình kết quả`);

    // ── Grammar step (PHASE5_GRAMMAR_PLAN) ────────────────────────────────────
    current = "grammar";
    await page.goto(url(`/lesson/${LESSON}/grammar/`), { waitUntil: "networkidle" });
    const grammarStep = await page.locator('nav[aria-label="Các bước của bài học"] [aria-current="step"]').innerText();
    const grammarCards = await page.locator("article[id^='g1-']").count();
    const grammarAudio = await page.locator("article[id^='g1-'] button[aria-label='Nghe câu với tốc độ bình thường']").count();
    checks.push(`${grammarStep.includes("2. Ngữ pháp") && grammarCards === 4 && grammarAudio > 0 ? "PASS" : "FAIL"} bước "2. Ngữ pháp": ${grammarCards} điểm, ${grammarAudio} câu ví dụ có audio`);
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    const grammarQuizDone = await finishRun(async () => {
      await page.locator("#grammar-quiz ul.grid li button").first().click();
    });
    checks.push(`${grammarQuizDone ? "PASS" : "FAIL"} làm hết phần "Câu nào đúng?" của bài 1 tới màn hình kết quả`);

    // ── Practice step (PHASE4_PRACTICE_PLAN) ──────────────────────────────────
    current = "practice-hub";
    await page.goto(url(`/lesson/${LESSON}/practice/`), { waitUntil: "networkidle" });
    const activeStep = await page.locator('nav[aria-label="Các bước của bài học"] [aria-current="step"]').innerText();
    const hubCards = await page.locator("#practice-hub-title ~ ul > li").count();
    checks.push(`${activeStep.includes("5. Luyện tập") && hubCards === 5 ? "PASS" : "FAIL"} bước "5. Luyện tập" có 5 mục (${activeStep}, ${hubCards} thẻ)`);

    current = "practice-vocab";
    await page.goto(url(`/lesson/${LESSON}/practice/vocab/`), { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "10", exact: true }).click();
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    let sawTyping = false;
    const vocabDone = await finishRun(async () => {
      const typing = page.getByLabel("Pinyin hoặc chữ Hán");
      if (await typing.count()) {
        sawTyping = true;
        await typing.fill("ni3");
        await page.getByRole("button", { name: "Kiểm tra" }).click();
      } else {
        await page.locator("ul.grid li button").first().click();
      }
    });
    checks.push(`${sawTyping ? "PASS" : "FAIL"} Nhớ từ vựng có dạng Việt → Trung gõ pinyin`);
    checks.push(`${vocabDone ? "PASS" : "FAIL"} làm hết một lượt Nhớ từ vựng tới màn hình kết quả`);

    current = "practice-flashcards";
    await page.goto(url(`/lesson/${LESSON}/practice/flashcards/`), { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Bắt đầu ôn" }).click();
    const before = await page.getByText(/^Còn \d+ thẻ$/).innerText();
    await page.getByRole("button", { name: "Lật thẻ", exact: true }).click();
    const cardHanzi = await page.locator('[aria-label="Mặt sau của thẻ"] p[lang="zh-CN"]').first().innerText();
    await page.getByRole("button", { name: /Lưu vào Sổ từ/ }).click();
    await page.getByRole("button", { name: /Nhớ rồi/ }).click();
    const after = await page.getByText(/^Còn \d+ thẻ$/).innerText();
    const n = (t: string) => Number(t.match(/\d+/)![0]);
    checks.push(`${n(after) === n(before) - 1 ? "PASS" : "FAIL"} flashcard: lật thẻ, "Nhớ rồi" bớt 1 thẻ (${before} → ${after})`);

    current = "notebook";
    await page.goto(url("/flashcards/"), { waitUntil: "networkidle" });
    const notebookHas = await page.getByRole("heading", { name: /Từ đã lưu \(1\)/ }).count();
    const listed = await page.locator("li span.font-han").first().innerText().catch(() => "");
    checks.push(`${notebookHas && listed === cardHanzi ? "PASS" : "FAIL"} từ vừa lưu (${cardHanzi}) có trong Sổ từ`);

    current = "practice-copy";
    await page.goto(url(`/lesson/${LESSON}/practice/copy/`), { waitUntil: "networkidle" });
    await page.locator('[aria-label^="Khung chép chữ"] svg').waitFor();
    checks.push("PASS khung Tập chép chữ tải được chữ đầu tiên");

    current = "practice-sentences";
    await page.goto(url(`/lesson/${LESSON}/practice/sentences/`), { waitUntil: "networkidle" });
    const sentenceBox = page.getByLabel(/^Câu của bạn với từ/);
    await sentenceBox.fill("我是老师。");
    await page.getByRole("button", { name: "Tự kiểm tra" }).click();
    const checked = await page.getByText("Câu mẫu có từ này:").count();
    await page.waitForTimeout(900);
    await page.reload({ waitUntil: "networkidle" });
    const kept = await page.getByLabel(/^Câu của bạn với từ/).inputValue();
    checks.push(`${checked && kept === "我是老师。" ? "PASS" : "FAIL"} Đặt câu: tự kiểm tra hiện câu mẫu, câu được lưu sau khi tải lại`);

    current = "practice-paragraph";
    await page.goto(url(`/lesson/${LESSON}/practice/paragraph/`), { waitUntil: "networkidle" });
    await page.getByLabel("Đoạn văn của bạn").fill("你好！我是老师。谢谢！");
    const lengthLine = await page.getByText(/^Độ dài: \d+\/30 chữ Hán$/).innerText();
    checks.push(`${lengthLine === "Độ dài: 8/30 chữ Hán" ? "PASS" : "FAIL"} Viết đoạn văn: đếm chữ Hán khi gõ (${lengthLine})`);

    current = "practice";
    await page.goto(url("/practice/"), { waitUntil: "networkidle" });
    const firstLessonScores = await page.locator("ol li").first().innerText();
    const scored = (firstLessonScores.match(/\d+\/\d+/g) ?? []).length;
    checks.push(`${scored === 3 ? "PASS" : "FAIL"} trang Bài tập hiện điểm của cả 3 loại cho bài 1 (${scored}/3)`);

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

    const spokenNow = () => tts.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.slice());
    const answerAll = async (scope: string) => {
      for (let i = 0; i < 40; i++) {
        await tts.locator(`${scope} ul.grid li button`).first().click();
        if (await tts.getByText("Kết quả").count()) return true;
        await tts.getByRole("button", { name: "Câu tiếp →" }).click();
      }
      return false;
    };

    current = "pinyin-tts";
    await tts.goto(url("/pinyin/"), { waitUntil: "networkidle" });
    await tts.getByRole("button", { name: "Nghe zh: 知 zhī" }).click();
    const tileSpoken = (await spokenNow()).at(-1);
    checks.push(`${tileSpoken === "知@0.7" ? "PASS" : "FAIL"} Bài 0: bấm ô thanh mẫu zh đọc chữ ví dụ 知 (${tileSpoken})`);
    await tts.getByRole("button", { name: "Bắt đầu" }).click();
    await tts.waitForTimeout(400);
    const firstPrompt = (await spokenNow()).at(-1) ?? "";
    const toneDone = await answerAll("#practice");
    checks.push(`${toneDone && /^\p{Script=Han}@0\.7$/u.test(firstPrompt) ? "PASS" : "FAIL"} Bài 0: luyện nghe thanh điệu tự đọc câu hỏi (${firstPrompt}) và làm hết tới kết quả`);
    await tts.getByRole("button", { name: "Phân biệt âm dễ nhầm" }).click();
    await tts.getByRole("button", { name: "Bắt đầu" }).click();
    checks.push(`${(await answerAll("#practice")) ? "PASS" : "FAIL"} Bài 0: làm hết một lượt phân biệt âm dễ nhầm`);

    current = "vocab-listening";
    await tts.goto(url(`/lesson/${LESSON}/practice/vocab/`), { waitUntil: "networkidle" });
    await tts.getByRole("button", { name: "🎧 Nghe" }).click();
    await tts.getByRole("button", { name: "10", exact: true }).click();
    const spokenBefore = (await spokenNow()).length;
    await tts.getByRole("button", { name: "Bắt đầu" }).click();
    await tts.waitForTimeout(400);
    const heard = (await spokenNow()).slice(spokenBefore);
    checks.push(`${heard.length === 1 && heard[0]!.endsWith("@0.85") ? "PASS" : "FAIL"} Nhớ từ vựng: câu nghe tự đọc từ khi hiện câu hỏi (${heard.join(", ")})`);
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
