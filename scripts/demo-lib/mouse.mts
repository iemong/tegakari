import type { Locator, Page } from "@playwright/test"

/**
 * Wraps page.mouse with ease-in-out interpolation over real wall-clock time.
 * Playwright's `steps` option on mouse.move() fires many synthetic
 * mousemove events near-instantly, which the video recorder mostly
 * collapses into a single frame (looks like teleporting). Stepping
 * manually with small waits between frames makes the glide visible.
 */
export class DemoMouse {
  private page: Page
  private x = 0
  private y = 0

  constructor(page: Page) {
    this.page = page
  }

  async moveTo(x: number, y: number, durationMs = 550): Promise<void> {
    const steps = Math.max(8, Math.round(durationMs / 25))
    const [startX, startY] = [this.x, this.y]
    for (let i = 1; i <= steps; i++) {
      const eased = easeInOutQuad(i / steps)
      await this.page.mouse.move(
        startX + (x - startX) * eased,
        startY + (y - startY) * eased
      )
      await this.page.waitForTimeout(durationMs / steps)
    }
    this.x = x
    this.y = y
  }

  async click(holdMs = 90): Promise<void> {
    await this.page.mouse.down()
    await this.page.waitForTimeout(holdMs)
    await this.page.mouse.up()
  }

  /** Glide to the center of a locator, pause to "read" it, then click. */
  async moveAndClick(
    locator: Locator,
    opts: { travelMs?: number; hoverPauseMs?: number } = {}
  ): Promise<void> {
    const box = await locator.boundingBox()
    if (!box) throw new Error("moveAndClick: locator has no bounding box")
    await this.moveTo(
      box.x + box.width / 2,
      box.y + box.height / 2,
      opts.travelMs ?? 550
    )
    await this.page.waitForTimeout(opts.hoverPauseMs ?? 350)
    await this.click()
  }
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}
