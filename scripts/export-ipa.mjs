// Từ điển IPA cho bảng chấm phát âm (docs/ELSA_PRONUNCIATION_PLAN.md): từ → IPA, lấy từ .data/content/en.json.
//   node scripts/export-ipa.mjs   → public/assets/en-ipa.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const en = JSON.parse(readFileSync(".data/content/en.json", "utf8"));
const out = {};
for (const w of Object.values(en.words)) {
  const key = w.headword.toLowerCase();
  const ipa = w.ipa?.uk ?? w.ipa?.us;
  if (/^[a-z]+$/.test(key) && ipa && !out[key]) out[key] = ipa;
}
// Từ hay bị nhầm với nhau (người Việt hay lẫn các âm này) — bổ sung để so được từng âm khi máy nghe thành từ khác.
const EXTRA = {
  think: "/θɪŋk/", sink: "/sɪŋk/", thing: "/θɪŋ/", sing: "/sɪŋ/", three: "/θriː/", tree: "/triː/", free: "/friː/", thank: "/θæŋk/", tank: "/tæŋk/",
  thin: "/θɪn/", tin: "/tɪn/", sin: "/sɪn/", this: "/ðɪs/", that: "/ðæt/", they: "/ðeɪ/", day: "/deɪ/", then: "/ðen/", den: "/den/",
  ship: "/ʃɪp/", sheep: "/ʃiːp/", sip: "/sɪp/", chip: "/tʃɪp/", cheap: "/tʃiːp/", sit: "/sɪt/", seat: "/siːt/", bit: "/bɪt/", beat: "/biːt/",
  full: "/fʊl/", fool: "/fuːl/", pull: "/pʊl/", pool: "/puːl/", hat: "/hæt/", hot: "/hɒt/", cut: "/kʌt/", cat: "/kæt/", cot: "/kɒt/",
  bad: "/bæd/", bed: "/bed/", bat: "/bæt/", bet: "/bet/", pen: "/pen/", pan: "/pæn/", light: "/laɪt/", right: "/raɪt/", long: "/lɒŋ/", wrong: "/rɒŋ/",
  very: "/ˈver.i/", berry: "/ˈber.i/", vest: "/vest/", best: "/best/", west: "/west/", wet: "/wet/", rice: "/raɪs/", lice: "/laɪs/",
  mouse: "/maʊs/", house: "/haʊs/", live: "/lɪv/", leave: "/liːv/", bird: "/bɜːd/", bored: "/bɔːd/", bought: "/bɔːt/", boat: "/bəʊt/",
};
for (const [k, v] of Object.entries(EXTRA)) if (!out[k]) out[k] = v;
mkdirSync("public/assets", { recursive: true });
writeFileSync("public/assets/en-ipa.json", JSON.stringify(out));
console.log(`${Object.keys(out).length} từ → public/assets/en-ipa.json`);
