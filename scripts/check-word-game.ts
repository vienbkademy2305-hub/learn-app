/**
 * `tsx scripts/check-word-game.ts [baseUrl] [outDir]` — plays the "Học thuộc" word games in a real browser against a
 * running site (default http://localhost:3000): English Buổi 1 and Chinese Bài 1. Answers choice questions from the
 * content snapshot, types a wrong word on typing questions, and checks that mastery is saved and the session ends.
 */
import { readFileSync } from "node:fs";
import { chromium, type Page } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? ".data/check-word-game";
const results: string[] = [];
const ok = (c: boolean, l: string) => results.push(`${c ? "PASS" : "FAIL"} ${l}`);

type Pair = { term: string; meaning: string; def: string | null };

async function play(page: Page, pairs: Pair[], storageKey: string, label: string) {
  const byMeaning = new Map(pairs.map((p) => [p.meaning, p.term]));
  const byTerm = new Map(pairs.map((p) => [p.term, p.meaning]));
  const byDef = new Map(pairs.filter((p) => p.def).map((p) => [p.def!, p.term]));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByRole("tab", { name: "🎯 Học thuộc (game)" }).click({ timeout: 180_000 });
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await page.screenshot({ path: `${OUT}/${label}-1-start.png`, fullPage: true });

  // match round
  if (await page.getByText("Nối từ với nghĩa").isVisible().catch(() => false)) {
    const left = page.locator(".grid.grid-cols-2 > div").nth(0).locator("button");
    const right = page.locator(".grid.grid-cols-2 > div").nth(1).locator("button");
    const n = await left.count();
    for (let i = 0; i < n; i++) {
      const term = (await left.nth(i).innerText()).trim();
      await left.nth(i).click();
      await right.filter({ hasText: byTerm.get(term)! }).first().click();
    }
    ok(true, `${label}: match round with ${n} pairs`);
    await page.waitForTimeout(900);
  }

  let asked = 0;
  for (; asked < 80; asked++) {
    if (await page.getByText("Xong lượt học!").isVisible().catch(() => false)) break;
    const prompt = await page.locator("p.text-sm.font-medium.text-stone-500").first().innerText().catch(() => "");
    const card = page.locator(".rounded-3xl").first();
    if (asked === 3) await page.screenshot({ path: `${OUT}/${label}-2-question.png`, fullPage: true });
    if (/gõ/i.test(prompt)) {
      await card.locator("input").fill("zzz");
      await card.getByRole("button", { name: "Kiểm tra" }).click();
    } else {
      let target: string | undefined;
      if (prompt.startsWith("Chọn từ đúng")) target = byMeaning.get((await card.locator("p.text-2xl").innerText()).trim());
      else if (prompt.startsWith("Chọn nghĩa")) target = byTerm.get((await card.locator("span.text-4xl, span.text-6xl").first().innerText()).trim());
      else if (prompt.startsWith("Đọc nghĩa")) target = byDef.get((await card.locator("p.italic").innerText()).trim().replace(/^“|”$/g, ""));
      const opts = card.locator(".grid button");
      const btn = target ? opts.filter({ hasText: target }).first() : opts.first();
      await btn.click({ timeout: 5000 }).catch(async (e) => { await page.screenshot({ path: `${OUT}/${label}-fail.png`, fullPage: true }); console.log("PROMPT", prompt); throw e; });
    }
    const next = card.getByRole("button", { name: "Tiếp →" });
    await next.click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(150);
  }
  await page.screenshot({ path: `${OUT}/${label}-3-end.png`, fullPage: true });
  ok(await page.getByText("Xong lượt học!").isVisible(), `${label}: session ends (${asked} questions)`);
  const saved = await page.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) ?? "{}");
    const m = raw.mastery ?? {};
    return { words: Object.keys(m).length, passed: Object.values(m).filter((x: any) => x.level >= 3).length, days: raw.gameDays?.length ?? 0 };
  }, storageKey);
  ok(saved.words > 0 && saved.days === 1, `${label}: mastery saved (${saved.words} words, ${saved.passed} passed)`);
  ok(errors.length === 0, `${label}: no page errors ${errors.join(" | ")}`);
}

const snapEn = JSON.parse(readFileSync(".data/content/en.json", "utf8"));
const lesson1 = snapEn.lessons.find((l: any) => l.number === 1);
const vocab: string[] = lesson1.steps.find((s: any) => s.type === "vocabulary").items;
const words = snapEn.words as Record<string, any>;
const toPair = (w: any): Pair => ({ term: w.headword, meaning: (w.meaning_vi as string[]).slice(0, 2).join("; "), def: null });
// lesson 1 words last so they win when two entries share a headword
const enPairs: Pair[] = [...Object.values(words).map(toPair), ...vocab.map((id) => toPair(words[id]))];
ok(vocab.length > 0, `en lesson 1 has ${vocab.length} words`);

const snapZh = JSON.parse(readFileSync(".data/content/hsk1.json", "utf8"));
const zhPairs: Pair[] = (Array.isArray(snapZh.words) ? snapZh.words : Object.values(snapZh.words)).filter((w: any) => w.meanings?.length).map((w: any) => ({ term: w.simplified, meaning: w.meanings.slice(0, 2).join("; "), def: (w.meaningsEn ?? []).slice(0, 2).join("; ") || null }));

const browser = await chromium.launch();
try {
  const en = await (await browser.newContext()).newPage();
  await en.goto(`${BASE}/en/flashcards/?lesson=1`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await play(en, enPairs, "chinese-app:en:progress:v1", "en");

  const zhPage = await (await browser.newContext()).newPage();
  await zhPage.goto(`${BASE}/zh/flashcards/?lesson=1`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await play(zhPage, zhPairs, "chinese-app:progress:v1", "zh");
} finally {
  await browser.close();
}
console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
