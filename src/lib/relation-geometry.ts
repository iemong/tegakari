// Pure coordinate math for the relation SVG layer (`~components/RelationLayer`).
// Kept framework/DOM-free (scroll/viewport values are passed in) so the
// layout logic is unit-testable without jsdom's layout quirks.

import type { Annotation, Relation } from "./types"

export interface Point {
  x: number
  y: number
}

/**
 * Convert a stored document-relative pin position (`Annotation.pageX/pageY`)
 * to the current viewport-relative position — mirrors the `pos` calculation
 * in `AnnotationPin.tsx` so lines/labels track the pin exactly.
 */
export function pinViewportPosition(
  annotation: Pick<Annotation, "pageX" | "pageY">,
  scroll: Point
): Point {
  return { x: annotation.pageX - scroll.x, y: annotation.pageY - scroll.y }
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export interface RelationGeometry {
  from: Point
  to: Point
  mid: Point
}

/**
 * Resolves a relation's two pin positions + midpoint, or `null` if either
 * referenced annotation is gone (defensive — cascade delete should prevent
 * this in practice).
 */
export function resolveRelationGeometry(
  relation: Pick<Relation, "fromId" | "toId">,
  annotations: Annotation[],
  scroll: Point
): RelationGeometry | null {
  const from = annotations.find((a) => a.id === relation.fromId)
  const to = annotations.find((a) => a.id === relation.toId)
  if (!from || !to) return null
  const fromPos = pinViewportPosition(from, scroll)
  const toPos = pinViewportPosition(to, scroll)
  return { from: fromPos, to: toPos, mid: midpoint(fromPos, toPos) }
}

/** Keeps a point within the viewport (minus `margin`) so a popover anchored to it stays fully visible. */
export function clampToViewport(
  point: Point,
  viewport: { width: number; height: number },
  margin = 8
): Point {
  return {
    x: Math.min(Math.max(point.x, margin), Math.max(margin, viewport.width - margin)),
    y: Math.min(Math.max(point.y, margin), Math.max(margin, viewport.height - margin)),
  }
}
