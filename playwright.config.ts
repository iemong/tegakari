import { defineConfig } from "@playwright/test"

/**
 * Chrome 拡張の E2E は persistent context + --load-extension が必須。
 * 各 spec で fixture (tests/e2e/fixtures.ts) を経由して context を作る。
 *
 * 注意:
 * - MV3 service worker は classic headless では動かないため headless: false 固定。
 * - workers: 1 で常に直列実行（拡張は同時起動で干渉しやすい）。
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // _debug/ holds investigation scripts (renamed .bak so Playwright ignores them
  // by default). Run them ad-hoc with `pnpm exec playwright test tests/e2e/_debug/<file>`.
  testIgnore: ["**/_debug/**"],
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/fixtures/server.mjs",
    url: "http://localhost:4321/page.html",
    reuseExistingServer: true,
    stdout: "pipe",
    stderr: "pipe",
  },
})
