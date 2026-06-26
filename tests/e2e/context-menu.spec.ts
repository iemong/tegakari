import type { Worker } from "@playwright/test"
import type { Page } from "@playwright/test"

import { expect, test as extTest } from "./fixtures"

const FIXTURE_URL = process.env.FIXTURE_URL ?? "http://localhost:4321/"

// The OS-native context menu can't be driven from Playwright, so we exercise
// every step except the menu UI itself: dispatch a synthetic `contextmenu`
// event (records the target in the content script) then fire the menu action
// by sending TEGAKARI_CONTEXT_SELECT from the service worker.
async function rightClick(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`no box for ${selector}`)
  await page.evaluate(
    ({ sel, x, y }) => {
      const el = document.querySelector(sel)
      el?.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, clientX: x, clientY: y })
      )
    },
    { sel: selector, x: box.x + box.width / 2, y: box.y + box.height / 2 }
  )
}

async function fireMenuAction(serviceWorker: Worker) {
  await serviceWorker.evaluate(async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const tabId = tabs[0]?.id
    if (typeof tabId !== "number") throw new Error("no active tab")
    await chrome.tabs.sendMessage(tabId, { type: "TEGAKARI_CONTEXT_SELECT" })
  })
}

const inboxBadge = (page: Page) =>
  page.getByTitle("Inbox", { exact: true }).locator("span")

extTest.describe("context-menu selection (#37)", () => {
  extTest(
    "annotates the right-clicked element and activates the overlay when inactive",
    async ({ context, serviceWorker }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)
      // Do not activate — the menu action should activate the overlay itself.

      await rightClick(page, "#btn-a")
      await fireMenuAction(serviceWorker)

      await expect(inboxBadge(page)).toHaveText("1")
      await expect(page.getByTestId("tegakari-pin-1")).toBeVisible()

      await page.keyboard.press("Escape")
      await page.getByTitle("Inbox", { exact: true }).click()
      await expect(page.getByText("<button>", { exact: true })).toBeVisible()
    }
  )

  extTest(
    "keeps persisted annotations when activated via the context menu",
    async ({ context, activateExtension, serviceWorker }) => {
      const page = await context.newPage()
      await page.goto(FIXTURE_URL)

      // Create + persist one annotation through the normal flow, then close.
      await activateExtension()
      await page.locator("#btn-a").click()
      await expect(inboxBadge(page)).toHaveText("1")
      await page.keyboard.press("Escape")
      await page.getByTitle("Close tegakari").click()

      // Re-enter via the context menu on a different element. The persisted
      // annotation must survive and the new one is appended (race guard).
      await rightClick(page, "#section-2")
      await fireMenuAction(serviceWorker)

      await expect(inboxBadge(page)).toHaveText("2")
    }
  )
})
