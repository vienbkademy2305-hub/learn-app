/**
 * English audio (docs/EN_AUDIO_PLAN.md): synthesises every English text the app reads aloud with Kokoro-82M
 * (Apache-2.0, runs locally) into MP3 files under public/assets/en-audio/, plus a manifest the UI looks up by text.
 *   pnpm en:audio                 all lessons, tests and the word index
 *   pnpm en:audio --lessons 27,39 only these lessons (for a listening check)
 *   pnpm en:audio --dry           list what would be generated
 * Files are named by a hash of voice + speed + text, so re-running only creates what changed.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { setDefaultResultOrder } from "node:dns";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setDefaultAutoSelectFamily } from "node:net";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { KokoroTTS } from "kokoro-js";
import { DEFAULT_ROOT, loadEnglish } from "../importers/en/load";

// Same as en-research: IPv6 routes fail on this machine (model download from Hugging Face).
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "assets", "en-audio");
const MANIFEST = path.join(OUT, "manifest.json");
const SLOW = 0.75;
const RATE = 24000;

/** British voices chosen by the user (2026-09-29): female Emma / Isabella, male George / Lewis. */
const VOICES = { female: ["bf_emma", "bf_isabella"], male: ["bm_george", "bm_lewis"] } as const;
const WORD_VOICE = "bf_emma";
const MONOLOGUE_VOICE = "bm_george";
const FEMALE = /^(woman|girl|mother|mum|anna|lan|mai|linh|hoa|sarah|emma|lisa|linda|jane|she)$/i;
const MALE = /^(man|boy|father|dad|tom|nam|duc|khoa|minh|john|david|peter|james|he)$/i;
const SPEAKER_LINE = /^([A-Z][A-Za-z .'-]{0,20}):\s*(.+)$/; // same rule as src/features/en/speech.tsx

type Clip = { voice: string; text: string };
type Job = { key: string; clips: Clip[]; speed: number };
type Manifest = { version: 1; items: Record<string, { n: string; s?: string }> };

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = (() => {
  const i = args.indexOf("--lessons");
  return i >= 0 ? new Set(args[i + 1]!.split(",").map(Number)) : null;
})();

/** Gives every speaker of one dialogue its own voice: known gender first, the others alternate. */
function castVoices(speakers: string[]): Map<string, string> {
  const cast = new Map<string, string>();
  const used = { female: 0, male: 0 };
  const take = (g: "female" | "male") => VOICES[g][used[g]++ % VOICES[g].length]!;
  for (const s of speakers) if (FEMALE.test(s)) cast.set(s, take("female"));
  for (const s of speakers) if (MALE.test(s)) cast.set(s, take("male"));
  let next: "female" | "male" = used.female <= used.male ? "female" : "male";
  for (const s of speakers)
    if (!cast.has(s)) {
      cast.set(s, take(next));
      next = next === "female" ? "male" : "female";
    }
  return cast;
}

function dialogueClips(text: string, defaultVoice: string): Clip[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const turns = lines.map((l) => SPEAKER_LINE.exec(l));
  if (lines.length < 2 || turns.some((m) => !m) || new Set(turns.map((m) => m![1])).size < 2)
    return [{ voice: defaultVoice, text }];
  const cast = castVoices([...new Set(turns.map((m) => m![1]!))]);
  return turns.map((m) => ({ voice: cast.get(m![1]!)!, text: m![2]! }));
}

/** Reads digits one by one in long numbers (phone numbers) and spells out a few symbols. */
function normalise(text: string): string {
  return text
    .replace(/\b\d{5,}\b/g, (d) => d.split("").join(" "))
    .replace(/\s*___+\s*/g, " … ")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Kokoro handles ~500 phonemes per call: split long texts into sentences, then into chunks under ~220 chars. */
function chunks(text: string): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences.map((x) => x.trim()).filter(Boolean)) {
    if (cur && (cur + " " + s).length > 220) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

const fileName = (clips: Clip[], speed: number) =>
  createHash("sha1").update(JSON.stringify([clips, speed])).digest("hex").slice(0, 16) + ".mp3";

function collectJobs(): Job[] {
  const data = loadEnglish(DEFAULT_ROOT) as any;
  const lessons = (data.lessons as any[]).filter((l) => !only || only.has(l.number));
  const lexicon = new Map((data.lexicon as any[]).map((e) => [e.id, e]));
  const sentences = new Map((data.sentences as any[]).map((s) => [s.id, s]));
  const jobs = new Map<string, Job[]>();
  const add = (key: string, clips: Clip[], slow: boolean) => {
    if (!key.trim() || jobs.has(key)) return;
    const list: Job[] = [{ key, clips, speed: 1 }];
    if (slow) list.push({ key, clips, speed: SLOW });
    jobs.set(key, list);
  };
  const word = (e: any) => {
    add(e.headword, [{ voice: WORD_VOICE, text: e.headword }], true);
    for (const c of e.collocations ?? []) add(c, [{ voice: WORD_VOICE, text: c }], false);
  };
  const exercises = (items: any[]) => {
    for (const x of items) {
      if (x.audio_text) add(x.audio_text, dialogueClips(x.audio_text, MONOLOGUE_VOICE), true);
      if (x.kind === "dictation" && x.text) add(x.text, [{ voice: MONOLOGUE_VOICE, text: x.text }], true);
    }
  };
  for (const l of lessons)
    for (const st of l.steps) {
      if (st.type === "vocabulary") for (const id of st.items) lexicon.get(id) && word(lexicon.get(id));
      if (st.type === "examples") for (const id of st.items) {
        const s = sentences.get(id);
        if (s) add(s.text, [{ voice: WORD_VOICE, text: s.text }], true);
      }
      if (st.type === "pronunciation") for (const n of st.notes ?? []) n.word && lexicon.get(n.word) && word(lexicon.get(n.word));
      if (st.type === "skill") for (const p of st.phrases ?? []) add(p.en, [{ voice: WORD_VOICE, text: p.en }], false);
      if (st.type === "dialogue") {
        const cast = castVoices([...new Set<string>(st.lines.map((ln: any) => ln.speaker))]);
        // A / B carry no gender: A reads with a female voice, B with a male one.
        if (cast.has("A")) cast.set("A", VOICES.female[0]);
        if (cast.has("B")) cast.set("B", VOICES.male[0]);
        for (const ln of st.lines) add(ln.text, [{ voice: cast.get(ln.speaker)!, text: ln.text }], false);
      }
      if (st.type === "exercises") exercises(st.items);
    }
  if (!only) {
    for (const e of data.lexicon) word(e);
    for (const s of data.sentences) add(s.text, [{ voice: WORD_VOICE, text: s.text }], true);
    for (const t of data.tests ?? []) for (const sec of t.sections) exercises(sec.exercises);
  }
  return [...jobs.values()].flat();
}

function encodeMp3(samples: Float32Array, file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath as unknown as string, ["-loglevel", "error", "-y", "-f", "f32le", "-ar", String(RATE), "-ac", "1", "-i", "pipe:0", "-b:a", "40k", file]);
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code} for ${file}`))));
    ff.stdin.end(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
  });
}

const silence = (seconds: number) => new Float32Array(Math.round(RATE * seconds));
function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function main() {
  const jobs = collectJobs();
  mkdirSync(OUT, { recursive: true });
  const manifest: Manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { version: 1, items: {} };
  const todo = jobs.filter((j) => !existsSync(path.join(OUT, fileName(j.clips, j.speed))));
  console.log(`${jobs.length} files for ${new Set(jobs.map((j) => j.key)).size} texts; ${todo.length} to create`);
  if (dry) return;
  const tts = todo.length ? await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" }) : null;
  const started = Date.now();
  let done = 0;
  for (const job of jobs) {
    const name = fileName(job.clips, job.speed);
    const file = path.join(OUT, name);
    if (!existsSync(file)) {
      const parts: Float32Array[] = [];
      for (const [i, clip] of job.clips.entries()) {
        if (i > 0) parts.push(silence(0.45));
        for (const [k, piece] of chunks(normalise(clip.text)).entries()) {
          if (k > 0) parts.push(silence(0.2));
          const audio = await tts!.generate(piece, { voice: clip.voice as any, speed: job.speed });
          parts.push(audio.audio as Float32Array);
        }
      }
      await encodeMp3(concat(parts), file);
      done++;
      if (done % 25 === 0 || done === todo.length) {
        const per = (Date.now() - started) / done;
        console.log(`${done}/${todo.length} · ~${Math.round((per * (todo.length - done)) / 60000)} min left`);
      }
    }
    const entry = (manifest.items[job.key] ??= { n: name });
    if (job.speed === 1) entry.n = name;
    else entry.s = name;
    if (done % 25 === 0) writeFileSync(MANIFEST, JSON.stringify(manifest));
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest));
  console.log(`manifest: ${Object.keys(manifest.items).length} texts → ${path.relative(ROOT, MANIFEST)}`);
}

await main();
