/**
 * Climb up the DOM tree from `base` by at most `steps` parents.
 *
 * Used by the parent-selection shortcut (`\` / ArrowUp): starting from the
 * element under the cursor, the user can walk up the ancestor chain to reach a
 * container that is hard to hover directly.
 *
 * Stops before reaching the document's `<body>` / `<html>` so the outermost
 * selectable element is a direct child of `<body>` (selecting the whole body
 * is rarely useful). Uses `ownerDocument` so it works for elements inside a
 * same-origin iframe too (stops at the iframe's own body).
 *
 * Returns the resolved element together with the number of steps actually
 * taken, so callers can clamp their requested offset and keep ArrowUp/ArrowDown
 * in sync with what is visible.
 */
export function climbToAncestor(
  base: Element,
  steps: number
): { element: Element; steps: number } {
  const doc = base.ownerDocument
  let current = base
  let taken = 0

  for (let i = 0; i < steps; i++) {
    const parent = current.parentElement
    if (!parent || parent === doc.body || parent === doc.documentElement) break
    current = parent
    taken++
  }

  return { element: current, steps: taken }
}
