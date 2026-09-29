/**
 * `pnpm en:research` — look up IPA and CEFR for every lexicon entry (skill english-content, step 3 RESEARCH).
 *  - Wiktionary (CC BY-SA 4.0, usage fact): IPA UK/US from the English Pronunciation section.
 *  - Oxford Learner's Dictionaries (copyrighted, usage fact): Oxford 3000/5000 CEFR level + IPA UK/US.
 * Only short facts are read; nothing else is stored. Responses are cached in .data/research-cache/
 * so re-runs do not hit the sites again. Writes the comparison to .data/research/en-lexicon.json;
 * `--apply` then updates data/en/lexicon (see applyResearch).
 */
import { setDefaultResultOrder } from "node:dns";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnglish, type LexEntry } from "../importers/en/load";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".data", "research-cache");
const OUT = path.join(ROOT, ".data", "research", "en-lexicon.json");
const UA = "learn-app-content-check/0.1 (personal study site; contact tungvt.iist@gmail.com)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// On this machine IPv6 routes to the dictionary sites fail while IPv4 works.
setDefaultResultOrder("ipv4first");

async function cached(key: string, url: string, ua = UA): Promise<string | null> {
  const file = path.join(CACHE, `${key.replace(/[^a-z0-9._-]/gi, "_")}.txt`);
  if (existsSync(file)) {
    const t = readFileSync(file, "utf8");
    return t === "\u0000404" ? null : t;
  }
  await sleep(400);
  const res = await fetch(url, { headers: { "user-agent": ua }, redirect: "follow" });
  const body = res.ok ? await res.text() : null;
  if (res.ok || res.status === 404) writeFileSync(file, body ?? "\u0000404", "utf8");
  else throw new Error(`${url} → HTTP ${res.status}`);
  // Oxford "direct" search redirects: remember the final URL for the report
  if (body && res.url !== url) writeFileSync(`${file}.url`, res.url, "utf8");
  return body;
}

// ── Wiktionary ────────────────────────────────────────────────────────────────
const UK_LABELS = /^(UK|RP|SSB|British|Received Pronunciation|England|Southern England)$/i;
const US_LABELS = /^(US|GA|GenAm|General American|American)$/i;

export function wiktionaryIpa(wikitext: string): { uk: string[]; us: string[]; general: string[] } {
  const english = wikitext.split(/^==English==\s*$/m)[1]?.split(/^==[^=].*==\s*$/m)[0] ?? "";
  const pron = english.match(/^===+Pronunciation( \d+)?===+\s*$([\s\S]*?)(?=^===)/m)?.[2] ?? "";
  const out = { uk: [] as string[], us: [] as string[], general: [] as string[] };
  for (const line of pron.split("\n")) {
    for (const m of line.matchAll(/\{\{IPA\|en\|([^}]*)\}\}/g)) {
      const parts = m[1]!.split("|");
      const ipas = parts.filter((p) => /^[/[]/.test(p) && p.startsWith("/"));
      const aParam = parts.find((p) => p.startsWith("a="))?.slice(2) ?? "";
      const lineLabels = [...line.matchAll(/\{\{(?:a|accent)\|en\|([^}]*)\}\}/g)].flatMap((x) => x[1]!.split("|"));
      const labels = [...aParam.split(","), ...lineLabels].map((s) => s.trim()).filter(Boolean);
      const bucket = labels.some((l) => UK_LABELS.test(l)) ? out.uk : labels.some((l) => US_LABELS.test(l)) ? out.us : out.general;
      bucket.push(...ipas);
    }
  }
  return out;
}

// ── Oxford Learner's ──────────────────────────────────────────────────────────
const OX_POS: Record<string, string[]> = {
  n: ["noun"], v: ["verb"], adj: ["adjective"], adv: ["adverb"], prep: ["preposition"], conj: ["conjunction"], pron: ["pronoun"],
  det: ["determiner", "adjective"], num: ["number", "ordinal number", "adjective", "noun"], "phr-v": ["phrasal verb"],
};

