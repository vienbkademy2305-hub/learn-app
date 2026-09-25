/**
 * `pnpm deploy:pages` — publishes the static site to GitHub Pages
 * (https://vienbkademy2305-hub.github.io/learn-app/).
 *
 * 1. Builds with basePath /learn-app (set here, so Git Bash path conversion
 *    cannot rewrite it).
 * 2. Pushes out/ as a single commit to the `gh-pages` branch of `origin`
 *    (replacing the previous deployment; master is untouched).
 *
 * Requires `pnpm import:hsk1 && pnpm content:export` to have been run.
 * In GitHub → Settings → Pages, the source must be "Deploy from a branch: gh-pages / (root)".
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const BASE_PATH = "/learn-app";

const run = (cmd: string, args: string[], cwd = ROOT, env: NodeJS.ProcessEnv = process.env) =>
  // pnpm is a .cmd shim on Windows and needs a shell; git must not use one (arguments contain spaces).
  execFileSync(cmd, args, { cwd, env, stdio: "inherit", shell: cmd === "pnpm" && process.platform === "win32" });
const capture = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8" }).trim();

if (!existsSync(path.join(ROOT, ".data", "content", "hsk1.json"))) {
  throw new Error("Content snapshot missing — run `pnpm import:hsk1 && pnpm content:export` first.");
}

const remote = capture("git", ["remote", "get-url", "origin"]);
const commit = capture("git", ["rev-parse", "--short", "HEAD"]);

run("pnpm", ["build"], ROOT, { ...process.env, NEXT_PUBLIC_BASE_PATH: BASE_PATH, MSYS_NO_PATHCONV: "1" });

rmSync(path.join(OUT, ".git"), { recursive: true, force: true });
run("git", ["init", "-q", "-b", "gh-pages"], OUT);
run("git", ["add", "-A"], OUT);
run("git", ["commit", "-q", "-m", `Deploy site from ${commit}`], OUT);
run("git", ["push", "--force", remote, "gh-pages:gh-pages"], OUT);
rmSync(path.join(OUT, ".git"), { recursive: true, force: true });

console.log(`Deployed ${commit} to gh-pages → https://vienbkademy2305-hub.github.io${BASE_PATH}/`);
