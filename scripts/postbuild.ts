/**
 * Runs after `next build` (static export) to make out/ servable by GitHub Pages.
 *
 * 1. Workaround for a Next.js 16 Windows bug: export/index.js builds segment
 *    prefetch filenames with `segmentPath.replace(/\//g, ".")`, but on Windows
 *    the path uses "\" so files land in nested folders
 *    (`__next.hsk/$d$level/__PAGE__.txt`) while the client requests the flat
 *    name (`__next.hsk.$d$level.__PAGE__.txt`) → 404 on every prefetch.
 *    We flatten them. No-op on Linux/macOS builds.
 * 2. Adds .nojekyll so GitHub Pages serves the `_next/` directory.
 */
import { existsSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "..", "out");

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

let flattened = 0;
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (name.startsWith("__next.")) {
      for (const file of filesUnder(p)) {
        const flat = path.relative(dir, file).split(path.sep).join(".");
        renameSync(file, path.join(dir, flat));
        flattened++;
      }
      rmSync(p, { recursive: true, force: true });
    } else if (name !== "_next" && name !== "assets") {
      walk(p);
    }
  }
}

if (!existsSync(OUT)) throw new Error("out/ not found — run `next build` first");
walk(OUT);
writeFileSync(path.join(OUT, ".nojekyll"), "");
console.log(`postbuild: flattened ${flattened} segment files, wrote .nojekyll`);
