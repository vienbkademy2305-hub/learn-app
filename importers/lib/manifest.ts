/** Reads sources/manifest.json and verifies that local inputs match the pinned versions. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../../src/db/client";

export interface PinnedRepo {
  url: string;
  commit: string;
  files: Record<string, string>;
}

export interface PinnedDownload extends PinnedRepo {
  rawBase: string;
}

export interface Manifest {
  reposDir: string;
  repos: Record<string, PinnedRepo>;
  downloads: Record<string, PinnedDownload>;
}

export const MANIFEST_PATH = path.join(PROJECT_ROOT, "sources", "manifest.json");
export const RAW_DIR = path.join(PROJECT_ROOT, "sources", "raw");

export function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
}

export function reposDir(manifest: Manifest): string {
  return process.env.SOURCE_REPOS_DIR ?? manifest.reposDir;
}

export function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function repoPath(manifest: Manifest, repo: string, file = ""): string {
  return path.join(reposDir(manifest), repo, file);
}

export function downloadPath(name: string, commit: string, file: string): string {
  return path.join(RAW_DIR, name, commit, file);
}

/** Throws when a repo is at another commit, has local changes, or a pinned file differs. */
export function verifyInputs(manifest: Manifest): void {
  const problems: string[] = [];

  for (const [name, pin] of Object.entries(manifest.repos)) {
    const dir = repoPath(manifest, name);
    if (!existsSync(dir)) {
      problems.push(`${name}: repository not found at ${dir}`);
      continue;
    }
    const head = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (head !== pin.commit) problems.push(`${name}: HEAD is ${head}, manifest pins ${pin.commit}`);
    for (const [file, expected] of Object.entries(pin.files)) {
      const actual = sha256File(path.join(dir, file));
      if (actual !== expected) problems.push(`${name}/${file}: sha256 ${actual} ≠ ${expected}`);
    }
  }

  for (const [name, pin] of Object.entries(manifest.downloads)) {
    for (const [file, expected] of Object.entries(pin.files)) {
      const local = downloadPath(name, pin.commit, file);
      if (!existsSync(local)) problems.push(`${name}/${file}: missing — run \`pnpm sources:fetch\``);
      else if (!expected) problems.push(`${name}/${file}: sha256 not pinned — run \`pnpm sources:fetch\``);
      else if (sha256File(local) !== expected) problems.push(`${name}/${file}: sha256 mismatch`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Source inputs do not match sources/manifest.json:\n- ${problems.join("\n- ")}`);
  }
}