export function oxfordEntry(html: string): { headword: string; pos: string | null; cefr: string | null; uk: string | null; us: string | null } {
  const top = html.split('<div class="entry"')[1]?.split('<span class="sensetop"')[0] ?? html.slice(0, 30000);
  const webtop = top.split(/<ol class="sense|<span class="def"/)[0] ?? top;
  const headword = webtop.match(/class="headword"[^>]*>([^<]+)</)?.[1]?.trim() ?? "";
  const pos = webtop.match(/<span class="pos"[^>]*>([^<]+)</)?.[1]?.trim() ?? null;
  const cefr = webtop.match(/list=ox[35]000&amp;level=(a1|a2|b1|b2|c1)/)?.[1]?.toUpperCase() ?? null;
  const uk = webtop.match(/class="phons_br"[\s\S]*?<span class="phon">([^<]+)</)?.[1] ?? null;
  const us = webtop.match(/class="phons_n_am"[\s\S]*?<span class="phon">([^<]+)</)?.[1] ?? null;
  return { headword, pos, cefr, uk, us };
}

async function oxford(e: LexEntry) {
  const q = e.headword.toLowerCase().replace(/'/g, "");
  const slug = q.replace(/\s+/g, "-");
  const want = OX_POS[e.pos];
  const tried: string[] = [];
  const candidates = [`${slug}`, `${slug}_1`, `${slug}_2`, `${slug}_3`];
  for (const c of candidates) {
    const url = `https://www.oxfordlearnersdictionaries.com/definition/english/${c}`;
    const html = await cached(`ox-${c}`, url, "Mozilla/5.0");
    if (!html) continue;
    const entry = oxfordEntry(html);
    tried.push(`${c}:${entry.pos}`);
    if (entry.headword.toLowerCase().replace(/'/g, "") !== q) continue;
    if (!want || (entry.pos && want.includes(entry.pos))) return { ...entry, url, tried };
  }
  return { headword: null, pos: null, cefr: null, uk: null, us: null, url: null, tried };
}

/** Compare IPA ignoring syllable dots, slashes, spaces and ɡ/g, r-colouring spelled two ways. */
export const ipaKey = (s: string | null | undefined) =>
  (s ?? "").replace(/[/.\s‿()]/g, "").replace(/ɡ/g, "g").replace(/ɚ/g, "ər").replace(/ɝ/g, "ɜr").replace(/t̬/g, "t").replace(/ˑ/g, "");

export interface ResearchRow {
  id: string;
  headword: string;
  pos: string;
  current: { uk: string | null; us: string | null; cefr: string | null };
  wiktionary: { uk: string[]; us: string[]; general: string[]; url: string };
  oxford: { cefr: string | null; uk: string | null; us: string | null; url: string | null; tried: string[] };
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(path.dirname(OUT), { recursive: true });
  const data = loadEnglish();
  const rows: ResearchRow[] = [];
  let i = 0;
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const lexicon = only ? data.lexicon.filter((e) => only.includes(e.id)) : data.lexicon;
  for (const e of lexicon) {
    i++;
    const title = e.headword.replace(/\s+/g, "_");
    const wurl = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
    const wjson = await cached(`wk-${title}`, wurl);
    const wikitext = wjson ? ((JSON.parse(wjson) as { parse?: { wikitext?: string } }).parse?.wikitext ?? "") : "";
    const ox = await oxford(e);
    rows.push({
      id: e.id,
      headword: e.headword,
      pos: e.pos,
      current: { uk: e.ipa?.uk ?? null, us: e.ipa?.us ?? null, cefr: e.cefr ?? null },
      wiktionary: { ...wiktionaryIpa(wikitext), url: `https://en.wiktionary.org/wiki/${encodeURIComponent(title)}` },
      oxford: { cefr: ox.cefr, uk: ox.uk, us: ox.us, url: ox.url, tried: ox.tried },
    });
    if (i % 25 === 0) console.log(`${i}/${lexicon.length}`);
  }
  if (only) return console.log(JSON.stringify(rows, null, 1));
  writeFileSync(OUT, JSON.stringify(rows, null, 1));
  const cefr = rows.filter((r) => r.oxford.cefr).length;
  const wk = rows.filter((r) => r.wiktionary.uk.length + r.wiktionary.us.length + r.wiktionary.general.length > 0).length;
  console.log(`${rows.length} mục · Oxford CEFR: ${cefr} · Wiktionary IPA: ${wk} → ${path.relative(ROOT, OUT)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await main();
