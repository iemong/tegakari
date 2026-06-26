import type { Rect } from "./types"

/**
 * Same-origin iframe support for element picking.
 *
 * The overlay UI lives only in the top frame. To let users select elements
 * inside an iframe (e.g. a Google Apps Script web app that renders its UI in an
 * iframe), the top frame reaches into accessible (same-origin) iframe documents
 * directly and translates their viewport coordinates into the top viewport.
 *
 * Cross-origin iframes are inaccessible by browser security policy and are
 * skipped silently — see docs/output-spec.md / README for the documented limit.
 */

/** A point offset (in CSS px) added to translate a frame's coords to the top. */
export interface FrameOffset {
  x: number
  y: number
}

export const TOP_FRAME_OFFSET: FrameOffset = { x: 0, y: 0 }

/** Returns the iframe's document if it is same-origin and accessible, else null. */
export function accessibleDocument(
  iframe: HTMLIFrameElement
): Document | null {
  try {
    // Accessing contentDocument on a cross-origin iframe throws or returns null.
    const doc = iframe.contentDocument
    if (doc && doc.body) return doc
    return null
  } catch {
    return null
  }
}

/** Collect every same-origin iframe currently reachable under `root`. */
export function getSameOriginIframes(root: Document): HTMLIFrameElement[] {
  const iframes = Array.from(root.querySelectorAll("iframe"))
  return iframes.filter((f) => accessibleDocument(f) !== null)
}

/**
 * The offset (in top-viewport CSS px) of an iframe's content origin. Adding this
 * to a `getBoundingClientRect()` measured inside the iframe yields top-viewport
 * coordinates. `clientLeft`/`clientTop` account for the iframe's border.
 */
export function getFrameOffset(iframe: HTMLIFrameElement): FrameOffset {
  const rect = iframe.getBoundingClientRect()
  return {
    x: rect.left + iframe.clientLeft,
    y: rect.top + iframe.clientTop,
  }
}

/** Translate an element's viewport rect by a frame offset into top coordinates. */
export function toTopViewportRect(
  element: Element,
  offset: FrameOffset
): Rect {
  const r = element.getBoundingClientRect()
  return {
    top: r.top + offset.y,
    left: r.left + offset.x,
    width: r.width,
    height: r.height,
  }
}
