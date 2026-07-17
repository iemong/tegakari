import { execSync } from "node:child_process"
import { existsSync } from "node:fs"

/**
 * Build the extension unless a build already exists and a rebuild wasn't
 * requested. Mirrors tests/e2e/global-setup.ts so `pnpm demo:gif` behaves
 * the same way E2E does re: E2E_REBUILD / DEMO_REBUILD.
 */
export function ensureExtensionBuild(
  buildPath: string,
  projectRoot: string
): void {
  const force =
    process.env.DEMO_REBUILD === "1" || process.env.E2E_REBUILD === "1"
  if (!force && existsSync(buildPath)) {
    console.log(`[demo] reusing existing build: ${buildPath}`)
    return
  }
  console.log("[demo] building extension (pnpm build)...")
  execSync("pnpm build", { cwd: projectRoot, stdio: "inherit" })
}
