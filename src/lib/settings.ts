/** Persisted user settings stored in `chrome.storage.local`. */

import type { OutputFormat } from "./types"

export const IFRAME_SELECTION_KEY = "tegakariIframeSelection"
export const OUTPUT_FORMAT_KEY = "tegakariOutputFormat"

/** Read the "select inside same-origin iframes" flag (defaults to false). */
export async function loadIframeSelection(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(IFRAME_SELECTION_KEY, (result) => {
      resolve(result[IFRAME_SELECTION_KEY] === true)
    })
  })
}

/** Persist the iframe-selection flag. */
export function setIframeSelection(enabled: boolean): void {
  chrome.storage.local.set({ [IFRAME_SELECTION_KEY]: enabled })
}

/** Read the preferred output format (defaults to "jsonl"). */
export async function loadOutputFormat(): Promise<OutputFormat> {
  return new Promise((resolve) => {
    chrome.storage.local.get(OUTPUT_FORMAT_KEY, (result) => {
      resolve(result[OUTPUT_FORMAT_KEY] === "markdown" ? "markdown" : "jsonl")
    })
  })
}

/** Persist the preferred output format. */
export function setOutputFormat(format: OutputFormat): void {
  chrome.storage.local.set({ [OUTPUT_FORMAT_KEY]: format })
}
