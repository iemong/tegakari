import type { Locator, Page, Worker } from "@playwright/test"

import { injectFakeCursor } from "./cursor.mts"
import { DemoMouse } from "./mouse.mts"

const INSTRUCTION_1 = "Reduce the padding"
const INSTRUCTION_2 = "Make this button larger on mobile"

/**
 * Drives the ~15-20s demo: turn the overlay on, hover + annotate two
 * elements with an instruction each, open the Inbox, then hit Copy All.
 */
export async function runDemoScenario(page: Page, worker: Worker): Promise<void> {
  await toggleOverlay(worker)
  await page.getByTitle("Inbox", { exact: true }).waitFor({ state: "visible" })
  await page.waitForTimeout(300)

  await injectFakeCursor(page)
  const mouse = new DemoMouse(page)
  await mouse.moveTo(640, 30, 400)
  await page.waitForTimeout(200)

  await annotateElement({
    page,
    mouse,
    target: page.locator("#feature-card-annotate"),
    instruction: INSTRUCTION_1,
  })
  await annotateElement({
    page,
    mouse,
    target: page.locator("#upgrade-btn"),
    instruction: INSTRUCTION_2,
  })

  await openInboxAndCopy(page, mouse)
}

async function toggleOverlay(worker: Worker): Promise<void> {
  await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const tabId = tabs[0]?.id
    if (typeof tabId !== "number") throw new Error("no active tab to toggle")
    await chrome.tabs.sendMessage(tabId, { type: "TEGAKARI_TOGGLE" })
  })
}

/** Glide + hover (highlight box visible) + click (pin) + type + save. */
async function annotateElement(opts: {
  page: Page
  mouse: DemoMouse
  target: Locator
  instruction: string
}): Promise<void> {
  const { page, mouse, target, instruction } = opts
  // The target may be below the fold (e.g. the pricing button); bring it
  // into view first or boundingBox() coordinates land off-screen and the
  // click hits nothing.
  await target.evaluate((el) =>
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  )
  await page.waitForTimeout(700)

  await mouse.moveAndClick(target, { travelMs: 650, hoverPauseMs: 900 })

  const textarea = page.getByPlaceholder(/指示を入力/)
  await textarea.waitFor({ state: "visible" })
  await textarea.focus()
  await page.keyboard.type(instruction, { delay: 45 })
  await page.waitForTimeout(350)

  await mouse.moveAndClick(page.getByRole("button", { name: "Save" }), {
    travelMs: 350,
    hoverPauseMs: 200,
  })
  await page.waitForTimeout(400)
}

async function openInboxAndCopy(page: Page, mouse: DemoMouse): Promise<void> {
  await mouse.moveAndClick(page.getByTitle("Inbox", { exact: true }), {
    travelMs: 500,
    hoverPauseMs: 250,
  })
  await page.waitForTimeout(500)

  await mouse.moveAndClick(page.getByTitle(/^Copy All/), {
    travelMs: 450,
    hoverPauseMs: 300,
  })
  await page.getByTitle("Copied!").waitFor({ state: "visible" })
  await page.waitForTimeout(1200)
}
