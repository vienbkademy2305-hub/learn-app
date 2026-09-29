/**
 * English lesson data tools (english-content skill).
 *   pnpm en:validate
 *   pnpm en:search <query> [--type lexicon|sentence|grammar|lesson|sound|source] [--status draft|reviewed|retired]
 *   pnpm en:stats
 */
import { AI_DRAFT, loadEnglish, searchEnglish, validateEnglish, type Hit } from "../importers/en/load";

const [command, ...args] = process.argv.slice(2);
const data = loadEnglish();

function option(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
}

if (command === "validate") {
  const { errors, warnings } = validateEnglish(data);
  for (const w of warnings) console.log(`  cảnh báo  ${w}`);
  for (const e of errors) console.log(`  LỖI      ${e}`);
  console.log(
    `\ndata/en: ${data.lessons.length} buổi, ${data.lexicon.length} từ, ${data.sentences.length} câu, ${data.grammar.length} điểm ngữ pháp, ${data.sources.length} nguồn`,
  );
  console.log(`${errors.length} lỗi, ${warnings.length} cảnh báo`);
  process.exit(errors.length ? 1 : 0);
} else if (command === "search") {
  const type = option("type") as Hit["type"] | undefined;
  const status = option("status");
  const query = args.join(" ");
  if (!query) {
    console.error("Cách dùng: pnpm en:search <từ khóa> [--type lexicon|sentence|grammar|lesson|sound|source] [--status draft|reviewed|retired]");
    process.exit(2);
  }
  const hits = searchEnglish(data, query).filter((h) => (!type || h.type === type) && (!status || h.status === status));
  for (const h of hits) console.log(`[${h.type}] ${h.id}${h.status ? ` (${h.status})` : ""}  ${h.text}\n    ${h.file}`);
  console.log(`\n${hits.length} kết quả cho "${query}"`);
} else if (command === "stats") {
  const byStatus = (items: Array<{ status?: string }>) => {
    const counts: Record<string, number> = {};
    for (const it of items) counts[it.status ?? "?"] = (counts[it.status ?? "?"] ?? 0) + 1;
    return Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ") || "0";
  };
  console.log(`Từ vựng:   ${data.lexicon.length} (${byStatus(data.lexicon)})`);
  console.log(`Câu:       ${data.sentences.length} (${byStatus(data.sentences)})`);
  console.log(`Ngữ pháp:  ${data.grammar.length} (${byStatus(data.grammar)})`);
  console.log(`Buổi học:  ${data.lessons.length} (${byStatus(data.lessons)})`);
  console.log(`Âm (IPA):  ${data.sounds.length} (${data.soundsMeta.status ?? "?"}), ${data.sounds.filter((s) => s.pairs?.length).length} âm có cặp từ tối thiểu`);
  const lex = data.lexicon.filter((e) => e.status !== "retired");
  const noIpa = lex.filter((e) => !e.ipa?.uk && !e.ipa?.us).length;
  const noCefr = lex.filter((e) => !e.cefr).length;
  const aiFields = [...lex, ...data.grammar].reduce((n, e) => n + (e.provenance ?? []).filter((p) => p.source === AI_DRAFT).length, 0);
  console.log(`\nCần research: ${noIpa} từ chưa có IPA, ${noCefr} từ chưa có CEFR, ${aiFields} trường ai-draft chưa đối chiếu nguồn`);
  console.log("\nTheo buổi:");
  for (const l of data.lessons) {
    const count = (t: string) => {
      const step = l.steps?.find((s) => s.type === t) as { items?: unknown[] } | undefined;
      return step?.items?.length ?? 0;
    };
    console.log(
      `  Buổi ${String(l.number).padStart(2)} ${l.title_vi.padEnd(28)} ${l.status.padEnd(8)} từ ${count("vocabulary")}, ngữ pháp ${count("grammar")}, câu ${count("examples")}, bài tập ${count("exercises")}`,
    );
  }
} else {
  console.error("Lệnh: validate | search <từ khóa> | stats");
  process.exit(2);
}
