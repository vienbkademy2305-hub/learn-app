/**
 * Lessons are editorial data (ARCHITECTURE §16, DATA_MAPPING §3.6).
 * - generateLessonDrafts(): writes draft YAML per sentence topic; never
 *   overwrites a file whose status is not "draft".
 * - loadLessons(): reads the YAML and links step items to canonical entities.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { CanonicalGraph } from "./graph";

/** Vietnamese titles for hsk-sentences-audio topics (19 values, REPO_AUDIT §7). */
export const TOPIC_TITLES_VI: Record<string, string> = {
  greetings: "Chào hỏi",
  identity: "Giới thiệu bản thân",
  family: "Gia đình",
  numbers: "Số đếm",
  time: "Thời gian",
  daily_actions: "Hoạt động hằng ngày",
  school_work: "Trường học và công việc",
  location: "Địa điểm và phương hướng",
  transport: "Đi lại",
  shopping: "Mua sắm",
  food: "Ăn uống",
  weather_state: "Thời tiết và trạng thái",
  questions: "Đặt câu hỏi",
  objects_misc: "Đồ vật",
  health_body: "Sức khỏe và cơ thể",
  sports_leisure: "Thể thao và giải trí",
  feelings: "Cảm xúc",
  nature: "Thiên nhiên",
  misc: "Tổng hợp",
};

export interface LessonFile {
  slug: string;
  status: string;
  source: string;
  hsk_level: string;
  title_vi: string;
  summary_vi: string | null;
  steps: Array<{ type: string; items: string[] }>;
}

const wordRef = (simplified: string, pinyinKey: string) => `word:${simplified}|${pinyinKey}`;
const sentenceRef = (source: string, recordId: string) => `sentence:${source}/${recordId}`;

export function generateLessonDrafts(g: CanonicalGraph, level: number, dir: string): { written: string[]; kept: string[] } {
  mkdirSync(dir, { recursive: true });
  const levelStr = String(level);

  // Sentences of this level from hsk-sentences-audio, in dataset order (by source id).
  const sentenceRecords = [...g.entitySources.values()]
    .filter((s) => s.entityType === "sentence" && s.sourceId === "hsk-sentences-audio" && s.role === "primary")
    .filter((s) => g.hskLevel("sentence", s.entityId) === levelStr)
    .sort((a, b) => a.sourceRecordId.localeCompare(b.sourceRecordId));
  const sentencesById = new Map([...g.sentences.values()].map((s) => [s.id, s]));
  const wordsById = new Map([...g.words.values()].map((w) => [w.id, w]));
  const audioOwners = new Set(g.audio.map((a) => a.ownerId));

  const topics = new Map<string, typeof sentenceRecords>();
  for (const rec of sentenceRecords) {
    const topic = sentencesById.get(rec.entityId)?.topic ?? "misc";
    if (!topics.has(topic)) topics.set(topic, []);
    topics.get(topic)!.push(rec);
  }

  const assignedWords = new Set<number>();
  const written: string[] = [];
  const kept: string[] = [];
  let index = 0;
  for (const [topic, recs] of topics) {
    index++;
    const slug = `hsk${level}-${String(index).padStart(2, "0")}-${topic.replace(/_/g, "-")}`;
    const file = path.join(dir, `${slug}.yaml`);
    if (existsSync(file)) {
      const current = YAML.parse(readFileSync(file, "utf8")) as LessonFile;
      if (current.status !== "draft") {
        kept.push(file);
        continue;
      }
    }

    const vocabulary: string[] = [];
    for (const rec of recs) {
      for (const t of g.tokens.filter((t) => t.sentenceId === rec.entityId && t.wordId !== null)) {
        const w = wordsById.get(t.wordId!);
        if (!w || !w.inCurriculum || assignedWords.has(w.id) || g.hskLevel("word", w.id) !== levelStr) continue;
        assignedWords.add(w.id);
        vocabulary.push(wordRef(w.simplified, w.pinyinKey));
      }
    }
    const examples = recs.map((r) => sentenceRef("hsk-sentences-audio", r.sourceRecordId));
    const listening = recs.filter((r) => audioOwners.has(r.entityId)).map((r) => sentenceRef("hsk-sentences-audio", r.sourceRecordId));

    const lesson: LessonFile = {
      slug,
      status: "draft",
      source: "derived",
      hsk_level: levelStr,
      title_vi: TOPIC_TITLES_VI[topic] ?? topic,
      summary_vi: null,
      steps: [
        { type: "vocabulary", items: vocabulary },
        { type: "examples", items: examples },
        { type: "listening", items: listening },
      ],
    };
    const header =
      "# BẢN NHÁP sinh tự động từ topic của hsk-sentences-audio (DATA_MAPPING.md §3.6).\n" +
      "# Đổi status khác \"draft\" sau khi biên tập để generator không ghi đè file này.\n";
    writeFileSync(file, header + YAML.stringify(lesson, { lineWidth: 0 }));
    written.push(file);
  }
  return { written, kept };
}

export function loadLessons(g: CanonicalGraph, dir: string): { lessons: number; items: number; unresolvedRefs: string[] } {
  const unresolvedRefs: string[] = [];
  let items = 0;
  if (!existsSync(dir)) return { lessons: 0, items, unresolvedRefs };

  const files = readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort();
  files.forEach((name, sort) => {
    const data = YAML.parse(readFileSync(path.join(dir, name), "utf8")) as LessonFile;
    const lessonId = g.nextId("lessons");
    g.lessons.push({
      id: lessonId,
      slug: data.slug,
      hskLevel: data.hsk_level,
      sort,
      titleVi: data.title_vi,
      summaryVi: data.summary_vi,
      status: data.status,
      // Only generated drafts exist in PHASE 1; hand-written lessons will get an "editorial" source.
      sourceId: "derived",
      sourceRecordId: `lessons/${name}`,
    });
    g.addSource("lesson", lessonId, "derived", `lessons/${name}`);
    g.setHsk("lesson", lessonId, data.hsk_level, "derived", true);

    data.steps.forEach((step, stepSort) => {
      const stepId = g.nextId("lesson_steps");
      g.lessonSteps.push({ id: stepId, lessonId, sort: stepSort, stepType: step.type, config: null });
      step.items.forEach((ref, itemSort) => {
        const resolved = resolveRef(g, ref);
        if (!resolved) {
          unresolvedRefs.push(`${name}: ${ref}`);
          return;
        }
        g.lessonStepItems.push({ stepId, sort: itemSort, ...resolved });
        items++;
      });
    });
  });
  for (const ref of unresolvedRefs) g.review("lesson", null, "unresolved_lesson_ref", { ref });
  return { lessons: files.length, items, unresolvedRefs };
}

function resolveRef(g: CanonicalGraph, ref: string): { entityType: string; entityId: number } | null {
  if (ref.startsWith("word:")) {
    const w = g.words.get(ref.slice("word:".length));
    return w ? { entityType: "word", entityId: w.id } : null;
  }
  if (ref.startsWith("sentence:")) {
    const [source, ...rest] = ref.slice("sentence:".length).split("/");
    const id = g.findBySource("sentence", source as never, rest.join("/"));
    return id ? { entityType: "sentence", entityId: id } : null;
  }
  return null;
}
