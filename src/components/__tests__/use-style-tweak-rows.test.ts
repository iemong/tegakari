import { act, renderHook } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"

import type { Annotation } from "~lib/types"

import { seedRows, useStyleTweakRows } from "../use-style-tweak-rows"

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

it("seedRows: uses a fresh computed read as before/value when there's no saved delta", () => {
  const el = document.createElement("div")
  el.style.gap = "4px"

  const rows = seedRows(makeAnnotation(), el)
  const gapRow = rows.find((r) => r.property === "gap")

  expect(gapRow).toMatchObject({ before: "4px", value: "4px" })
})

it("seedRows: prefills before/value from a saved styleDelta entry", () => {
  const el = document.createElement("div")
  el.style.margin = "16px" // already-applied preview from a prior session

  const rows = seedRows(
    makeAnnotation({
      styleDelta: [{ property: "margin", before: "8px", after: "16px" }],
    }),
    el
  )
  const marginRow = rows.find((r) => r.property === "margin")

  expect(marginRow).toMatchObject({ before: "8px", value: "16px" })
})

it("seedRows: falls back to an empty before/value when the element can't be resolved", () => {
  const rows = seedRows(makeAnnotation(), null)
  expect(rows.every((r) => r.before === "" && r.value === "")).toBe(true)
})

it("useStyleTweakRows: seeds rows once the popover becomes active", () => {
  const el = document.createElement("div")
  el.id = "target"
  document.body.appendChild(el)
  const onChange = vi.fn()

  const { result } = renderHook(() =>
    useStyleTweakRows({ annotation: makeAnnotation(), isActive: true, onChange })
  )

  expect(result.current.rows).toHaveLength(8)
  expect(onChange).not.toHaveBeenCalled()
})

it("useStyleTweakRows: editing a value previews it live and reports the styleDelta", () => {
  const el = document.createElement("div")
  el.id = "target"
  document.body.appendChild(el)
  const onChange = vi.fn()

  const { result } = renderHook(() =>
    useStyleTweakRows({ annotation: makeAnnotation(), isActive: true, onChange })
  )

  act(() => result.current.updateValue("gap", "12px"))

  expect(el.style.getPropertyValue("gap")).toBe("12px")
  expect(onChange).toHaveBeenLastCalledWith([
    { property: "gap", before: "", after: "12px" },
  ])
})

it("useStyleTweakRows: resetRow reverts the preview and drops it from the delta", () => {
  const el = document.createElement("div")
  el.id = "target"
  document.body.appendChild(el)
  const onChange = vi.fn()

  const { result } = renderHook(() =>
    useStyleTweakRows({ annotation: makeAnnotation(), isActive: true, onChange })
  )

  act(() => result.current.updateValue("gap", "12px"))
  act(() => result.current.resetRow("gap"))

  expect(el.style.getPropertyValue("gap")).toBe("")
  expect(onChange).toHaveBeenLastCalledWith(undefined)
})

it("useStyleTweakRows: resetAll reverts every edited property", () => {
  const el = document.createElement("div")
  el.id = "target"
  document.body.appendChild(el)
  const onChange = vi.fn()

  const { result } = renderHook(() =>
    useStyleTweakRows({ annotation: makeAnnotation(), isActive: true, onChange })
  )

  act(() => result.current.updateValue("gap", "12px"))
  act(() => result.current.updateValue("color", "blue"))
  act(() => result.current.resetAll())

  expect(el.style.getPropertyValue("gap")).toBe("")
  expect(el.style.getPropertyValue("color")).toBe("")
  expect(onChange).toHaveBeenLastCalledWith(undefined)
})
