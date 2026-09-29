/**
 * `tsx scripts/check-en-sync-browser.ts [baseUrl]` — end-to-end check of the English progress sync against the
 * real Supabase project (.env.local) and a running site (default http://localhost:3000): a throw-away account signs
 * in, does one English exercise, the row appears in progress_en, a fresh browser gets the progress back. The account is deleted after.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const domain = env.NEXT_PUBLIC_ACCOUNT_EMAIL_DOMAIN || "learn-app.local";
const username = `enchk${Date.now().toString().slice(-7)}`;
const password = `Tmp-${Date.now()}-x9`;
const results: string[] = [];
const ok = (c: boolean, l: string) => results.push(`${c ? "PASS" : "FAIL"} ${l}`);
let uid = "";
const browser = await chromium.launch();
try {
  const { data, error } = await admin.auth.admin.createUser({ email: `${username}@${domain}`, password, email_confirm: true });
  if (error) throw error;
  uid = data.user.id;

  const login = async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login/`, { waitUntil: "networkidle" });
    await page.locator("input").nth(0).fill(username);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "Đăng nhập" }).last().click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });
    return { ctx, page };
  };

  const { ctx, page } = await login();
  await page.goto(`${BASE}/en/lesson/buoi-02-ngoai-hinh-tinh-cach/exercises/`, { waitUntil: "networkidle" });
  const gap = page.locator("section").filter({ hasText: "Bài 1 · Điền từ" });
  for (const [i, w] of ["shy", "lazy", "curly", "patient", "outgoing", "hard-working"].entries()) await gap.locator("input").nth(i).fill(w);
  await gap.getByRole("button", { name: "Kiểm tra" }).click();
  await page.waitForTimeout(4000);
  const row = await admin.from("progress_en").select("state").eq("user_id", uid).maybeSingle();
  const saved = (row.data?.state as { exercises?: Record<string, { correct: number }> } | undefined)?.exercises?.["b02-x1"];
  ok(saved?.correct === 6, `điểm bài b02-x1 (6/6) đã lên bảng progress_en: ${JSON.stringify(saved ?? null)}`);
  await page.goto(`${BASE}/en/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  ok((await page.getByText("Tiến độ tiếng Anh đã đồng bộ với tài khoản.").count()) === 1, "trang /en báo 'đã đồng bộ'");
  await ctx.close();

  const second = await login();
  await second.page.goto(`${BASE}/en/`, { waitUntil: "networkidle" });
  await second.page.waitForTimeout(3000);
  const card = await second.page.locator("ol li").nth(1).innerText();
  ok(/Bài tập 1\/5/.test(card), `trình duyệt mới (sau khi đăng nhập) thấy lại tiến độ Buổi 2: "${card.replace(/\s+/g, " ").slice(0, 90)}"`);
  await second.ctx.close();
} finally {
  await browser.close();
  if (uid) await admin.auth.admin.deleteUser(uid);
  ok(true, "đã xoá tài khoản thử");
  console.log(results.join("\n"));
}
