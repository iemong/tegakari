import { test, expect, type Page } from "@playwright/test"
import { test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

/**
 * Trial-click each toolbar button so the actionability checks (visible,
 * enabled, stable, receives pointer events) run, but no onClick side effect
 * fires. This is exactly the check we need to catch z-index / hit-test
 * regressions for *every* button.
 */
async function expectAllToolbarButtonsClickable(
  page: Page,
  { imageCopyEnabled }: { imageCopyEnabled: boolean }
) {
  // Title-based buttons.
  for (const title of ["Inbox", "Close tegakari"]) {
    const btn = page.getByTitle(title, { exact: true })
    await expect(btn, `button[title=${title}] should be visible`).toBeVisible()
    await btn.click({ trial: true })
  }

  // Copy button — title is "Copy All (N)" so match by prefix.
  const copy = page.getByTitle(/^Copy All/)
  await expect(copy, "Copy button should be visible").toBeVisible()
  await copy.click({ trial: true })

  // Copy Image button — disabled until an annotation has a screenshot.
  const copyImage = page.getByTitle(/^Copy Image/)
  await expect(copyImage, "Copy Image button should be visible").toBeVisible()
  if (imageCopyEnabled) {
    await expect(copyImage).toBeEnabled()
    await copyImage.click({ trial: true })
  } else {
    await expect(copyImage).toBeDisabled()
  }

  // Output preset dropdown trigger (shows the current preset label, e.g. "JSONL").
  const presetTrigger = page.getByTitle("Output preset", { exact: true })
  await expect(presetTrigger, "preset dropdown trigger should be visible").toBeVisible()
  await presetTrigger.click({ trial: true })
}

extTest.describe("Toolbar buttons", () => {
  extTest(
    "all buttons are clickable on initial mount (no annotations)",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      await expectAllToolbarButtonsClickable(page, { imageCopyEnabled: false })
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
      // The Copy Image button flips to enabled once the crop is attached.
      await expect(page.getByTitle(/^Copy Image/)).toBeEnabled()

      await expectAllToolbarButtonsClickable(page, { imageCopyEnabled: true })
    }
  )

  extTest(
    "copy image button writes a contact-sheet PNG to the clipboard",
    async ({ context, activateExtension }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"], {
        origin: new URL(FIXTURE_URL).origin,
      })

      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      await page.locator("#btn-a").click()
      const copyImage = page.getByTitle(/^Copy Image/)
      await expect(copyImage).toBeEnabled()

      await copyImage.click()

      // Success feedback: the title flips while the copied state is shown.
      await expect(page.getByTitle("Image copied!")).toBeVisible()

      // The clipboard should now hold a PNG (image-only, no text bundled).
      const clipboardTypes = await page.evaluate(async () => {
        const items = await navigator.clipboard.read()
        return items.flatMap((item) => [...item.types])
      })
      expect(clipboardTypes).toContain("image/png")
      expect(clipboardTypes).not.toContain("text/plain")
    }
  )
})

// Suppress unused-import warning for the bare `test`/`expect` re-export.
void test
