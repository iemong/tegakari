import { test, expect } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

test.describe("Toolbar settings button", () => {
  test("opens the options page in a new tab", async ({
    context,
    extensionId,
    activateExtension,
  }) => {
    const page = await context.newPage()
    await page.goto(FIXTURE_URL)

    // Toggle overlay on (background → content TEGAKARI_TOGGLE).
    await activateExtension()

    // Playwright locators pierce shadow DOM, so the CSUI Shadow root is fine.
    const settings = page.getByTitle("Prefix rules")
    await expect(settings).toBeVisible()

    // Click should trigger TEGAKARI_OPEN_OPTIONS → chrome.runtime.openOptionsPage().
    const [optionsPage] = await Promise.all([
      context.waitForEvent("page", { timeout: 5_000 }),
      settings.click(),
    ])

    await expect(optionsPage).toHaveURL(
      new RegExp(`^chrome-extension://${extensionId}/options\\.html`)
    )
  })
})
