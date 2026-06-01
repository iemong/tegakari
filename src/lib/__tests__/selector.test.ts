import { it, expect } from "vitest"

// CSS.escape is not available in jsdom, polyfill before importing module
if (typeof globalThis.CSS === "undefined") {
  ;(globalThis as any).CSS = {
    escape: (s: string) => s.replace(/([^\w-])/g, "\\$1"),
  }
}

import { generateSelector } from "../selector"

it("generateSelector: should return id selector when element has id", () => {
  document.body.innerHTML = '<div id="app"><span></span></div>'
  const el = document.querySelector("#app")!
  expect(generateSelector(el)).toBe("#app")
})

it("generateSelector: should return nested id selector for child of id element", () => {
  document.body.innerHTML = '<div id="app"><span class="text"></span></div>'
  const el = document.querySelector("span")!
  expect(generateSelector(el)).toBe("#app > span.text")
})

it("generateSelector: should use class-based selector when unique among siblings", () => {
  document.body.innerHTML =
    '<div id="root"><span class="unique"></span><p></p></div>'
  const el = document.querySelector("span.unique")!
  expect(generateSelector(el)).toBe("#root > span.unique")
})

it("generateSelector: should fall back to nth-child when class is not unique", () => {
  document.body.innerHTML =
    '<div id="root"><span class="item"></span><span class="item"></span></div>'
  const el = document.querySelectorAll("span")[1]
  expect(generateSelector(el)).toBe("#root > span:nth-child(2)")
})

it("generateSelector: should use tag only when element is only child of its tag", () => {
  document.body.innerHTML = '<div id="root"><span></span><p></p></div>'
  const el = document.querySelector("span")!
  expect(generateSelector(el)).toBe("#root > span")
})

it("generateSelector: should handle deeply nested elements", () => {
  document.body.innerHTML =
    '<div id="app"><div class="wrapper"><ul><li class="item"></li><li class="item"></li></ul></div></div>'
  const el = document.querySelectorAll("li")[1]
  const selector = generateSelector(el)
  expect(selector).toContain("#app")
  expect(document.querySelector(selector)).toBe(el)
})

it("generateSelector: should handle element with no parent (direct child of body)", () => {
  document.body.innerHTML = "<section><p></p></section>"
  const el = document.querySelector("section")!
  expect(generateSelector(el)).toBe("section")
})

it("generateSelector: should handle element with multiple classes", () => {
  document.body.innerHTML =
    '<div id="root"><span class="foo bar"></span><p></p></div>'
  const el = document.querySelector("span")!
  const selector = generateSelector(el)
  expect(selector).toContain("foo")
  expect(selector).toContain("bar")
})

it("generateSelector: should handle element with empty className", () => {
  document.body.innerHTML = '<div id="root"><span></span><span></span></div>'
  const el = document.querySelectorAll("span")[0]
  const selector = generateSelector(el)
  expect(selector).toBe("#root > span:nth-child(1)")
})

it("generateSelector: should handle element whose parent is null (documentElement)", () => {
  const el = document.documentElement
  expect(generateSelector(el)).toBe("")
})

it("generateSelector: should handle element that is document.body", () => {
  expect(generateSelector(document.body)).toBe("")
})

it("generateSelector: should handle class selector that throws on matches()", () => {
  document.body.innerHTML =
    '<div id="root"><span class="a:b"></span><p></p></div>'
  const el = document.querySelector("span")!
  const selector = generateSelector(el)
  // Should not throw, falls back to tag or nth-child
  expect(selector).toBeTruthy()
})

it("generateSelector: should handle element with className that is not a string (SVG)", () => {
  document.body.innerHTML = '<div id="root"><svg><rect></rect></svg></div>'
  const el = document.querySelector("rect")!
  const selector = generateSelector(el)
  expect(selector).toBeTruthy()
  expect(document.querySelector(selector)).toBe(el)
})

it("generateSelector: should handle element with no parentElement (detached from DOM)", () => {
  const el = document.createElement("div")
  // Detached element has no parentElement
  const selector = generateSelector(el)
  expect(selector).toBe("div")
})

it("generateSelector: should handle element with whitespace-only className", () => {
  document.body.innerHTML =
    '<div id="root"><span class="   "></span><p></p></div>'
  const el = document.querySelector("span")!
  const selector = generateSelector(el)
  expect(selector).toBeTruthy()
})

it("generateSelector: should handle class selector where matches throws for a sibling", () => {
  // Create a scenario where one sibling's matches() throws
  document.body.innerHTML = '<div id="root"><span class="ok"></span></div>'
  const root = document.getElementById("root")!
  const span = root.querySelector("span")!

  // Add a sibling that throws on matches
  const fakeEl = document.createElement("span")
  fakeEl.className = "ok"
  fakeEl.matches = () => {
    throw new Error("fail")
  }
  root.appendChild(fakeEl)

  const selector = generateSelector(span)
  // Should still produce a valid selector (falls back because matches threw for one sibling)
  expect(selector).toBeTruthy()
})
