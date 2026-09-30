// Before `pnpm en:merge <bundle>`: in lexicon flow lists (meaning_vi, collocations), split items only at commas
// outside parentheses and quote items that contain commas/colons. Usage: node scripts/en-quote-lists.mjs <bundle.yaml>
import fs from "node:fs";
const f = process.argv[2];
const t = fs.readFileSync(f, "utf8").split("\n").map((line) => {
  const m = line.match(/^(\s+(?:meaning_vi|collocations): )\[(.*)\]$/);
  if (!m || m[2].includes('"')) return line;
  const items = []; let depth = 0, cur = "";
  for (const ch of m[2]) {
    if (ch === "(") depth++; if (ch === ")") depth--;
    if (ch === "," && depth === 0) { items.push(cur.trim()); cur = ""; } else cur += ch;
  }
  items.push(cur.trim());
  return m[1] + "[" + items.map((s) => (/[,:#]/.test(s) ? JSON.stringify(s) : s)).join(", ") + "]";
});
fs.writeFileSync(f, t.join("\n"));
