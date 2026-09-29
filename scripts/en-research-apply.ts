/**
 * `pnpm en:research:apply [--dry]` — writes the facts found by `pnpm en:research` into data/en/lexicon:
 *  - CEFR from Oxford 3000/5000 (source oxford-ld). Not listed → stays null.
 *  - IPA: never overwritten. UK/US values that match Oxford or Wiktionary up to notation get a provenance
 *    line `ipa.uk` / `ipa.us` (source, ref URL, date); when both match, the ai-draft `ipa` line is removed.
 *    Mismatches are listed in the report for a human decision.
 * The YAML is edited in place through the Document API so comments and layout survive.
 * Report: .data/research/en-lexicon-report.md
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML, { isMap, isSeq, type Document, type YAMLMap } from "yaml";
import { ipaKey, type ResearchRow } from "./en-research";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEX = path.join(ROOT, "data", "en", "lexicon");
const rows = new Map((JSON.parse(readFileSync(path.join(ROOT, ".data", "research", "en-lexicon.json"), "utf8")) as ResearchRow[]).map((r) => [r.id, r]));
const dry = process.argv.includes("--dry");
const today = new Date().toISOString().slice(0, 10);

/** Length marks dropped (Wiktionary writes US vowels without ː), ɛ = e, r after a vowel folded into it. */
const loose = (x: string | null | undefined) =>
  ipaKey((x ?? "").replace(/\(r\)/g, "").replace(/ˌ/g, ""))
    .replace(/ə(?=[lnm](?![aeiouæɑɒɔəɜɪʊʌ]))/g, "")
    .replace(/ː/g, "")
    .replace(/ɛ/g, "e")
    .replace(/([ɜəɑɔ])r/g, "$1");
/** American English: the cot–caught vowels count as one (cough /kɑf/ = /kɔf/). */
const looseUs = (x: string | null | undefined) => loose(x).replace(/ɔ/g, "ɑ");
/** Oxford writes American English with British symbols: map the usual ones back. */
const oxUs = (x: string) => x.replace(/əʊ/g, "oʊ").replace(/(?<!ɑ)ɒ/g, "ɑː");
const wkNorm = (s: string) => ipaKey(s.replace(/ɹ/g, "r").replace(/t͡ʃ/g, "tʃ").replace(/d͡ʒ/g, "dʒ").replace(/ɫ/g, "l"));

const report = { cefr: [] as string[], ipaConfirmed: 0, unresolved: [] as string[], noCefr: [] as string[] };

function setProvenance(doc: Document, entry: YAMLMap, field: string, prov: Record<string, string>) {
  const found: unknown = entry.get("provenance", true);
  let seq: YAML.YAMLSeq;
  if (isSeq(found)) seq = found;
  else {
    seq = doc.createNode([]) as YAML.YAMLSeq;
    entry.set("provenance", seq);
  }
  seq.items = seq.items.filter((it) => !(isMap(it) && it.get("field") === field && (it.get("source") === "ai-draft" || it.get("source") === prov.source)));
  const node = doc.createNode({ ...prov, field });
  node.flow = true;
  seq.items.push(node);
}

for (const file of readdirSync(LEX).filter((f) => f.endsWith(".yaml"))) {
  const full = path.join(LEX, file);
  const doc = YAML.parseDocument(readFileSync(full, "utf8"));
  const entries = doc.get("entries") as YAML.YAMLSeq;
  let changed = false;
  for (const node of entries.items) {
    if (!isMap(node)) continue;
    const id = String(node.get("id"));
    const r = rows.get(id);
    if (!r) continue;
    const ox = r.oxford;

    if (ox.cefr) {
      if (node.get("cefr") !== ox.cefr) {
        node.set("cefr", ox.cefr);
        report.cefr.push(`${r.headword} (${r.pos}) → ${ox.cefr}`);
      }
      setProvenance(doc, node, "cefr", { source: "oxford-ld", ref: ox.url ?? "", checked: today });
      changed = true;
    } else report.noCefr.push(`${r.headword} (${r.pos})`);

    // IPA is never overwritten: dictionaries differ in notation (Oxford writes US /kəʊld/, /tʃeə(r)/; we follow
    // Cambridge-style /koʊld/, /tʃeə/). A value is marked checked when a source agrees up to notation;
    // real mismatches go to the report for a human decision.
    const w = r.wiktionary;
    const wkUk = [...w.uk, ...w.general].map(wkNorm);
    const wkUs = [...w.us, ...w.general].map(wkNorm);
    const checkedBy = (k: "uk" | "us"): string | null => {
      const norm = k === "us" ? looseUs : loose;
      const cur = norm(r.current[k]);
      if (!cur) return null;
      if (k === "uk" && ox.uk && loose(ox.uk) === cur) return "oxford-ld";
      if (k === "us" && ox.us && norm(oxUs(ox.us)) === cur) return "oxford-ld";
      if ((k === "uk" ? wkUk : wkUs).some((x) => norm(x) === cur)) return "wiktionary";
      return null;
    };
    const by = { uk: checkedBy("uk"), us: checkedBy("us") };
    for (const k of ["uk", "us"] as const) {
      if (by[k]) {
        report.ipaConfirmed++;
        setProvenance(doc, node, `ipa.${k}`, { source: by[k]!, ref: by[k] === "oxford-ld" ? (ox.url ?? "") : w.url, checked: today });
        changed = true;
      } else if (r.current[k]) {
        const ref = k === "uk" ? [ox.uk, ...w.uk, ...w.general] : [ox.us && `Oxford ${ox.us}`, ...w.us, ...w.general];
        report.unresolved.push(`${r.headword} (${r.pos}) ${k.toUpperCase()}: hiện ${r.current[k]}; nguồn: ${[...new Set(ref.filter(Boolean))].join(", ") || "không có mục"}`);
      }
    }
    if (by.uk && by.us) {
      const seq = node.get("provenance", true) as unknown as YAML.YAMLSeq;
      seq.items = seq.items.filter((it) => !(isMap(it) && it.get("field") === "ipa" && it.get("source") === "ai-draft"));
    }
  }
  if (changed && !dry) writeFileSync(full, doc.toString({ lineWidth: 0, flowCollectionPadding: true }), "utf8");
}

const md = [
  `# Đối chiếu IPA / CEFR — ${today}`,
  "",
  `Nguồn: Oxford Learner's Dictionaries (CEFR theo Oxford 3000/5000 + IPA, usage fact) và Wiktionary (IPA, CC BY-SA). Chạy: \`pnpm en:research && pnpm en:research:apply\`.`,
  "",
  `- Gắn CEFR: ${report.cefr.length} từ; không có trong Oxford 3000/5000: ${report.noCefr.length}`,
  `- IPA khớp nguồn (đánh dấu đã kiểm tra): ${report.ipaConfirmed} giá trị — không tự thay giá trị nào`,
  `- IPA lệch nguồn / chưa có nguồn (giữ nguyên, cần người duyệt): ${report.unresolved.length}`,
  "",
  "## Chưa xác minh — UNRESOLVED",
  ...report.unresolved.map((s) => `- ${s}`),
  "",
  "## Không có cấp CEFR trong Oxford 3000/5000",
  report.noCefr.join(" · "),
  "",
].join("\n");
writeFileSync(path.join(ROOT, ".data", "research", "en-lexicon-report.md"), md, "utf8");
console.log(md.split("\n").slice(0, 9).join("\n"));
