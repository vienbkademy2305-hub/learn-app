// Write simple English definitions (F3, docs/NANG_CAP_4_VIEC_PLAN.md) into data/en/lexicon.
// Input: TSV files "id<TAB>definition". Fills definition_en only where it is missing (never overwrites)
// and records { source: ai-draft, field: definition_en } in provenance.
// --force replaces an existing definition (to fix one). Usage: node scripts/en-apply-definitions.mjs <defs.tsv> [more.tsv …] [--dry] [--force]
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const defs = new Map();
for (const f of args.filter((a) => !a.startsWith("--")))
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [id, def] = line.split("\t");
    if (!id || !def) throw new Error(`bad line in ${f}: ${line}`);
    defs.set(id.trim(), def.trim());
  }

const dir = "data/en/lexicon";
const problems = [];
let written = 0;
const found = new Set();
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
  const p = path.join(dir, file);
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  - id: (\S+)\s*$/);
    if (!m || !defs.has(m[1])) continue;
    const id = m[1];
    found.add(id);
    let end = lines.findIndex((l, k) => k > i && /^  - id: /.test(l));
    if (end < 0) end = lines.length;
    const entry = lines.slice(i, end);
    const existing = entry.findIndex((l) => /^    definition_en: (?!null)/.test(l));
    if (existing >= 0 && !force) continue;
    const head = (entry.find((l) => l.startsWith("    headword:")) ?? "").replace("    headword:", "").trim().replace(/^"|"$/g, "");
    const def = defs.get(id);
    const words = def.split(/\s+/).length;
    if (words > 15) problems.push(`${id}: ${words} words`);
    const stem = head.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const lower = ` ${def.toLowerCase()} `;
    if (stem.length && stem.every((w) => lower.includes(w))) problems.push(`${id}: contains the headword "${head}"`);
    const out = [...entry];
    if (existing >= 0) {
      out[existing] = `    definition_en: ${JSON.stringify(def)}`;
      lines.splice(i, end - i, ...out);
      changed = true;
      written++;
      continue;
    }
    const nullIdx = out.findIndex((l) => /^    definition_en: null\s*$/.test(l));
    const quoted = `    definition_en: ${JSON.stringify(def)}`;
    if (nullIdx >= 0) out[nullIdx] = quoted;
    else out.splice(out.findIndex((l) => l.startsWith("    pos:")) + 1, 0, quoted);
    const prov = out.findIndex((l) => /^    provenance:/.test(l));
    const tag = "      - { source: ai-draft, field: definition_en }";
    if (prov < 0) out.splice(out.findIndex((l) => l.startsWith("    status:")), 0, "    provenance:", tag);
    else if (/\[\s*\]\s*$/.test(out[prov])) out.splice(prov, 1, "    provenance:", tag);
    else out.splice(prov + 1, 0, tag);
    lines.splice(i, end - i, ...out);
    changed = true;
    written++;
  }
  if (changed && !dry) fs.writeFileSync(p, lines.join("\n"));
}
const missing = [...defs.keys()].filter((id) => !found.has(id));
console.log(`${dry ? "[dry] " : ""}${written} definitions written; ${missing.length} ids not found${missing.length ? ": " + missing.join(", ") : ""}`);
if (problems.length) console.log("CHECK:\n  " + problems.join("\n  "));
