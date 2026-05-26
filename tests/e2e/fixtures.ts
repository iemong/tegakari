import { test as base, chromium, type BrowserContext, type Worker } from "@playwright/test"
import { resolve } from "node:path"

const EXTENSION_PATH = resolve(__dirname, "../../build/chrome-mv3-prod")

type ExtensionFixtures = {
  context: BrowserContext
  extensionId: string
  serviceWorker: Worker
  /**
   * Toggle the extension's overlay UI on the currently active tab.
   * Internally evaluates `chrome.tabs.sendMessage(<active tab>, TEGAKARI_TOGGLE)`
   * inside the Service Worker — equivalent to clicking the toolbar icon.
   */
  activateExtension: () => Promise<void>
}

export const test = base.extend<ExtensionFixtures>({
  // MV3 extensions require a persistent context with --load-extension flags.
  // Note: page fixture is unavailable here; tests open a page via `context.newPage()`.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      // MV3 service workers do not run in classic headless; headed is the simplest path.
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    })
    await use(context)
    await context.close()
  },

  serviceWorker: async ({ context }, use) => {
    const existing = context.serviceWorkers()
    const worker = existing[0] ?? (await context.waitForEvent("serviceworker"))
    await use(worker)
  },

  extensionId: async ({ serviceWorker }, use) => {
    // serviceWorker.url => chrome-extension://<id>/<...>
    const id = new URL(serviceWorker.url()).host
    await use(id)
  },

  activateExtension: async ({ serviceWorker }, use) => {
    const toggle = async () => {
      await serviceWorker.evaluate(async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const tabId = tabs[0]?.id
        if (typeof tabId !== "number") {
          throw new Error("no active tab to toggle")
        }
        await chrome.tabs.sendMessage(tabId, { type: "TEGAKARI_TOGGLE" })
      })
    }
    await use(toggle)
  },
})

export const expect = test.expect
