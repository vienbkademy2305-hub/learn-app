/**
 * Supabase Edge Function `grade-writing` (docs/EN_WRITING_GRADER_PLAN.md) — the only place that holds GEMINI_API_KEY.
 *
 *   POST /functions/v1/grade-writing  { slug, kind, lesson, prompt_vi, prompt_en?, words?, text, syllabus? }
 *     → { id, result, model, created_at }
 *
 * Only signed-in accounts listed in GRADER_ALLOWED_EMAILS, at most GRADER_DAILY_LIMIT gradings per account per
 * UTC day (default 20). Results are stored in `writing_grades` (supabase/writing-grades.sql); the browser reads
 * its own rows directly (RLS).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { DEFAULT_MODELS, grade, GeminiError, type GradeInput, type HomeworkKind } from "./grader.ts";

const env = (k: string) => Deno.env.get(k);
const SUPABASE_URL = env("SUPABASE_URL")!;
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = env("GEMINI_API_KEY") ?? "";
const MODELS = (env("GRADER_MODELS") ?? DEFAULT_MODELS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const DAILY_LIMIT = Number(env("GRADER_DAILY_LIMIT") ?? 20);
const ALLOWED = new Set((env("GRADER_ALLOWED_EMAILS") ?? env("TTS_ALLOWED_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
const ORIGINS = (env("GRADER_ALLOWED_ORIGINS") ?? env("TTS_ALLOWED_ORIGINS") ?? "https://vienbkademy2305-hub.github.io,http://localhost:3000").split(",").map((s) => s.trim());
const KINDS: HomeworkKind[] = ["paragraph", "task1", "task2", "speaking"];
const MAX_TEXT = 8000;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) ? origin : ORIGINS[0]!;
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "content-type": "application/json" } });

const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function parseInput(b: Record<string, unknown>): (GradeInput & { slug: string }) | null {
  const lesson = (b.lesson ?? {}) as Record<string, unknown>;
  const kind = KINDS.includes(b.kind as HomeworkKind) ? (b.kind as HomeworkKind) : "paragraph";
  const text = s(b.text, MAX_TEXT + 1);
  const words = b.words as { min?: unknown; max?: unknown } | undefined;
  const input = {
    slug: s(b.slug, 120),
    kind,
    lesson: { number: Math.trunc(Number(lesson.number)) || 0, title: s(lesson.title, 200), grammar: s(lesson.grammar, 300) || null },
    prompt_vi: s(b.prompt_vi, 2000),
    prompt_en: s(b.prompt_en, 2000) || undefined,
    words: words && Number(words.min) > 0 ? { min: Number(words.min), max: Number(words.max) } : undefined,
    text,
    syllabus: (Array.isArray(b.syllabus) ? b.syllabus : [])
      .slice(0, 100)
      .map((x: { n?: unknown; grammar?: unknown }) => ({ n: Math.trunc(Number(x?.n)), grammar: s(x?.grammar, 200) }))
      .filter((x) => x.n > 0 && x.grammar),
  };
  return input.slug && input.prompt_vi && input.lesson.number > 0 && text.trim() ? input : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });
  try {
    if (!API_KEY) return json(req, 503, { error: "not_configured" });

    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authErr } = token ? await admin.auth.getUser(token) : { data: null, error: true };
    const user = authErr ? null : auth?.user;
    if (!user) return json(req, 401, { error: "sign_in_required" });
    if (!user.email || !ALLOWED.has(user.email.toLowerCase())) return json(req, 403, { error: "not_allowed" });

    const input = parseInput((await req.json().catch(() => ({}))) as Record<string, unknown>);
    if (!input) return json(req, 400, { error: "bad_request" });
    if (input.text.length > MAX_TEXT) return json(req, 400, { error: "text_too_long", max: MAX_TEXT });

    const today = new Date().toISOString().slice(0, 10);
    const { count, error: cErr } = await admin
      .from("writing_grades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);
    if (cErr) throw cErr;
    if ((count ?? 0) >= DAILY_LIMIT) return json(req, 429, { error: "daily_limit", limit: DAILY_LIMIT });

    const { slug, ...gradeInput } = input;
    const { result, model } = await grade(gradeInput, MODELS, API_KEY);
    const { data: row, error: insErr } = await admin
      .from("writing_grades")
      .insert({ user_id: user.id, lesson: slug, kind: input.kind, prompt: input.prompt_vi, text: input.text, result, model })
      .select("id, created_at")
      .single();
    if (insErr) throw insErr;
    return json(req, 200, { id: row.id, result, model, created_at: row.created_at });
  } catch (e) {
    console.error(e);
    if (e instanceof GeminiError && e.status === 429) return json(req, 429, { error: "model_busy" });
    return json(req, 502, { error: "grading_failed", detail: String((e as Error).message ?? e).slice(0, 300) });
  }
});
