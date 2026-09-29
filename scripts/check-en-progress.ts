/**
 * `tsx scripts/check-en-progress.ts` — real check of public.progress_en on the Supabase project in .env.local:
 * two throw-away users each write and read their own row, cannot read or overwrite the other's, and are deleted afterwards.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL!, PUB = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, SECRET = env.SUPABASE_SECRET_KEY!;
const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });
const stamp = Date.now();
const users = [`en-check-a-${stamp}@learn-app.local`, `en-check-b-${stamp}@learn-app.local`];
const pass = `Tmp-${stamp}-x9`;
const ids: string[] = [];
const results: string[] = [];
const ok = (cond: boolean, label: string) => results.push(`${cond ? "PASS" : "FAIL"} ${label}`);

try {
  for (const email of users) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true });
    if (error) throw error;
    ids.push(data.user.id);
  }
  const clients = await Promise.all(users.map(async (email) => {
    const c = createClient(URL_, PUB, { auth: { persistSession: false } });
    const { error } = await c.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return c;
  }));
  const [a, b] = clients as [typeof admin, typeof admin];
  const now = new Date().toISOString();
  const w1 = await a.from("progress_en").upsert({ user_id: ids[0], state: { steps: { "buoi-01": ["vocabulary"] } }, updated_at: now });
  ok(!w1.error, `A ghi dòng của mình ${w1.error?.message ?? ""}`);
  const r1 = await a.from("progress_en").select("state").eq("user_id", ids[0]).maybeSingle();
  ok(!r1.error && JSON.stringify(r1.data?.state).includes("buoi-01"), "A đọc lại được dòng của mình");
  const w2 = await a.from("progress_en").upsert({ user_id: ids[0], state: { steps: { "buoi-02": ["grammar"] } }, updated_at: new Date().toISOString() });
  ok(!w2.error, "A cập nhật (upsert lần 2) dòng của mình");
  const r2 = await b.from("progress_en").select("state").eq("user_id", ids[0]);
  ok(!r2.error && (r2.data ?? []).length === 0, "B KHÔNG đọc được dòng của A");
  const w3 = await b.from("progress_en").upsert({ user_id: ids[0], state: { hacked: true }, updated_at: now });
  ok(!!w3.error, `B KHÔNG ghi đè được dòng của A (${w3.error?.code ?? "không lỗi!"})`);
  const r3 = await admin.from("progress_en").select("state").eq("user_id", ids[0]).single();
  ok(JSON.stringify(r3.data?.state).includes("buoi-02") && !JSON.stringify(r3.data?.state).includes("hacked"), "Dữ liệu của A còn nguyên");
  const zh = await a.from("progress").select("user_id").limit(1);
  ok(!zh.error, "Bảng progress (tiếng Trung) vẫn truy cập bình thường");
} finally {
  for (const id of ids) await admin.auth.admin.deleteUser(id);
  const left = ids.length ? await admin.from("progress_en").select("user_id").in("user_id", ids) : { data: [] };
  ok((left.data ?? []).length === 0, `Đã xoá ${ids.length} tài khoản thử và dòng của họ`);
  console.log(results.join("\n"));
}
