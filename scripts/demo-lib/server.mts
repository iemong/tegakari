import { createServer, type Server } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join } from "node:path"

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
}

export interface DemoServer {
  url: string
  close: () => Promise<void>
}

/** Minimal static file server for scripts/demo-page/, mirrors tests/fixtures/server.mjs. */
export function startDemoServer(
  rootDir: string,
  port: number
): Promise<DemoServer> {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) =>
      handleRequest(req.url, rootDir, res)
    )
    server.listen(port, () => {
      resolvePromise({
        url: `http://localhost:${port}/`,
        close: () => closeServer(server),
      })
    })
  })
}

async function handleRequest(
  reqUrl: string | undefined,
  rootDir: string,
  res: import("node:http").ServerResponse
) {
  const requested = !reqUrl || reqUrl === "/" ? "/index.html" : reqUrl
  const filePath = join(rootDir, requested.split("?")[0] ?? "/index.html")
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403)
    res.end("Forbidden")
    return
  }
  try {
    const data = await readFile(filePath)
    const ext = extname(filePath).toLowerCase()
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end("Not Found")
  }
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose) => server.close(() => resolveClose()))
}
