import { test, expect, type Page } from "@playwright/test"
import { test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

/**
 * Trial-click each toolbar button so the actionability checks (visible,
 * enabled, stable, receives pointer events) run, but no onClick side effect
 * fires. This is exactly the check we need to catch z-index / hit-test
 * regressions for *every* button, not just the settings one.
 */
async function expectAllToolbarButtonsClickable(page: Page) {
  // Title-based buttons.
  for (const title of [
    "Inbox",
    "Toggle theme",
    "Prefix rules",
    "Close tegakari",
  ]) {
    const btn = page.getByTitle(title, { exact: true })
    await expect(btn, `button[title=${title}] should be visible`).toBeVisible()
    await btn.click({ trial: true })
  }

  // Copy button — title is "Copy All (N)" so match by prefix.
  const copy = page.getByTitle(/^Copy All/)
  await expect(copy, "Copy button should be visible").toBeVisible()
  await copy.click({ trial: true })

  // Format toggle pill (text-only buttons).
  for (const fmt of ["JSONL", "MD"]) {
    const fmtBtn = page.getByRole("button", { name: fmt, exact: true })
    await expect(fmtBtn, `format button ${fmt} should be visible`).toBeVisible()
    await fmtBtn.click({ trial: true })
  }
}

extTest.describe("Toolbar buttons", () => {
  extTest(
    "all buttons are clickable on initial mount (no annotations)",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      await expectAllToolbarButtonsClickable(page)
    }
  )

  extTest(
    "all buttons remain clickable after creating an annotation",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      // Pick an element on the page. The overlay listens for clicks at the
      // capture phase and turns the click into a numbered annotation pin.
      await page.locator("#btn-a").click()

      // Inbox badge should appear with the count once the annotation lands.
      const inboxBadge = page
        .getByTitle("Inbox", { exact: true })
        .locator("span")
      await expect(inboxBadge).toHaveText("1")

      // Settle: auto-screenshot crop + main-world framework probe are async.
      await page.waitForTimeout(300)

      await expectAllToolbarButtonsClickable(page)
    }
  )
})

// Suppress unused-import warning for the bare `test`/`expect` re-export.
void test
