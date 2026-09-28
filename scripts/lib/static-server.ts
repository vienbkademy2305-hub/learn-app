/**
 * Serves out/ like GitHub Pages does: under an optional base path, directories
 * resolve to index.html, unknown paths get 404.html. Used by smoke and audio checks.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

export const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
};

export function startStaticServer(outDir: string, basePath: string, port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url ?? "/").split("?")[0]!);
    if (basePath && !url.startsWith(basePath)) {
      res.writeHead(404).end("outside base path");
      return;
    }
    url = url.slice(basePath.length) || "/";
    let file = path.join(outDir, url);
    if (!file.startsWith(outDir)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!existsSync(file)) {
      res.writeHead(404, { "content-type": CONTENT_TYPES[".html"] });
      createReadStream(path.join(outDir, "404.html")).pipe(res);
      return;
    }
    res.writeHead(200, {
      "content-type": CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
      "content-length": statSync(file).size,
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
