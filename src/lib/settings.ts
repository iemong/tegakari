/** Persisted user settings stored in `chrome.storage.local`. */

export const IFRAME_SELECTION_KEY = "tegakariIframeSelection"

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
