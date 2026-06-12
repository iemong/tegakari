// Collect the styles that are actually in effect on an element, as a compact
// subset for AI context: a curated property list diffed against the browser's
// default styles for the same tag, so only meaningful deviations are emitted.

const STYLE_PROPERTIES = [
  // layout
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-self",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
  "overflow",
  // box model
  "width",
  "height",
  "margin",
  "padding",
  "box-sizing",
  "border",
  "border-radius",
  // typography
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration",
  "white-space",
  "color",
  // visual
  "background-color",
  "background-image",
  "opacity",
  "box-shadow",
  "cursor",
  "transform",
  "transition",
] as const

const baselineCache = new Map<string, Record<string, string>>()

export function collectElementStyles(
  element: Element
): Record<string, string> | undefined {
  const doc = element.ownerDocument
  const win = doc?.defaultView
  if (!doc || !win) return undefined

  const computed = win.getComputedStyle(element)
  const baseline = getBaseline(element.tagName, doc, win)

  const styles: Record<string, string> = {}
  for (const prop of STYLE_PROPERTIES) {
    const value = computed.getPropertyValue(prop)
    if (!value || value === baseline[prop]) continue
    styles[prop] = value
  }

  return Object.keys(styles).length > 0 ? styles : undefined
}

// Default styles for a tag, probed via a detached-from-layout element.
// The display:none wrapper keeps the probe out of layout and rendering;
// inherited values from <body> become part of the baseline, so styles the
// element merely inherits from the page root are treated as defaults too.
function getBaseline(
  tagName: string,
  doc: Document,
  win: Window & typeof globalThis
): Record<string, string> {
  const key = tagName.toLowerCase()
  const cached = baselineCache.get(key)
  if (cached) return cached

  const wrapper = doc.createElement("div")
  wrapper.style.display = "none"
  const probe = doc.createElement(key)
  wrapper.appendChild(probe)
  doc.body.appendChild(wrapper)

  const computed = win.getComputedStyle(probe)
  const baseline: Record<string, string> = {}
  for (const prop of STYLE_PROPERTIES) {
    baseline[prop] = computed.getPropertyValue(prop)
  }

  doc.body.removeChild(wrapper)
  baselineCache.set(key, baseline)
  return baseline
}

/** Test hook: baselines are cached per tag for the page's lifetime. */
export function clearBaselineCache(): void {
  baselineCache.clear()
}
