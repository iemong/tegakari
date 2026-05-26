import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const PROJECT_ROOT = resolve(__dirname, "../..")
const BUILD_PATH = resolve(PROJECT_ROOT, "build/chrome-mv3-prod")

/**
 * Build the extension before any spec runs, unless an existing build
 * is already present and the user did not request a rebuild.
 *
 * Force rebuild with `E2E_REBUILD=1 pnpm e2e`.
 */
export default async function globalSetup() {
  const force = process.env.E2E_REBUILD === "1"
  if (!force && existsSync(BUILD_PATH)) {
    // eslint-disable-next-line no-console
    console.log(`[e2e] reusing existing build: ${BUILD_PATH}`)
    return
  }
  // eslint-disable-next-line no-console
  console.log("[e2e] building extension (pnpm build)...")
  execSync("pnpm build", { cwd: PROJECT_ROOT, stdio: "inherit" })
}
