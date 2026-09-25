/**
 * Downloads pinned files listed under `downloads` in sources/manifest.json into
 * sources/raw/<name>/<commit>/. Empty sha256 entries are filled in (first lock);
 * existing ones must match.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { downloadPath, loadManifest, MANIFEST_PATH, sha256File } from "./lib/manifest";

const manifest = loadManifest();
let changed = false;

for (const [name, pin] of Object.entries(manifest.downloads)) {
  for (const [file, expected] of Object.entries(pin.files)) {
    const url = `${pin.rawBase}/${pin.commit}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const target = downloadPath(name, pin.commit, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await res.arrayBuffer()));

    const actual = sha256File(target);
    if (!expected) {
      pin.files[file] = actual;
      changed = true;
      console.log(`locked  ${name}/${file} ${actual}`);
    } else if (actual !== expected) {
      throw new Error(`${name}/${file}: sha256 ${actual} ≠ pinned ${expected}`);
    } else {
      console.log(`ok      ${name}/${file}`);
    }
  }
}

if (changed) writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
