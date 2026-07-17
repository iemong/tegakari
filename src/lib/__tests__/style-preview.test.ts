import { beforeEach, describe, expect, it } from "vitest"

import {
  applyStylePreview,
  buildStyleDelta,
  composeBoxShorthand,
  getComputedStyleValue,
  nextEditOrder,
  resolveStyleTweakTarget,
  revertAllStylePreviews,
  revertAnnotationStylePreview,
  revertStylePreview,
  stepNumericValue,
  toHexColor,
} from "../style-preview"
import type { Annotation } from "../types"

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: { selector: "#target", tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
    ...overrides,
  }
}

beforeEach(() => {
  document.body.innerHTML = ""
})

describe("composeBoxShorthand", () => {
  it("collapses to a single value when all 4 sides match", () => {
    expect(composeBoxShorthand(["8px", "8px", "8px", "8px"])).toBe("8px")
  })

  it("collapses to 2 values when top/bottom and left/right each match", () => {
    expect(composeBoxShorthand(["8px", "16px", "8px", "16px"])).toBe("8px 16px")
  })

  it("keeps all 4 values otherwise", () => {
    expect(composeBoxShorthand(["1px", "2px", "3px", "4px"])).toBe(
      "1px 2px 3px 4px"
    )
  })
})

describe("getComputedStyleValue", () => {
  it("composes margin/padding into a shorthand from the longhand computed values", () => {
    const el = document.createElement("div")
    el.style.margin = "10px"
    document.body.appendChild(el)

    expect(getComputedStyleValue(el, "margin")).toBe("10px")
  })

  it("returns the plain computed value for non-shorthand properties", () => {
    const el = document.createElement("div")
    el.style.fontSize = "14px"
    document.body.appendChild(el)

    expect(getComputedStyleValue(el, "font-size")).toBe("14px")
  })
})

describe("applyStylePreview / revertStylePreview", () => {
  it("captures the pre-existing inline value and restores it on revert", () => {
    const el = document.createElement("div")
    el.style.setProperty("color", "red")

    applyStylePreview(el, "color", "blue")
    expect(el.style.getPropertyValue("color")).toBe("blue")

    revertStylePreview(el, "color")
    expect(el.style.getPropertyValue("color")).toBe("red")
  })

  it("removes the property on revert when there was no prior inline value", () => {
    const el = document.createElement("div")

    applyStylePreview(el, "color", "blue")
    expect(el.style.getPropertyValue("color")).toBe("blue")

    revertStylePreview(el, "color")
    expect(el.style.getPropertyValue("color")).toBe("")
  })

  it("keeps the first captured baseline across repeated edits, not the latest preview", () => {
    const el = document.createElement("div")
    el.style.setProperty("margin", "4px")

    applyStylePreview(el, "margin", "8px")
    applyStylePreview(el, "margin", "16px")
    expect(el.style.getPropertyValue("margin")).toBe("16px")

    revertStylePreview(el, "margin")
    expect(el.style.getPropertyValue("margin")).toBe("4px")
  })

  it("tracks each property independently on the same element", () => {
    const el = document.createElement("div")
    el.style.setProperty("color", "red")

    applyStylePreview(el, "color", "blue")
    applyStylePreview(el, "gap", "4px")
    revertStylePreview(el, "gap")

    expect(el.style.getPropertyValue("color")).toBe("blue")
    expect(el.style.getPropertyValue("gap")).toBe("")
  })

  it("re-capturing after a revert uses the (now reverted) current value as the new baseline", () => {
    const el = document.createElement("div")

    applyStylePreview(el, "color", "blue")
    revertStylePreview(el, "color")
    applyStylePreview(el, "color", "green")
    revertStylePreview(el, "color")

    expect(el.style.getPropertyValue("color")).toBe("")
  })

  it("reverting an untouched property is a harmless no-op", () => {
    const el = document.createElement("div")
    expect(() => revertStylePreview(el, "gap")).not.toThrow()
    expect(el.style.getPropertyValue("gap")).toBe("")
  })
})

describe("revertAllStylePreviews", () => {
  it("reverts every listed property", () => {
    const el = document.createElement("div")
    el.style.setProperty("color", "red")

    applyStylePreview(el, "color", "blue")
    applyStylePreview(el, "gap", "4px")
    revertAllStylePreviews(el, ["color", "gap"])

    expect(el.style.getPropertyValue("color")).toBe("red")
    expect(el.style.getPropertyValue("gap")).toBe("")
  })

  it("defaults to the full STYLE_TWEAK_PROPERTIES list when none is given", () => {
    const el = document.createElement("div")
    applyStylePreview(el, "border-radius", "4px")
    revertAllStylePreviews(el)
    expect(el.style.getPropertyValue("border-radius")).toBe("")
  })
})

