import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = 4173;
const ROOT = process.cwd();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".cts": "text/plain; charset=utf-8",
  ".d.ts": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ts": "text/plain; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const pathname =
      url.pathname === "/"
        ? "/examples/playground/index.html"
        : decodeURIComponent(url.pathname);

    const absolutePath = normalize(join(ROOT, pathname));

    if (!absolutePath.startsWith(ROOT)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const file = await readFile(absolutePath);
    response.writeHead(200, {
      "Content-Type":
        MIME_TYPES[extname(absolutePath)] ?? "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(PORT, () => {
  console.log(`Playground available at http://localhost:${PORT}`);
});
