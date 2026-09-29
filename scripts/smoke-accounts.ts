/**
 * `pnpm smoke:accounts` — browser check of sign-in and progress sync (docs/ACCOUNTS_PLAN.md §6)
 * without a real Supabase project: the site is built against a fake Supabase URL and
 * Playwright answers its Auth / REST requests from an in-memory table.
 * Leaves out/ built with the fake URL — run `pnpm build` again before `pnpm smoke` or deploying.
 */
import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium, type BrowserContext, type Route } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const PORT = 4311;
const FAKE = "http://fake-supabase.test";
const USER = { id: "11111111-2222-3333-4444-555555555555", email: "tung@learn-app.local", password: "matkhau123" };
const LESSON = "hsk1-01-greetings";

execFileSync("pnpm", ["build"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: FAKE, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key", NEXT_PUBLIC_BASE_PATH: "" },
});

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".txt": "text/plain", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let file = path.join(OUT, decodeURIComponent((req.url ?? "/").split("?")[0]!));
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(PORT, r));
const url = (p: string) => `http://localhost:${PORT}${p}`;

// ── Fake Supabase ─────────────────────────────────────────────────────────────
const table = new Map<string, { state: unknown; updated_at: string }>();
const upserts: unknown[] = [];
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600;
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, email: USER.email, role: "authenticated", aud: "authenticated", exp })}.sig`;
const user = { id: USER.id, aud: "authenticated", role: "authenticated", email: USER.email, app_metadata: {}, user_metadata: { username: "tung" }, created_at: new Date().toISOString() };
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "*" };

async function fakeSupabase(route: Route) {
  const req = route.request();
  const u = new URL(req.url());
  const json = (status: number, body: unknown) => route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  if (u.pathname === "/auth/v1/token") {
    const body = req.postDataJSON() as { email: string; password: string };
    if (body.email !== USER.email || body.password !== USER.password) return json(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
    return json(200, { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "refresh-1", user });
  }
  if (u.pathname === "/auth/v1/user") return json(200, user);
  if (u.pathname === "/auth/v1/logout") return route.fulfill({ status: 204, headers: cors });
  if (u.pathname === "/rest/v1/progress") {
    if (req.method() === "GET") {
      const row = table.get(USER.id);
      if ((req.headers()["accept"] ?? "").includes("vnd.pgrst.object")) return row ? json(200, row) : json(406, { code: "PGRST116", message: "no rows" });
      return json(200, row ? [row] : []);
    }
    const body = req.postDataJSON() as { user_id: string; state: unknown; updated_at: string } | Array<{ user_id: string; state: unknown; updated_at: string }>;
    for (const r of Array.isArray(body) ? body : [body]) {
      if (r.user_id !== USER.id) return json(403, { message: "row-level security" });
      table.set(r.user_id, { state: r.state, updated_at: r.updated_at });
      upserts.push(r);
    }
    return route.fulfill({ status: 201, headers: cors });
  }
  return json(404, { message: `not faked: ${u.pathname}` });
}

// ── Checks ────────────────────────────────────────────────────────────────────
const checks: string[] = [];
const problems: string[] = [];
const check = (ok: boolean, label: string) => checks.push(`${ok ? "PASS" : "FAIL"} ${label}`);
const browser = await chromium.launch();

async function newDevice(): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route(`${FAKE}/**`, fakeSupabase);
  return ctx;
}
const learnedLine = async (page: import("playwright").Page) => (await page.locator("ol li").first().innerText()).match(/(\d+)\/\d+ từ đã học/)?.[1];

try {
  const deviceA = await newDevice();
  const page = await deviceA.newPage();
  // The 400 of the deliberate wrong-password attempt is expected.
  page.on("console", (m) => m.type() === "error" && !m.text().includes("status of 400") && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  // Guest progress first.
  await page.goto(url(`/zh/lesson/${LESSON}/`), { waitUntil: "networkidle" });
  check((await page.getByRole("link", { name: "Đăng nhập" }).count()) === 1, "khách thấy nút Đăng nhập trên menu");
  await page.getByRole("button", { name: "Đánh dấu đã học" }).first().click();

  await page.goto(url("/login/"), { waitUntil: "networkidle" });
  await page.getByLabel("Tên tài khoản").fill("Tung");
  await page.getByLabel("Mật khẩu").fill("sai-mat-khau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  const alert = await page.locator("main").getByRole("alert").innerText();
  check(alert.includes("Sai tên tài khoản hoặc mật khẩu"), `sai mật khẩu → báo lỗi tiếng Việt (${alert})`);

  await page.getByLabel("Mật khẩu").fill(USER.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(/\/hsk\/1\/?$/);
  await page.getByRole("link", { name: "Tài khoản tung" }).waitFor();
  await page.waitForTimeout(800);
  const adopted = table.get(USER.id)?.state as { learned?: object } | undefined;
  check(Object.keys(adopted?.learned ?? {}).length === 1, "đăng nhập tài khoản mới → tiến độ khách (1 từ) được đưa lên tài khoản");

  await page.goto(url(`/zh/lesson/${LESSON}/`), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Đánh dấu đã học" }).first().click();
  await page.waitForTimeout(2500);
  const pushed = table.get(USER.id)?.state as { learned?: object } | undefined;
  check(Object.keys(pushed?.learned ?? {}).length === 2, `đánh dấu thêm 1 từ → tự lưu lên máy chủ (${upserts.length} lần lưu)`);

  await page.goto(url("/account/"), { waitUntil: "networkidle" });
  const panel = await page.locator("main").innerText();
  check(panel.includes("tung") && panel.includes("Đã lưu vào tài khoản"), "trang Tài khoản hiện tên và trạng thái “Đã lưu vào tài khoản”");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.getByRole("link", { name: "Đăng nhập" }).waitFor();
  await page.goto(url("/zh/hsk/1/"), { waitUntil: "networkidle" });
  check((await learnedLine(page)) === "1", "đăng xuất → quay về tiến độ khách của trình duyệt (1 từ), không lẫn với tài khoản");

  // Another device: signing in brings the account's progress.
  const deviceB = await newDevice();
  const other = await deviceB.newPage();
  other.on("pageerror", (e) => problems.push(`pageerror (B): ${e.message}`));
  await other.goto(url("/login/"), { waitUntil: "networkidle" });
  await other.getByLabel("Tên tài khoản").fill("tung");
  await other.getByLabel("Mật khẩu").fill(USER.password);
  await other.getByRole("button", { name: "Đăng nhập" }).click();
  await other.waitForURL(/\/hsk\/1\/?$/);
  await other.waitForTimeout(800);
  check((await learnedLine(other)) === "2", "đăng nhập ở máy khác → thấy đúng tiến độ của tài khoản (2 từ)");
  await other.reload({ waitUntil: "networkidle" });
  await other.waitForTimeout(500);
  check((await other.getByRole("link", { name: "Tài khoản tung" }).count()) === 1 && (await learnedLine(other)) === "2", "tải lại trang vẫn giữ đăng nhập và tiến độ");

  // The header gains an account button: it must still fit on a narrow phone, signed in and out.
  await other.setViewportSize({ width: 375, height: 812 });
  const overflow = async () => other.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await other.goto(url("/zh/hsk/1/"), { waitUntil: "networkidle" });
  const signedInOverflow = await overflow();
  await other.screenshot({ path: path.join(ROOT, ".data", "screenshots", "accounts-mobile-signed-in.png") });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(url("/login/"), { waitUntil: "networkidle" });
  const signedOutOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: path.join(ROOT, ".data", "screenshots", "accounts-mobile-login.png") });
  check(signedInOverflow <= 1 && signedOutOverflow <= 1, `menu vừa màn hình 375px khi đã/chưa đăng nhập (tràn ${signedInOverflow}px / ${signedOutOverflow}px)`);
} finally {
  await browser.close();
  server.close();
}

for (const c of checks) console.log(`- ${c}`);
for (const p of problems) console.log(`- PROBLEM ${p}`);
const ok = checks.every((c) => c.startsWith("PASS")) && problems.length === 0;
console.log(`Result: ${ok ? "PASS" : "FAIL"}`);
process.exitCode = ok ? 0 : 1;
