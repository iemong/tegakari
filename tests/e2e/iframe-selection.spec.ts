import { expect, test as extTest } from "./fixtures"

const BASE = process.env.FIXTURE_URL ?? "http://localhost:4321/"
const IFRAME_URL = new URL("iframe-page.html", BASE).href

extTest.describe("iframe selection (#29)", () => {
  extTest(
    "does NOT select inside an iframe when the setting is off (default)",
    async ({ context, activateExtension, seedIframeSelection }) => {
      await seedIframeSelection(false)
      const page = await context.newPage()
      await page.goto(IFRAME_URL)
      await activateExtension()

      // Clicking inside the iframe must not create an annotation: the top frame
      // has no listeners bound to the iframe document.
      await page.frameLocator("#gas-frame").locator("#child-btn").click()

      await expect(
        page.getByTitle("Inbox", { exact: true }).locator("span")
      ).toHaveCount(0)
    }
  )

  extTest(
    "selects an element inside a same-origin iframe when enabled, with a correctly positioned pin",
    async ({ context, activateExtension, seedIframeSelection }) => {
      await seedIframeSelection(true)
      const page = await context.newPage()
      await page.goto(IFRAME_URL)
      await activateExtension()

      const child = page.frameLocator("#gas-frame").locator("#child-btn")
      await child.click()

      // An annotation was created for the iframe element.
      await expect(
        page.getByTitle("Inbox", { exact: true }).locator("span")
      ).toHaveText("1")

      // Deselect the freshly-created pin so its popover (which also shows the
      // tag) closes, leaving a single occurrence in the Inbox row.
      await page.keyboard.press("Escape")

      // The Inbox row shows the iframe element's tag (<button>).
      await page.getByTitle("Inbox", { exact: true }).click()
      await expect(page.getByText("<button>", { exact: true })).toBeVisible()

      // The pin is anchored at the click point in TOP-page coordinates, i.e. the
      // iframe offset was applied. Without translation the pin would sit at the
      // iframe-internal coords, far outside the button's real top-page box.
      const pin = page.getByTestId("tegakari-pin-1")
      await expect(pin).toBeVisible()
      const pinBox = await pin.boundingBox()
      const btnBox = await child.boundingBox()
      if (!pinBox || !btnBox) throw new Error("missing bounding boxes")

      const pinCx = pinBox.x + pinBox.width / 2
      const pinCy = pinBox.y + pinBox.height / 2
      const tol = 12
      expect(pinCx).toBeGreaterThanOrEqual(btnBox.x - tol)
      expect(pinCx).toBeLessThanOrEqual(btnBox.x + btnBox.width + tol)
      expect(pinCy).toBeGreaterThanOrEqual(btnBox.y - tol)
      expect(pinCy).toBeLessThanOrEqual(btnBox.y + btnBox.height + tol)
    }
  )
})
