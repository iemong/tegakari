import { afterEach, expect, it } from "vitest"

import { collectSvelteComponent } from "../svelte-collector"

function attachMeta(el: Element, file: string, line?: number) {
  ;(el as any).__svelte_meta = { loc: { file, line } }
}

afterEach(() => {
  document.body.innerHTML = ""
})

it("returns null when no ancestor has __svelte_meta (prod build)", () => {
  const el = document.createElement("div")
  document.body.appendChild(el)

  expect(collectSvelteComponent(el)).toBeNull()
})

it("collects hierarchy and source from the clicked element's own meta", () => {
  const el = document.createElement("button")
  attachMeta(el, "src/components/SubmitButton.svelte", 12)
  document.body.appendChild(el)

  const result = collectSvelteComponent(el)

  expect(result).not.toBeNull()
  expect(result!.framework).toBe("svelte")
  expect(result!.hierarchy).toEqual(["SubmitButton"])
  expect(result!.source).toEqual({
    file: "src/components/SubmitButton.svelte",
    line: 12,
  })
})

it("walks ancestors and builds hierarchy root -> leaf", () => {
  const root = document.createElement("div")
  attachMeta(root, "src/routes/+page.svelte", 1)
  const parent = document.createElement("section")
  attachMeta(parent, "src/lib/Card.svelte", 5)
  const child = document.createElement("button")
  attachMeta(child, "src/lib/SubmitButton.svelte", 2)

  root.appendChild(parent)
  parent.appendChild(child)
  document.body.appendChild(root)

  const result = collectSvelteComponent(child)

  expect(result!.hierarchy).toEqual(["+page", "Card", "SubmitButton"])
  expect(result!.source).toEqual({
    file: "src/lib/SubmitButton.svelte",
    line: 2,
  })
})

it("skips ancestors without meta and dedupes repeated files", () => {
  const root = document.createElement("div")
  attachMeta(root, "src/lib/Card.svelte", 1)
  const plainWrapper = document.createElement("div") // no __svelte_meta
  const child = document.createElement("span")
  attachMeta(child, "src/lib/Card.svelte", 4)

  root.appendChild(plainWrapper)
  plainWrapper.appendChild(child)
  document.body.appendChild(root)

  const result = collectSvelteComponent(child)

  expect(result!.hierarchy).toEqual(["Card"])
  // nearest (leaf-most) loc wins for `source`
  expect(result!.source).toEqual({ file: "src/lib/Card.svelte", line: 4 })
})

it("omits line when loc has no line number", () => {
  const el = document.createElement("div")
  attachMeta(el, "src/lib/NoLine.svelte")
  document.body.appendChild(el)

  const result = collectSvelteComponent(el)

  expect(result!.source).toEqual({ file: "src/lib/NoLine.svelte" })
})

it("omits props and state (not safely obtainable across Svelte 4/5)", () => {
  const el = document.createElement("div")
  attachMeta(el, "src/lib/Widget.svelte", 1)
  document.body.appendChild(el)

  const result = collectSvelteComponent(el)

  expect(result!.props).toBeUndefined()
  expect(result!.state).toBeUndefined()
})

it("strips directory path and extension when building hierarchy names", () => {
  const el = document.createElement("div")
  attachMeta(el, "src/routes/(app)/dashboard/+page.svelte", 1)
  document.body.appendChild(el)

  const result = collectSvelteComponent(el)

  expect(result!.hierarchy).toEqual(["+page"])
})
