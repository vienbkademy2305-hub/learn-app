/**
 * `pnpm users:<command>` — account administration for the site owner (docs/ACCOUNTS_PLAN.md).
 * There is no public sign-up: accounts are created here with the Supabase secret key
 * from .env.local, which never leaves this machine.
 *
 *   pnpm users:add <username> <password>
 *   pnpm users:passwd <username> <new-password>
 *   pnpm users:list
 *   pnpm users:remove <username>      (also deletes that account's progress)
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient, type User } from "@supabase/supabase-js";
import { displayName, emailToUsername, normalizeUsername, usernameError, usernameToEmail } from "../src/domain/account";

const ROOT = path.resolve(import.meta.dirname, "..");
const envFile = path.join(ROOT, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.NEXT_PUBLIC_ACCOUNT_EMAIL_DOMAIN || "learn-app.local";
const MIN_PASSWORD = 8;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!url || !secret) fail("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env.local (xem .env.example).");
const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

async function allUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function findUser(username: string): Promise<User> {
  const email = usernameToEmail(username, domain);
  const user = (await allUsers()).find((u) => u.email === email);
  if (!user) fail(`Không có tài khoản "${normalizeUsername(username)}".`);
  return user;
}

function checkPassword(password: string | undefined): string {
  if (!password) fail("Thiếu mật khẩu.");
  if (password.length < MIN_PASSWORD) fail(`Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự.`);
  return password;
}

const [command, username, password] = process.argv.slice(2);

switch (command) {
  case "add": {
    const bad = usernameError(username ?? "");
    if (bad) fail(bad);
    const { error } = await admin.auth.admin.createUser({
      email: usernameToEmail(username!, domain),
      password: checkPassword(password),
      email_confirm: true, // no mail is ever sent to the hidden address
      user_metadata: { username: normalizeUsername(username!), display_name: displayName(username!) },
    });
    if (error) fail(/already been registered|already exists/i.test(error.message) ? `Tài khoản "${normalizeUsername(username!)}" đã tồn tại.` : error.message);
    console.log(`✓ Đã tạo tài khoản "${displayName(username!)}" (đăng nhập bằng "${displayName(username!)}" hoặc "${normalizeUsername(username!)}").`);
    break;
  }
  case "passwd": {
    const user = await findUser(username ?? "");
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: checkPassword(password) });
    if (error) fail(error.message);
    console.log(`✓ Đã đổi mật khẩu cho "${normalizeUsername(username!)}".`);
    break;
  }
  case "list": {
    const users = (await allUsers()).filter((u) => u.email?.endsWith(`@${domain}`));
    const { data: rows } = await admin.from("progress").select("user_id, updated_at");
    const lastSync = new Map((rows ?? []).map((r) => [r.user_id as string, r.updated_at as string]));
    if (users.length === 0) console.log("Chưa có tài khoản nào.");
    for (const u of users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""))) {
      const seen = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("vi-VN") : "chưa đăng nhập";
      const synced = lastSync.get(u.id);
      const name = typeof u.user_metadata?.display_name === "string" ? `${u.user_metadata.display_name} (${emailToUsername(u.email)})` : emailToUsername(u.email);
      console.log(`- ${name} · đăng nhập gần nhất: ${seen} · tiến độ lưu lúc: ${synced ? new Date(synced).toLocaleString("vi-VN") : "chưa có"}`);
    }
    break;
  }
  case "remove": {
    const user = await findUser(username ?? "");
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) fail(error.message);
    console.log(`✓ Đã xoá tài khoản "${normalizeUsername(username!)}" và tiến độ của tài khoản đó.`);
    break;
  }
  default:
    console.log("Dùng: pnpm users:add <tên> <mật khẩu> | users:passwd <tên> <mật khẩu mới> | users:list | users:remove <tên>");
    process.exit(command ? 1 : 0);
}
