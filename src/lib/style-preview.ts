// Pure(ish) helpers behind the "Adjust styles" panel (pin popover): reading
// computed values, applying/reverting a live inline-style preview on the
// target element, and composing the final `StyleDelta[]` to persist. DOM
// access is isolated to small, individually testable functions so the
// panel/hook stay thin.

import type { Annotation, StyleDelta } from "./types"

export type StyleTweakInputKind = "shorthand" | "color" | "numeric"

export interface StyleTweakProperty {
  property: string
  kind: StyleTweakInputKind
}

/** v1 target properties, in the fixed order they're shown in the panel. */
export const STYLE_TWEAK_PROPERTIES: readonly StyleTweakProperty[] = [
  { property: "margin", kind: "shorthand" },
  { property: "padding", kind: "shorthand" },
  { property: "font-size", kind: "numeric" },
  { property: "line-height", kind: "numeric" },
  { property: "color", kind: "color" },
  { property: "background-color", kind: "color" },
  { property: "border-radius", kind: "numeric" },
  { property: "gap", kind: "numeric" },
]

const SHORTHAND_LONGHANDS = new Set(["margin", "padding"])

/**
 * Compose a CSS box shorthand value from its 4 longhand values: 1 value when
 * all sides match, 2 when top/bottom and left/right each match, else 4.
 */
export function composeBoxShorthand(
  values: readonly [top: string, right: string, bottom: string, left: string]
): string {
  const [top, right, bottom, left] = values
  if (top === right && right === bottom && bottom === left) return top
  if (top === bottom && right === left) return `${top} ${right}`
  return `${top} ${right} ${bottom} ${left}`
}

function computedShorthand(element: Element, property: string): string {
  const cs = getComputedStyle(element)
  return composeBoxShorthand([
    cs.getPropertyValue(`${property}-top`),
    cs.getPropertyValue(`${property}-right`),
    cs.getPropertyValue(`${property}-bottom`),
    cs.getPropertyValue(`${property}-left`),
  ])
}

/** The current value shown for a row: computed shorthand for margin/padding, plain computed value otherwise. */
export function getComputedStyleValue(element: Element, property: string): string {
  if (SHORTHAND_LONGHANDS.has(property)) return computedShorthand(element, property)
  return getComputedStyle(element).getPropertyValue(property)
}

// Per-element/property original inline style values, captured the first time
// a preview is applied so `revertStylePreview` can restore exactly what was
// there before — including "nothing" (no prior inline style).
const originalInlineValues = new WeakMap<Element, Map<string, string | null>>()

// Known v1 limitation: for `margin`/`padding`, this reads the shorthand
// getter, so a pre-existing *partial* longhand-only inline style (e.g. just
// `margin-top`) is invisible here and gets wiped by `revertStylePreview`
// instead of restored. Full inline shorthands, single-value properties
// (color, font-size, ...) and "no prior inline style" all restore exactly;
// only the partial-longhand case is affected, and it's transient (the page's
// own source styling returns on reload since tegakari never persists it).
function captureOriginalValue(element: Element, property: string): void {
  let byProperty = originalInlineValues.get(element)
  if (!byProperty) {
    byProperty = new Map()
    originalInlineValues.set(element, byProperty)
  }
  if (byProperty.has(property)) return
  const htmlEl = element as HTMLElement
  byProperty.set(property, htmlEl.style.getPropertyValue(property) || null)
}

/** Apply an inline-style preview, capturing the pre-existing inline value first (once). */
export function applyStylePreview(element: Element, property: string, value: string): void {
  captureOriginalValue(element, property)
  ;(element as HTMLElement).style.setProperty(property, value)
}

/** Restore the captured original inline value (or remove the property if there was none). */
export function revertStylePreview(element: Element, property: string): void {
  const byProperty = originalInlineValues.get(element)
  const original = byProperty?.get(property) ?? null
  const htmlEl = element as HTMLElement
  if (original) {
    htmlEl.style.setProperty(property, original)
  } else {
    htmlEl.style.removeProperty(property)
  }
  byProperty?.delete(property)
}

export function revertAllStylePreviews(
  element: Element,
  properties: readonly string[] = STYLE_TWEAK_PROPERTIES.map((p) => p.property)
): void {
  for (const property of properties) revertStylePreview(element, property)
}

/** Best-effort DOM lookup for an annotation's element; `null` if it can't be resolved (e.g. page changed, invalid selector). */
export function resolveStyleTweakTarget(selector: string): Element | null {
  try {
    return document.querySelector(selector)
  } catch {
    return null
  }
}

/** Revert any live style preview for an annotation's element (used on delete/clear-all). No-op if unresolved or untouched. */
export function revertAnnotationStylePreview(annotation: Annotation): void {
  const element = resolveStyleTweakTarget(annotation.elementInfo.selector)
  if (element) revertAllStylePreviews(element)
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const RGB_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/

/** Convert a computed color (`rgb()`/`rgba()`) or existing hex string to `#rrggbb`; `null` if not convertible. */
export function toHexColor(value: string): string | null {
  const trimmed = value.trim()
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase()
  const match = trimmed.match(RGB_RE)
  if (!match) return null
  const [, r, g, b] = match
  return `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`
}

/** Step a leading numeric value by `delta * step`, preserving its trailing unit (e.g. "14px" -> "15px"). Unparseable input is returned unchanged. */
export function stepNumericValue(value: string, delta: number, step = 1): string {
  const match = value.trim().match(/^(-?\d*\.?\d+)(.*)$/)
  if (!match) return value
  const [, numStr, unit] = match
  const next = Math.round((Number.parseFloat(numStr) + delta * step) * 100) / 100
  return `${next}${unit}`
}

interface StyleTweakRowLike {
  property: string
  before: string
  value: string
}

/**
 * Build the final `StyleDelta[]` to persist from panel rows + edit order.
 * Rows where `value === before` are excluded; `undefined` when nothing
 * changed. Ordering follows `editOrder`, with any changed property missing
 * from it (shouldn't normally happen) appended in row order as a fallback.
 */
export function buildStyleDelta(
  rows: readonly StyleTweakRowLike[],
  editOrder: readonly string[]
): StyleDelta[] | undefined {
  const changed = new Map(
    rows.filter((r) => r.value !== r.before).map((r) => [r.property, r])
  )
  if (changed.size === 0) return undefined

  const ordered = [
    ...editOrder.filter((p) => changed.has(p)),
    ...rows.map((r) => r.property).filter((p) => changed.has(p) && !editOrder.includes(p)),
  ]
  return ordered.map((property) => {
    const row = changed.get(property)
    return { property, before: row?.before ?? "", after: row?.value ?? "" }
  })
}

/**
 * Track which properties count as "edited" and in what order: a property is
 * appended the first time it becomes changed, and removed once it reverts
 * back to its `before` value. Re-editing an already-tracked property doesn't
 * move it.
 */
export function nextEditOrder(
  order: readonly string[],
  property: string,
  isChanged: boolean
): string[] {
  const has = order.includes(property)
  if (isChanged) return has ? [...order] : [...order, property]
  return has ? order.filter((p) => p !== property) : [...order]
}
