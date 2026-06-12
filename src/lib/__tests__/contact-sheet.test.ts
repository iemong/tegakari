import { afterEach, expect, it, vi } from "vitest"
import {
  computeSheetLayout,
  fitRect,
  renderContactSheet,
  SHEET_METRICS,
} from "../contact-sheet"
import type { Annotation } from "../types"

const { cellWidth, cellHeight, gap, padding } = SHEET_METRICS

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: { selector: ".a", tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
    ...overrides,
  }
}

it("computeSheetLayout: single item fills one padded cell", () => {
  const layout = computeSheetLayout(1)

  expect(layout.columns).toBe(1)
  expect(layout.rows).toBe(1)
  expect(layout.width).toBe(padding * 2 + cellWidth)
  expect(layout.height).toBe(padding * 2 + cellHeight)
  expect(layout.cells).toEqual([
    { x: padding, y: padding, width: cellWidth, height: cellHeight },
  ])
})

it("computeSheetLayout: 4 items form a 2x2 grid", () => {
  const layout = computeSheetLayout(4)

  expect(layout.columns).toBe(2)
  expect(layout.rows).toBe(2)
  expect(layout.width).toBe(padding * 2 + cellWidth * 2 + gap)
  expect(layout.cells[3]).toEqual({
    x: padding + cellWidth + gap,
    y: padding + cellHeight + gap,
    width: cellWidth,
    height: cellHeight,
  })
})

it("computeSheetLayout: 5 items use 3 columns and 2 rows", () => {
  const layout = computeSheetLayout(5)

  expect(layout.columns).toBe(3)
  expect(layout.rows).toBe(2)
  expect(layout.cells).toHaveLength(5)
})

it("fitRect: scales a large landscape image down to fit, centered", () => {
  const cell = { x: 0, y: 0, width: 100, height: 100 }
  const fitted = fitRect(200, 100, cell)

  expect(fitted.width).toBe(100)
  expect(fitted.height).toBe(50)
  expect(fitted.x).toBe(0)
  expect(fitted.y).toBe(25)
})

it("fitRect: never upscales a small image", () => {
  const cell = { x: 10, y: 10, width: 100, height: 100 }
  const fitted = fitRect(40, 20, cell)

  expect(fitted.width).toBe(40)
  expect(fitted.height).toBe(20)
  expect(fitted.x).toBe(10 + 30)
  expect(fitted.y).toBe(10 + 40)
})

it("renderContactSheet: returns null when no annotation has a screenshot", async () => {
  const result = await renderContactSheet([createAnnotation()])
  expect(result).toBeNull()
})

it("renderContactSheet: returns null when every image fails to load", async () => {
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
  )

  const result = await renderContactSheet([
    createAnnotation({ screenshot: "data:image/jpeg;base64,broken" }),
  ])

  expect(result).toBeNull()
})

function stubLoadableImage(w = 200, h = 100) {
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = w
      height = h
      set src(_v: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
  )
}

function stubCanvas(ctx: unknown, blob: Blob | null) {
  const original = document.createElement.bind(document)
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag !== "canvas") return original(tag)
    return {
      width: 0,
      height: 0,
      getContext: () => ctx,
      toBlob: (cb: (b: Blob | null) => void) => cb(blob),
    } as unknown as HTMLCanvasElement
  })
}

function createMockContext() {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
  }
}

it("renderContactSheet: draws each screenshot with its id badge and returns a blob", async () => {
  stubLoadableImage()
  const ctx = createMockContext()
  const blob = new Blob(["png"], { type: "image/png" })
  stubCanvas(ctx, blob)

  const result = await renderContactSheet([
    createAnnotation({ id: 1, screenshot: "data:image/jpeg;base64,a" }),
    createAnnotation({ id: 3, screenshot: "data:image/jpeg;base64,b" }),
    createAnnotation({ id: 4 }), // no screenshot — skipped
  ])

  expect(result).toBe(blob)
  expect(ctx.drawImage).toHaveBeenCalledTimes(2)
  expect(ctx.fillText).toHaveBeenCalledWith("1", expect.any(Number), expect.any(Number))
  expect(ctx.fillText).toHaveBeenCalledWith("3", expect.any(Number), expect.any(Number))
})

it("renderContactSheet: returns null when the canvas has no 2d context", async () => {
  stubLoadableImage()
  stubCanvas(null, null)

  const result = await renderContactSheet([
    createAnnotation({ screenshot: "data:image/jpeg;base64,a" }),
  ])

  expect(result).toBeNull()
})
