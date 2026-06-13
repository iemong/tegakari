import { readFileSync } from "node:fs"
import { expect, test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

extTest.describe("Annotation share (export/import)", () => {
  extTest(
    "export downloads a valid .tegakari.json and import restores the pins",
    async ({ context, activateExtension }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      await activateExtension()

      // Create one annotation and let the async enrichment settle.
      await page.locator("#btn-a").click()
      const inboxBadge = page
        .getByTitle("Inbox", { exact: true })
        .locator("span")
      await expect(inboxBadge).toHaveText("1")

      // Open the inbox where the share bar lives.
      await page.getByTitle("Inbox", { exact: true }).click()

      // Export → a download must fire with the versioned payload.
      const downloadPromise = page.waitForEvent("download", { timeout: 5000 })
      await page.getByTitle(/^Export annotations/).click()
      const download = await downloadPromise
      const filePath = await download.path()
      const payload = JSON.parse(readFileSync(filePath!, "utf8"))

      expect(payload.format).toBe("tegakari-annotations")
      expect(payload.version).toBe(1)
      expect(payload.store.annotations).toHaveLength(1)
      expect(payload.store.annotations[0].elementInfo.selector).toContain(
        "btn-a"
      )

      // Clear everything (two-step confirm), badge disappears.
      await page.getByTitle("Clear all").click()
      await page.getByTitle("Click again to confirm").click()
      await expect(inboxBadge).toHaveCount(0)

      // Import the exported file → pin and badge come back.
      await page.locator('input[type="file"]').setInputFiles(filePath!)
      await expect(page.getByRole("status")).toContainText("Imported 1")
      await expect(inboxBadge).toHaveText("1")
    }
  )
})
