import { expect, it } from "vitest"

import {
  clampToViewport,
  midpoint,
  pinViewportPosition,
  resolveRelationGeometry,
} from "../relation-geometry"
import type { Annotation } from "../types"

function annotation(id: number, pageX: number, pageY: number): Annotation {
  return {
    id,
    elementInfo: { selector: `#a${id}`, tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX,
    pageY,
    createdAt: 0,
  }
}

it("pinViewportPosition: subtracts scroll from the document-relative position", () => {
  expect(pinViewportPosition({ pageX: 200, pageY: 150 }, { x: 50, y: 20 })).toEqual({
    x: 150,
    y: 130,
  })
})

it("midpoint: averages the two points", () => {
  expect(midpoint({ x: 0, y: 0 }, { x: 100, y: 50 })).toEqual({ x: 50, y: 25 })
})

it("resolveRelationGeometry: resolves both endpoints and the midpoint", () => {
  const annotations = [annotation(1, 100, 100), annotation(2, 300, 100)]
  const geo = resolveRelationGeometry(
    { fromId: 1, toId: 2 },
    annotations,
    { x: 0, y: 0 }
  )
  expect(geo).toEqual({
    from: { x: 100, y: 100 },
    to: { x: 300, y: 100 },
    mid: { x: 200, y: 100 },
  })
})

it("resolveRelationGeometry: applies scroll offset to both endpoints", () => {
  const annotations = [annotation(1, 100, 100), annotation(2, 300, 100)]
  const geo = resolveRelationGeometry(
    { fromId: 1, toId: 2 },
    annotations,
    { x: 20, y: 10 }
  )
  expect(geo?.from).toEqual({ x: 80, y: 90 })
  expect(geo?.to).toEqual({ x: 280, y: 90 })
})

it("resolveRelationGeometry: returns null when a referenced pin no longer exists", () => {
  const annotations = [annotation(1, 100, 100)]
  const geo = resolveRelationGeometry({ fromId: 1, toId: 99 }, annotations, {
    x: 0,
    y: 0,
  })
  expect(geo).toBeNull()
})

it("clampToViewport: leaves a point inside the viewport untouched", () => {
  expect(clampToViewport({ x: 100, y: 100 }, { width: 1000, height: 800 })).toEqual({
    x: 100,
    y: 100,
  })
})

it("clampToViewport: clamps a point past the edges to the margin", () => {
  expect(clampToViewport({ x: -50, y: 900 }, { width: 1000, height: 800 })).toEqual({
    x: 8,
    y: 792,
  })
})

it("clampToViewport: does not invert min/max on a viewport narrower than 2×margin", () => {
  expect(clampToViewport({ x: 5, y: 5 }, { width: 10, height: 10 }, 8)).toEqual({
    x: 8,
    y: 8,
  })
})
