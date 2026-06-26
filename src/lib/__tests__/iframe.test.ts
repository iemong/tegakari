import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  TOP_FRAME_OFFSET,
  accessibleDocument,
  getFrameOffset,
  getSameOriginIframes,
  toTopViewportRect,
} from "../iframe"

beforeEach(() => {
  document.body.innerHTML = ""
})

describe("accessibleDocument", () => {
  it("returns the contentDocument of a same-origin iframe", () => {
    const iframe = document.createElement("iframe")
    document.body.appendChild(iframe)
    expect(accessibleDocument(iframe)).toBe(iframe.contentDocument)
  })

  it("returns null when contentDocument access throws (cross-origin)", () => {
    const fake = {
      get contentDocument(): Document {
        throw new Error("cross-origin")
      },
    } as unknown as HTMLIFrameElement
    expect(accessibleDocument(fake)).toBeNull()
  })

  it("returns null when contentDocument is null", () => {
    const fake = { contentDocument: null } as unknown as HTMLIFrameElement
    expect(accessibleDocument(fake)).toBeNull()
  })
})

describe("getSameOriginIframes", () => {
  it("collects only the accessible iframes", () => {
    const ok = document.createElement("iframe")
    document.body.appendChild(ok)
    const result = getSameOriginIframes(document)
    expect(result).toContain(ok)
  })

  it("returns an empty array when there are no iframes", () => {
    expect(getSameOriginIframes(document)).toEqual([])
  })
})

describe("getFrameOffset", () => {
  it("adds the iframe border (clientLeft/clientTop) to its viewport position", () => {
    const iframe = document.createElement("iframe")
    vi.spyOn(iframe, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    })
    Object.defineProperty(iframe, "clientLeft", { value: 2 })
    Object.defineProperty(iframe, "clientTop", { value: 3 })
    expect(getFrameOffset(iframe)).toEqual({ x: 102, y: 53 })
  })
})

describe("toTopViewportRect", () => {
  it("returns the element rect unchanged for the top frame offset", () => {
    const div = document.createElement("div")
    vi.spyOn(div, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 30,
      height: 40,
      right: 40,
      bottom: 60,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    })
    expect(toTopViewportRect(div, TOP_FRAME_OFFSET)).toEqual({
      left: 10,
      top: 20,
      width: 30,
      height: 40,
    })
  })

  it("translates the element rect by the frame offset", () => {
    const div = document.createElement("div")
    vi.spyOn(div, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 30,
      height: 40,
      right: 40,
      bottom: 60,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    })
    expect(toTopViewportRect(div, { x: 100, y: 200 })).toEqual({
      left: 110,
      top: 220,
      width: 30,
      height: 40,
    })
  })
})
