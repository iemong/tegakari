import type { Locator, Page, Worker } from "@playwright/test"

import { injectFakeCursor } from "./cursor.mts"
import { DemoMouse } from "./mouse.mts"

const INSTRUCTION_1 = "Reduce the padding"
const INSTRUCTION_2 = "Make this button larger on mobile"
const RELATION_INSTRUCTION = "Keep these visually consistent"
const CHIP_LABELS = ["Spacing", "Align"]
const FONT_SIZE_STEPS = 5

/**
 * Drives the ~24s demo: turn the overlay on, annotate two elements (one
 * with quick-instruction chips, one with a live "Adjust styles" font-size
 * tweak), link the two pins with a relation, open the Inbox, then hit
 * Copy All.
 *
 * The nominal per-step waits below sum to well under 24s on paper — actual
 * wall-clock time runs ~30% longer because `DemoMouse.moveTo` dispatches a
 * real `mouse.move`/`waitForTimeout` pair per animation frame (see
 * mouse.mts), and each CDP round trip adds a few ms that compounds over the
 * many small steps in every glide.
 */
export async function runDemoScenario(page: Page, worker: Worker): Promise<void> {
  await toggleOverlay(worker)
  await page.getByTitle("Inbox", { exact: true }).waitFor({ state: "visible" })
  await page.waitForTimeout(250)

  await injectFakeCursor(page)
  const mouse = new DemoMouse(page)
  await mouse.moveTo(640, 30, 200)
  await page.waitForTimeout(70)

  await annotateElement({
    page,
    mouse,
    target: page.locator("#feature-card-annotate"),
    instruction: INSTRUCTION_1,
    extra: (p, m) => clickChips(p, m, CHIP_LABELS),
  })
  await annotateElement({
    page,
    mouse,
    target: page.locator("#upgrade-btn"),
    instruction: INSTRUCTION_2,
    extra: (p, m) => tweakFontSize(p, m, FONT_SIZE_STEPS),
  })

  await linkPins(page, mouse, RELATION_INSTRUCTION)
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

/** Glide + hover (highlight box visible) + click (pin) + type + optional extra step + save. */
async function annotateElement(opts: {
  page: Page
  mouse: DemoMouse
  target: Locator
  instruction: string
  extra?: (page: Page, mouse: DemoMouse) => Promise<void>
}): Promise<void> {
  const { page, mouse, target, instruction, extra } = opts
  // The target may be below the fold (e.g. the pricing button); bring it
  // into view first or boundingBox() coordinates land off-screen and the
  // click hits nothing.
  await target.evaluate((el) =>
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  )
  await page.waitForTimeout(480)

  await mouse.moveAndClick(target, { travelMs: 480, hoverPauseMs: 500 })

  const textarea = page.getByPlaceholder(/指示を入力/)
  await textarea.waitFor({ state: "visible" })
  await textarea.focus()
  await page.keyboard.type(instruction, { delay: 35 })
  await page.waitForTimeout(150)

  if (extra) await extra(page, mouse)

  await mouse.moveAndClick(page.getByRole("button", { name: "Save" }), {
    travelMs: 220,
    hoverPauseMs: 110,
  })
  await page.waitForTimeout(250)
}

/** Click each quick-instruction chip in the open pin popover (`InstructionChips`), pausing on the selected state. */
async function clickChips(page: Page, mouse: DemoMouse, labels: string[]): Promise<void> {
  for (const label of labels) {
    await mouse.moveAndClick(page.getByRole("button", { name: label }), {
      travelMs: 180,
      hoverPauseMs: 90,
    })
    await page.waitForTimeout(100)
  }
  await page.waitForTimeout(220)
}

/**
 * Open "Adjust styles" and step the font-size row up enough times to
 * visibly grow the target's text (`StyleTweakPanel`/`StyleTweakRow`), then
 * collapse the panel again — its row list has no max-height, and with the
 * popover already anchored near the bottom of a short viewport, leaving it
 * open would push the Save button off-screen.
 */
async function tweakFontSize(page: Page, mouse: DemoMouse, steps: number): Promise<void> {
  const toggle = page.getByRole("button", { name: "Adjust styles" })
  await mouse.moveAndClick(toggle, { travelMs: 220, hoverPauseMs: 130 })
  await page.waitForTimeout(200)

  const fontSizeInput = page.getByTestId("tegakari-style-value-font-size")
  await fontSizeInput.waitFor({ state: "visible" })
  const increaseBtn = fontSizeInput.locator(
    'xpath=./following-sibling::button[@title="Increase"]'
  )
  for (let i = 0; i < steps; i++) {
    await mouse.moveAndClick(increaseBtn, { travelMs: 140, hoverPauseMs: 90 })
  }
  await page.waitForTimeout(300)

  await mouse.moveAndClick(toggle, { travelMs: 180, hoverPauseMs: 100 })
  await page.waitForTimeout(250)
}

/**
 * Link mode (#RelationAnnotation): reopen pin 2's popover, click "Link",
 * click pin 1 to create the pending relation, then fill + save its
 * instruction. Pin 1 (feature card) sits well above pin 2 (pricing button),
 * so both must be scrolled into view together before either is clickable.
 */
async function linkPins(page: Page, mouse: DemoMouse, instruction: string): Promise<void> {
  await scrollToFrameBoth(page, "#feature-card-annotate", "#upgrade-btn")

  await mouse.moveAndClick(page.getByTestId("tegakari-pin-2"), {
    travelMs: 260,
    hoverPauseMs: 140,
  })
  await page.waitForTimeout(250)

  await mouse.moveAndClick(page.getByTitle("Link to another pin"), {
    travelMs: 180,
    hoverPauseMs: 100,
  })
  await page.waitForTimeout(220)

  await mouse.moveAndClick(page.getByTestId("tegakari-pin-1"), {
    travelMs: 300,
    hoverPauseMs: 140,
  })

  const textarea = page.getByPlaceholder(/この2要素への指示を入力/)
  await textarea.waitFor({ state: "visible" })
  await textarea.focus()
  await page.keyboard.type(instruction, { delay: 35 })
  await page.waitForTimeout(150)

  await mouse.moveAndClick(page.getByRole("button", { name: "Save" }), {
    travelMs: 220,
    hoverPauseMs: 110,
  })
  await page.waitForTimeout(420)
}

/** Scroll so both elements' vertical midpoint is centered — needed before linking two pins that are far apart on the page. */
async function scrollToFrameBoth(page: Page, aSelector: string, bSelector: string): Promise<void> {
  const targetY = await page.evaluate(
    (selectors: { aSelector: string; bSelector: string }) => {
      const a = document.querySelector(selectors.aSelector)
      const b = document.querySelector(selectors.bSelector)
      if (!a || !b) return window.scrollY
      const aTop = a.getBoundingClientRect().top + window.scrollY
      const bTop = b.getBoundingClientRect().top + window.scrollY
      return Math.max(0, (aTop + bTop) / 2 - window.innerHeight / 2)
    },
    { aSelector, bSelector }
  )
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), targetY)
  await page.waitForTimeout(420)
}

async function openInboxAndCopy(page: Page, mouse: DemoMouse): Promise<void> {
  await mouse.moveAndClick(page.getByTitle("Inbox", { exact: true }), {
    travelMs: 350,
    hoverPauseMs: 180,
  })
  await page.waitForTimeout(400)

  await mouse.moveAndClick(page.getByTitle(/^Copy All/), {
    travelMs: 320,
    hoverPauseMs: 180,
  })
  await page.getByTitle("Copied!").waitFor({ state: "visible" })
  await page.waitForTimeout(380)
}
