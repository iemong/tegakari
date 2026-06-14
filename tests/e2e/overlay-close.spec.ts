import { expect, test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

extTest.describe("Overlay close", () => {
  extTest(
    "the ✕ button hides the toolbar and pins even when annotations exist",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      // Create an annotation so the regression case (annotations > 0) applies.
      await page.locator("#btn-a").click()
      await expect(
        page.getByTitle("Inbox", { exact: true }).locator("span")
      ).toHaveText("1")

      await page.getByTitle("Close tegakari").click()

      // The whole overlay disappears: toolbar and pins.
      await expect(page.getByTitle("Close tegakari")).toHaveCount(0)
      await expect(page.getByTitle(/^Copy All/)).toHaveCount(0)

      // Reactivating restores the persisted annotation.
      await activateExtension()
      await expect(
        page.getByTitle("Inbox", { exact: true }).locator("span")
      ).toHaveText("1")
    }
  )
})
