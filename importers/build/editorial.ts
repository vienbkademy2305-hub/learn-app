/**
 * Loads editorial Vietnamese content (ARCHITECTURE D4). Editorial files only
 * reference canonical entities by source record id plus the original text,
 * which is re-checked so a changed source sentence is never silently
 * paired with a stale translation.
 */
import { existsSync, readFileSync } from "node:fs";
import YAML from "yaml";
import { sentenceHash } from "../../src/domain/text";
import type { CanonicalGraph } from "./graph";

interface SentenceTranslationFile {
  source: string;
  default_status: string;
  sentences: Array<{ id: string; zh: string; vi: string; status?: string }>;
}

export function loadSentenceTranslations(g: CanonicalGraph, file: string, recordPrefix: string) {
  const result = { loaded: 0, missingSentence: [] as string[], textMismatch: [] as string[], duplicateIds: [] as string[] };
  if (!existsSync(file)) return result;

  const data = YAML.parse(readFileSync(file, "utf8")) as SentenceTranslationFile;
  const sentencesById = new Map([...g.sentences.values()].map((s) => [s.id, s]));
  const seen = new Set<string>();

  for (const entry of data.sentences) {
    if (seen.has(entry.id)) {
      result.duplicateIds.push(entry.id);
      continue;
    }
    seen.add(entry.id);

    const sentenceId = g.findBySource("sentence", "hsk-sentences-audio", entry.id);
    const sentence = sentenceId ? sentencesById.get(sentenceId) : undefined;
    if (!sentence) {
      result.missingSentence.push(entry.id);
      g.review("editorial", null, "editorial_sentence_missing", { id: entry.id, file: recordPrefix });
      continue;
    }
    if (sentenceHash(entry.zh) !== sentence.contentHash) {
      result.textMismatch.push(entry.id);
      g.review("sentence", sentence.id, "editorial_text_mismatch", { id: entry.id, editorial: entry.zh, source: sentence.simplified });
      continue;
    }
    g.translations.push({
      id: g.nextId("sentence_translations"),
      sentenceId: sentence.id,
      lang: "vi",
      text: entry.vi,
      status: entry.status ?? data.default_status,
      sourceId: "editorial",
      sourceRecordId: `${recordPrefix}#${entry.id}`,
    });
    result.loaded++;
  }
  return result;
}