describe("resolveStyleTweakTarget", () => {
  it("finds an element by selector", () => {
    const el = document.createElement("div")
    el.id = "target"
    document.body.appendChild(el)

    expect(resolveStyleTweakTarget("#target")).toBe(el)
  })

  it("returns null when nothing matches", () => {
    expect(resolveStyleTweakTarget("#missing")).toBeNull()
  })

  it("returns null instead of throwing for an invalid selector", () => {
    expect(resolveStyleTweakTarget(":::not-a-selector")).toBeNull()
  })
})

describe("revertAnnotationStylePreview", () => {
  it("reverts the preview on the annotation's resolved element", () => {
    const el = document.createElement("div")
    el.id = "target"
    el.style.setProperty("color", "red")
    document.body.appendChild(el)
    applyStylePreview(el, "color", "blue")

    revertAnnotationStylePreview(makeAnnotation())

    expect(el.style.getPropertyValue("color")).toBe("red")
  })

  it("is a no-op when the element can't be resolved", () => {
    expect(() =>
      revertAnnotationStylePreview(
        makeAnnotation({
          elementInfo: { selector: "#missing", tag: "div", text: "", attributes: {} },
        })
      )
    ).not.toThrow()
  })
})

describe("toHexColor", () => {
  it("lowercases an existing hex value", () => {
    expect(toHexColor("#2563EB")).toBe("#2563eb")
  })

  it("converts rgb() to hex", () => {
    expect(toHexColor("rgb(37, 99, 235)")).toBe("#2563eb")
  })

  it("converts rgba() to hex, ignoring alpha", () => {
    expect(toHexColor("rgba(37, 99, 235, 0.5)")).toBe("#2563eb")
  })

  it("returns null for values it can't convert", () => {
    expect(toHexColor("transparent")).toBeNull()
    expect(toHexColor("var(--brand)")).toBeNull()
  })
})

describe("stepNumericValue", () => {
  it("increments a px value by the step", () => {
    expect(stepNumericValue("14px", 1)).toBe("15px")
  })

  it("decrements a px value by the step", () => {
    expect(stepNumericValue("14px", -1)).toBe("13px")
  })

  it("supports a custom step size and unitless values", () => {
    expect(stepNumericValue("1.5", 1, 0.5)).toBe("2")
  })

  it("rounds away floating point drift", () => {
    expect(stepNumericValue("0.1px", 1, 0.2)).toBe("0.3px")
  })

  it("returns unparseable input unchanged", () => {
    expect(stepNumericValue("normal", 1)).toBe("normal")
  })
})

describe("buildStyleDelta", () => {
  it("returns undefined when no row changed", () => {
    const rows = [{ property: "margin", before: "16px", value: "16px" }]
    expect(buildStyleDelta(rows, [])).toBeUndefined()
  })

  it("excludes unchanged rows and orders changed ones by editOrder", () => {
    const rows = [
      { property: "margin", before: "16px", value: "8px" },
      { property: "color", before: "red", value: "blue" },
      { property: "gap", before: "4px", value: "4px" },
    ]
    const result = buildStyleDelta(rows, ["color", "margin"])

    expect(result).toEqual([
      { property: "color", before: "red", after: "blue" },
      { property: "margin", before: "16px", after: "8px" },
    ])
  })

  it("appends changed properties missing from editOrder, in row order, as a fallback", () => {
    const rows = [
      { property: "margin", before: "16px", value: "8px" },
      { property: "color", before: "red", value: "blue" },
    ]
    const result = buildStyleDelta(rows, [])

    expect(result?.map((d) => d.property)).toEqual(["margin", "color"])
  })
})

describe("nextEditOrder", () => {
  it("appends a property the first time it changes", () => {
    expect(nextEditOrder([], "margin", true)).toEqual(["margin"])
  })

  it("does not duplicate or reorder an already-tracked property on re-edit", () => {
    expect(nextEditOrder(["margin", "color"], "margin", true)).toEqual([
      "margin",
      "color",
    ])
  })

  it("removes a property once it reverts back to its before value", () => {
    expect(nextEditOrder(["margin", "color"], "margin", false)).toEqual([
      "color",
    ])
  })

  it("leaves the order unchanged when reverting a property that wasn't tracked", () => {
    expect(nextEditOrder(["color"], "margin", false)).toEqual(["color"])
  })
})
