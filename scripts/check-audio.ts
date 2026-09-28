/**
 * `pnpm audio:check [--live]` — listening audio check (docs/LISTENING_PLAN.md §3).
 *
 * For every HSK1 sentence in the content snapshot:
 *  1. it has both a normal and a slow recording;
 *  2. each file exists in the build (out/assets), is a valid MP3 and has a duration;
 *  3. the slow recording is longer than the normal one — or, when the source slow file
 *     is not slower, the UI falls back to the normal file at 0.8× (playbackFor);
 *  4. each URL — built exactly like the UI does (src/lib/storage-url.ts) — answers
 *     200 with audio/mpeg and the right size, on the local build and with --live on
 *     GitHub Pages;
 *  5. a browser sample confirms the parsed durations match what <audio> reports.
 * Writes reports/listening-check.md; exits 1 on any failure.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import type { ContentSnapshot } from "../src/content/types";
import { playbackFor, SLOW_RATE } from "../src/domain/listening";
import { assetUrl } from "../src/lib/storage-url";
import { inspectMp3 } from "../importers/lib/mp3";
import { startStaticServer } from "./lib/static-server";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PORT = 4311;
const LIVE_ORIGIN = "https://vienbkademy2305-hub.github.io";
const live = process.argv.includes("--live");

interface FileResult {
  key: string;
  durationSec: number | null;
  size: number;
}

const failures: string[] = [];
const fail = (msg: string) => failures.push(msg);

/** Runs `fn` over items with a small concurrency limit. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]!);
      }
    }),
  );
  return results;
}

async function checkUrls(origin: string, label: string, files: Map<string, FileResult>) {
  const bad: string[] = [];
  await pool([...files.values()], 8, async (f) => {
    const url = origin + assetUrl(f.key);
    try {
      const res = await fetch(url, { method: "HEAD" });
      const type = res.headers.get("content-type") ?? "";
      const length = Number(res.headers.get("content-length") ?? "-1");
      if (res.status !== 200) bad.push(`${label}: ${res.status} ${url}`);
      // GitHub Pages labels .mp3 as "audio/mp3" (non-standard alias every browser accepts).
      else if (!/^audio\/(mpeg|mp3)(;|$)/.test(type)) bad.push(`${label}: content-type "${type}" ${url}`);
      else if (length !== -1 && length !== f.size) bad.push(`${label}: size ${length} ≠ ${f.size} ${url}`);
    } catch (err) {
      bad.push(`${label}: ${(err as Error).message} ${url}`);
    }
  });
  bad.forEach(fail);
  return bad.length;
}

async function main() {
  const snapshot = JSON.parse(readFileSync(path.join(ROOT, ".data", "content", "hsk1.json"), "utf8")) as ContentSnapshot;
  if (!existsSync(OUT)) throw new Error("out/ not found — run `pnpm build` first");
  const sentences = Object.values(snapshot.sentences);

  // 1–2. Presence and validity of every file.
  const files = new Map<string, FileResult>();
  let missingSpeed = 0;
  for (const s of sentences) {
    for (const speed of ["normal", "slow"] as const) {
      const key = s.audio[speed];
      if (!key) {
        missingSpeed++;
        fail(`${s.key}: no ${speed} audio`);
        continue;
      }
      const file = path.join(OUT, "assets", key);
      if (!existsSync(file)) {
        fail(`${s.key}: ${speed} file missing in build: ${key}`);
        continue;
      }
      const info = inspectMp3(readFileSync(file));
      if (!info) fail(`${s.key}: ${speed} is not a valid MP3: ${key}`);
      files.set(key, { key, durationSec: info?.durationSec ?? null, size: statSync(file).size });
    }
  }

  // 3. Slow must be longer than normal.
  const ratios: number[] = [];
  let slowNotLonger = 0;
  const notSlower: string[] = [];
  for (const s of sentences) {
    const n = s.audio.normal ? files.get(s.audio.normal)?.durationSec : null;
    const sl = s.audio.slow ? files.get(s.audio.slow)?.durationSec : null;
    if (!n || !sl) continue;
    ratios.push(sl / n);
    if (sl <= n) {
      slowNotLonger++;
      notSlower.push(`${s.key} (thường ${n.toFixed(2)}s, chậm ${sl.toFixed(2)}s)`);
      // Source issue (separate synthesis, docs/LISTENING_PLAN.md §3): must be mitigated in the UI.
      const pb = playbackFor(s.audio, s.audioMs, "slow");
      if (!pb || pb.key !== s.audio.normal || pb.rate !== SLOW_RATE) {
        fail(`${s.key}: slow file is not slower and the UI does not fall back to normal@${SLOW_RATE}× (snapshot durations missing?)`);
      }
    }
  }
  ratios.sort((a, b) => a - b);
  const q = (p: number) => ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))] ?? 0;

  // 4. HTTP checks with the UI's own URL builder.
  const server = await startStaticServer(OUT, BASE, PORT);
  const localBad = await checkUrls(`http://localhost:${PORT}`, "local", files);
  let liveBad: number | null = null;
  if (live) liveBad = await checkUrls(LIVE_ORIGIN, "live", files);

  // 5. Browser cross-check on a sample: <audio>.duration vs parsed duration.
  const sample = sentences.filter((_, i) => i % 28 === 0).flatMap((s) => [s.audio.normal, s.audio.slow]).filter((k): k is string => Boolean(k));
  const browserRows: Array<{ key: string; parsed: number; browser: number | null }> = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}${BASE}/`);
    for (const key of sample) {
      const duration = await page.evaluate(
        (src) =>
          new Promise<number | null>((resolve) => {
            const a = new Audio();
            a.preload = "metadata";
            a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : null);
            a.onerror = () => resolve(null);
            a.src = src;
            setTimeout(() => resolve(null), 10_000);
          }),
        assetUrl(key),
      );
      const parsed = files.get(key)?.durationSec ?? 0;
      browserRows.push({ key, parsed, browser: duration });
      if (duration === null) fail(`browser could not load metadata: ${key}`);
      // Decoders may add/strip a frame of padding; allow 0.15 s.
      else if (Math.abs(duration - parsed) > 0.15) fail(`duration mismatch ${key}: browser ${duration.toFixed(2)}s vs parsed ${parsed.toFixed(2)}s`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  const report = [
    "# Listening audio check",
    "",
    `- Generated: ${new Date().toISOString()} by \`pnpm audio:check${live ? " --live" : ""}\`, base path \`${BASE || "/"}\``,
    `- Result: **${failures.length === 0 ? "PASS" : `FAIL (${failures.length})`}**`,
    "",
    "| Check | Result |",
    "|---|---|",
    `| Sentences | ${sentences.length} |`,
    `| Audio files (normal + slow) | ${files.size} |`,
    `| Sentences missing a speed | ${missingSpeed} |`,
    `| Invalid / missing MP3 in build | ${[...files.values()].filter((f) => f.durationSec === null).length} |`,
    `| Source slow file not longer than normal (UI plays normal at ${SLOW_RATE}×) | ${slowNotLonger} |`,
    `| Slow/normal duration ratio (min · median · max) | ${q(0).toFixed(2)} · ${q(0.5).toFixed(2)} · ${q(0.999).toFixed(2)} |`,
    `| URL errors — local build (${files.size} HEAD) | ${localBad} |`,
    `| URL errors — GitHub Pages (${live ? files.size : 0} HEAD) | ${liveBad === null ? "not run (use --live)" : liveBad} |`,
    `| Browser duration sample | ${browserRows.length} files, max diff ${Math.max(0, ...browserRows.filter((r) => r.browser !== null).map((r) => Math.abs(r.browser! - r.parsed))).toFixed(3)} s |`,
    "",
    `## Source slow files that are not slower (${notSlower.length}) — handled in the UI`,
    "",
    ...(notSlower.length ? notSlower.map((x) => `- ${x}`) : ["None."]),
    "",
    `## Failures (${failures.length})`,
    "",
    ...(failures.length ? failures.slice(0, 200).map((f) => `- ${f}`) : ["None."]),
    "",
  ].join("\n");
  mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  writeFileSync(path.join(ROOT, "reports", "listening-check.md"), report);
  console.log(report);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

await main();
