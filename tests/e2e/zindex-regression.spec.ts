import { test, expect } from "./fixtures"

const FIXTURE_URL =
  process.env.FIXTURE_URL_OVERLAY ?? "http://localhost:4321/with-overlay.html"

/**
 * Regression: pages that mount their own `position: fixed; z-index: 2147483647`
 * bottom bar (cookie banners, marketing widgets, intercom-style chats) can
 * cover the tegakari toolbar. The Plasmo CSUI host has no `position`, so the
 * `:host { z-index }` in src/style.css is a no-op. The toolbar element itself
 * carries the same max z-index, so victory comes down to DOM order — which
 * we cannot rely on.
 *
 * Expectation: click should still route to the settings button. If this spec
 * fails (timeout / hit-test rejection), z-index is the culprit.
 */
test.describe("Toolbar settings button under hostile page overlay", () => {
  test("settings button is clickable even when page has max z-index overlay", async ({
    context,
    extensionId,
    activateExtension,
  }) => {
    const page = await context.newPage()
    await page.goto(FIXTURE_URL)
    await activateExtension()

    const settings = page.getByTitle("Prefix rules")
    await expect(settings).toBeVisible()

    const [optionsPage] = await Promise.all([
      context.waitForEvent("page", { timeout: 5_000 }),
      // No `force: true` — we want the real hit-test to run so the bug shows up.
      settings.click(),
    ])

    await expect(optionsPage).toHaveURL(
      new RegExp(`^chrome-extension://${extensionId}/options\\.html`)
    )
  })
})
