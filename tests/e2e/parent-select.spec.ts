import { expect, test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

extTest.describe("parent-selection shortcut (#30)", () => {
  extTest(
    "`\\` climbs from the hovered element to its parent before annotating",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      // #btn-a lives inside <div class="card">. Hover the button, climb one
      // level with `\`, then confirm with Enter.
      await page.locator("#btn-a").hover()
      await page.keyboard.press("\\")
      await page.keyboard.press("Enter")

      await expect(
        page.getByTitle("Inbox", { exact: true }).locator("span")
      ).toHaveText("1")

      // Deselect the pin popover so the tag appears only in the Inbox row.
      await page.keyboard.press("Escape")

      // The captured element is the parent <div>, not the <button>.
      await page.getByTitle("Inbox", { exact: true }).click()
      await expect(page.getByText("<div>", { exact: true })).toBeVisible()
      await expect(page.getByText("<button>", { exact: true })).toHaveCount(0)
    }
  )

  extTest(
    "ArrowUp then ArrowDown returns to the original element",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      await page.locator("#btn-a").hover()
      await page.keyboard.press("ArrowUp") // climb to parent <div>
      await page.keyboard.press("ArrowDown") // back down to <button>
      await page.keyboard.press("Enter")

      await expect(
        page.getByTitle("Inbox", { exact: true }).locator("span")
      ).toHaveText("1")

      // Deselect the pin popover so the tag appears only in the Inbox row.
      await page.keyboard.press("Escape")

      await page.getByTitle("Inbox", { exact: true }).click()
      await expect(page.getByText("<button>", { exact: true })).toBeVisible()
    }
  )

  extTest(
    "traversal keys do not hijack typing in the instruction popover",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      // Create an annotation; its popover textarea auto-focuses.
      await page.locator("#btn-a").click()
      const textarea = page.locator("textarea")
      await expect(textarea).toBeFocused()

      // `\`, Enter and arrows must reach the textarea, not the picker.
      await page.keyboard.type("line1")
      await page.keyboard.press("Enter")
      await page.keyboard.type("a\\b")

      await expect(textarea).toHaveValue("line1\na\\b")
      // No extra annotation was created by the Enter key.
      await expect(
        page.getByTitle("Inbox", { exact: true }).locator("span")
      ).toHaveText("1")
    }
  )
})
