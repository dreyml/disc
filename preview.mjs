import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("./public/", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

createServer(async (request, response) => {
  try {
    const requested = request.url === "/" ? "index.html" : request.url.split("?")[0].slice(1);
    const path = normalize(join(root, requested));
    if (!path.startsWith(normalize(root))) throw new Error("invalid path");
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Não encontrado");
  }
}).listen(4173, "127.0.0.1", () => console.log("DISC Funcional em http://127.0.0.1:4173"));
