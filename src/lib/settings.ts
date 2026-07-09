/** Persisted user settings stored in `chrome.storage.local`. */

import { OUTPUT_PRESETS } from "./output-presets"
import type { OutputPreset } from "./types"

export const IFRAME_SELECTION_KEY = "tegakariIframeSelection"
// Key name kept as-is (predates the preset system) so existing "jsonl"/
// "markdown" values persisted by earlier versions keep loading correctly.
export const OUTPUT_FORMAT_KEY = "tegakariOutputFormat"

function isOutputPreset(value: unknown): value is OutputPreset {
  return (
    typeof value === "string" &&
    (OUTPUT_PRESETS as readonly string[]).includes(value)
  )
}

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

/**
 * Read the preferred output preset (defaults to "jsonl"). Accepts any of the
 * 5 preset ids; a value persisted by an older build ("jsonl"/"markdown") is
 * still valid and loads unchanged. Unknown/corrupt values fall back to jsonl.
 */
export async function loadOutputPreset(): Promise<OutputPreset> {
  return new Promise((resolve) => {
    chrome.storage.local.get(OUTPUT_FORMAT_KEY, (result) => {
      const value = result[OUTPUT_FORMAT_KEY]
      resolve(isOutputPreset(value) ? value : "jsonl")
    })
  })
}

/** Persist the preferred output preset. */
export function setOutputPreset(preset: OutputPreset): void {
  chrome.storage.local.set({ [OUTPUT_FORMAT_KEY]: preset })
}
