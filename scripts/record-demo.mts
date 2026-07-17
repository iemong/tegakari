/**
 * Records a ~15-20s demo of tegakari (hover -> annotate -> annotate ->
 * Inbox -> Copy) with Playwright, then converts the recording to a GIF
 * for README use.
 *
 * Usage: pnpm demo:gif
 * Env:
 *   DEMO_REBUILD=1  force `pnpm build` even if build/chrome-mv3-prod exists
 *   DEMO_PORT       port for the local demo page server (default 4322)
 *   FFMPEG_BIN       path to the ffmpeg binary (default "ffmpeg" on PATH)
 */
import { chromium, type Worker } from "@playwright/test"
import { mkdtempSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { ensureExtensionBuild } from "./demo-lib/build.mts"
import { convertWebmToGif } from "./demo-lib/gif.mts"
import { runDemoScenario } from "./demo-lib/scenario.mts"
import { startDemoServer } from "./demo-lib/server.mts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, "..")
const BUILD_PATH = resolve(PROJECT_ROOT, "build/chrome-mv3-prod")
const DEMO_PAGE_DIR = resolve(__dirname, "demo-page")
const OUTPUT_GIF = resolve(PROJECT_ROOT, "docs/assets/demo.gif")
const DEMO_PORT = Number(process.env.DEMO_PORT ?? 4322)
const VIEWPORT = { width: 1280, height: 800 }

async function main() {
  ensureExtensionBuild(BUILD_PATH, PROJECT_ROOT)
  await mkdir(dirname(OUTPUT_GIF), { recursive: true })

  const server = await startDemoServer(DEMO_PAGE_DIR, DEMO_PORT)
  const videoDir = mkdtempSync(join(tmpdir(), "tegakari-demo-"))

  try {
    const webmPath = await recordDemo(server.url, videoDir)
    console.log(`[demo] raw recording: ${webmPath}`)
    console.log("[demo] converting to GIF (this can take a minute)...")
    const result = convertWebmToGif(webmPath, OUTPUT_GIF)
    console.log(
      `[demo] wrote ${OUTPUT_GIF} (${(result.bytes / 1024 / 1024).toFixed(2)}MB, fps=${result.tier.fps}, width=${result.tier.width})`
    )
  } finally {
    await server.close()
  }
}

async function recordDemo(demoUrl: string, videoDir: string): Promise<string> {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    viewport: VIEWPORT,
    recordVideo: { dir: videoDir, size: VIEWPORT },
    args: [
      `--disable-extensions-except=${BUILD_PATH}`,
      `--load-extension=${BUILD_PATH}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height + 90}`,
    ],
  })

  try {
    const worker = await getServiceWorker(context)
    const page = await context.newPage()
    await page.goto(demoUrl, { waitUntil: "load" })

    await runDemoScenario(page, worker)

    const video = page.video()
    await page.close()
    if (!video) throw new Error("no video was recorded")
    return await video.path()
  } finally {
    await context.close()
  }
}

async function getServiceWorker(
  context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>
): Promise<Worker> {
  const existing = context.serviceWorkers()
  return existing[0] ?? (await context.waitForEvent("serviceworker"))
}

main().catch((err) => {
  console.error("[demo] failed:", err)
  process.exitCode = 1
})
