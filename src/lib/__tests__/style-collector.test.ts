import { afterEach, beforeEach, expect, it } from "vitest"
import { clearBaselineCache, collectElementStyles } from "../style-collector"

beforeEach(() => {
  clearBaselineCache()
})

afterEach(() => {
  document.body.innerHTML = ""
})

function mount(el: HTMLElement): HTMLElement {
  document.body.appendChild(el)
  return el
}

it("collectElementStyles: should return inline-styled properties", () => {
  const el = mount(document.createElement("div"))
  el.style.display = "flex"
  el.style.padding = "8px"

  const styles = collectElementStyles(el)

  expect(styles).toMatchObject({ display: "flex", padding: "8px" })
})

it("collectElementStyles: should omit properties equal to the tag default", () => {
  const el = mount(document.createElement("div"))
  el.style.color = "red"

  const styles = collectElementStyles(el)

  // display:block is the div default — must be diffed away
  expect(styles).toBeDefined()
  expect(styles!.display).toBeUndefined()
  expect(styles!.color).toBe("rgb(255, 0, 0)")
})

it("collectElementStyles: should return undefined for an unstyled element", () => {
  const el = mount(document.createElement("div"))

  expect(collectElementStyles(el)).toBeUndefined()
})

it("collectElementStyles: should use per-tag baselines (span default differs from div)", () => {
  const span = mount(document.createElement("span"))
  span.style.display = "inline"
  const div = mount(document.createElement("div"))
  div.style.display = "block"

  // Each matches its own tag default, so both diff away
  expect(collectElementStyles(span)).toBeUndefined()
  expect(collectElementStyles(div)).toBeUndefined()
})

it("collectElementStyles: should pick up styles applied via stylesheet class", () => {
  const style = document.createElement("style")
  style.textContent = ".accent { color: rgb(37, 99, 235); }"
  document.head.appendChild(style)
  const el = mount(document.createElement("div"))
  el.className = "accent"

  const styles = collectElementStyles(el)

  expect(styles).toMatchObject({ color: "rgb(37, 99, 235)" })
  document.head.removeChild(style)
})

it("collectElementStyles: should not leave probe elements in the document", () => {
  const el = mount(document.createElement("div"))
  el.style.color = "red"
  const childCountBefore = document.body.childElementCount

  collectElementStyles(el)

  expect(document.body.childElementCount).toBe(childCountBefore)
})

it("collectElementStyles: should return undefined when the document has no window", () => {
  const orphanDoc = document.implementation.createHTMLDocument("")
  const detached = orphanDoc.createElement("div")
  // defaultView is null for documents created via createHTMLDocument
  expect(collectElementStyles(detached)).toBeUndefined()
})
