// Minimal static server for E2E fixtures.
// Used by playwright.config.ts via the `webServer` option.

import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import url from "node:url"

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const PORT = Number(process.env.FIXTURE_PORT ?? 4321)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
}

const server = http.createServer((req, res) => {
  const requested = req.url === "/" ? "/page.html" : req.url
  const filePath = path.join(__dirname, requested)

  // Prevent path traversal outside fixtures dir.
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403)
    res.end("Forbidden")
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end("Not Found")
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
    })
    res.end(data)
  })
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[fixture-server] http://localhost:${PORT}`)
})
