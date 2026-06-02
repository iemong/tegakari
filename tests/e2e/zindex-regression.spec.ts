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
 * Expectation: a real (non-forced) click on a toolbar button should still land
 * and produce its effect — here, the Inbox button opens the inbox panel. If
 * this spec fails (timeout / hit-test rejection), z-index is the culprit.
 */
test.describe("Toolbar under hostile page overlay", () => {
  test("a toolbar button is clickable even when page has max z-index overlay", async ({
    context,
    activateExtension,
  }) => {
    const page = await context.newPage()
    await page.goto(FIXTURE_URL)
    await activateExtension()

    const inbox = page.getByTitle("Inbox", { exact: true })
    await expect(inbox).toBeVisible()

    // No `force: true` — we want the real hit-test to run so the bug shows up.
    await inbox.click()

    // Clicking Inbox toggles the inbox panel open; its empty-state copy proves
    // the click actually landed on the toolbar (not the hostile overlay).
    await expect(
      page.getByText("Click elements on the page to annotate")
    ).toBeVisible()
  })
})
