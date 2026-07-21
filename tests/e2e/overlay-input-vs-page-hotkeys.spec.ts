import { test, expect } from "./fixtures"

const FIXTURE_URL =
  process.env.FIXTURE_URL_HOTKEYS ??
  "http://localhost:4321/hostile-hotkeys.html"

/**
 * Regression: content-script overlay UI is mounted inside the host page's
 * DOM, so a keydown fired inside one of tegakari's own inputs is a
 * `composed` event that keeps bubbling into the page's own `document` —
 * unless something stops it. Sites with single-key hotkeys (YouTube-style:
 * digits seek to a timestamp) install a bubble-phase `document` keydown
 * listener that calls `preventDefault()` on digit keys. Without guarding
 * the overlay's own inputs, that listener also eats digits typed into e.g.
 * the "Adjust styles" font-size field — "24px" silently becomes "px".
 *
 * `tests/fixtures/hostile-hotkeys.html` reproduces exactly that listener.
 * `stopOverlayKeyPropagation` (src/lib/overlay-keys.ts), wired onto the pin
 * popover's root element, is the fix under test here.
 */
test.describe("Overlay inputs survive a hostile page hotkey listener", () => {
  test("typing '24px' into the style-tweak font-size input is not eaten by the page's digit-key handler", async ({
    context,
    activateExtension,
  }) => {
    const page = await context.newPage()
    await page.goto(FIXTURE_URL)
    await activateExtension()

    await page.locator("#content-target").click()
    await page.getByPlaceholder(/指示を入力/).waitFor({ state: "visible" })

    await page.getByRole("button", { name: "Adjust styles" }).click()
    const input = page.getByTestId("tegakari-style-value-font-size")
    await input.waitFor({ state: "visible" })

    await input.click()
    await page.keyboard.press("ControlOrMeta+a")
    await page.keyboard.type("24px")

    await expect(input).toHaveValue("24px")
    await expect(page.locator("#content-target")).toHaveCSS(
      "font-size",
      "24px"
    )
  })
})
