import { collectCssProvenance } from "~lib/css-provenance"
import { collectElementStyles } from "~lib/style-collector"
import type { CaptureResponse, ElementInfo, Rect } from "~lib/types"

const INTERESTING_ATTRS = [
  "class",
  "id",
  "name",
  "type",
  "href",
  "src",
  "role",
  "aria-label",
  "aria-describedby",
  "data-testid",
]

export function getAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {}

  for (const name of INTERESTING_ATTRS) {
    const value = element.getAttribute(name)
    if (value !== null) {
      attrs[name] = value
    }
  }

  // Include data-* attributes not already captured
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith("data-") && !(attr.name in attrs)) {
      attrs[attr.name] = attr.value
    }
  }

  return attrs
}

export function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength)}...`
}

export function buildElementInfo(target: Element, selector: string): ElementInfo {
  const styles = collectElementStyles(target)
  // Uses target.ownerDocument internally, so same-origin iframe elements
  // resolve rules from the iframe's own stylesheets, not the top document's.
  const { cssRules, customProperties } = collectCssProvenance(target)
  return {
    selector,
    tag: target.tagName.toLowerCase(),
    text: truncateText((target as HTMLElement).innerText || "", 200),
    attributes: getAttributes(target),
    ...(styles ? { styles } : {}),
    ...(cssRules ? { cssRules } : {}),
    ...(customProperties ? { customProperties } : {}),
  }
}

export function isFromPlasmoUI(e: Event): boolean {
  return e
    .composedPath()
    .some(
      (node) =>
        node instanceof HTMLElement &&
        (node.id?.startsWith("plasmo-") ||
          node.tagName?.toLowerCase().startsWith("plasmo-"))
    )
}

/** Capture visible tab screenshot via background */
export async function captureScreenshot(): Promise<string | null> {
  try {
    const response: CaptureResponse = await chrome.runtime.sendMessage({
      type: "TEGAKARI_CAPTURE",
    })
    if (response.success && response.dataUrl) {
      return response.dataUrl
    }
  } catch {
    // silently fail
  }
  return null
}

/** Crop a screenshot to the element's bounding rect */
export async function cropToElement(
  fullDataUrl: string,
  rect: Rect,
  padding = 20
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1
      const x = Math.max(0, (rect.left - padding) * dpr)
      const y = Math.max(0, (rect.top - padding) * dpr)
      const w = Math.min(img.width - x, (rect.width + padding * 2) * dpr)
      const h = Math.min(img.height - y, (rect.height + padding * 2) * dpr)

      const canvas = document.createElement("canvas")
      // Limit output size for storage
      const maxW = 400
      const scale = w > maxW ? maxW / w : 1
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/jpeg", 0.7))
    }
    img.onerror = () => resolve(fullDataUrl)
    img.src = fullDataUrl
  })
}
