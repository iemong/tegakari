import { it, expect, beforeEach, afterEach } from "vitest"
import { detectFramework } from "../framework-detector"

const win = globalThis.window as any

beforeEach(() => {
  delete win.__REACT_DEVTOOLS_GLOBAL_HOOK__
  delete win.__VUE__
  delete win.__vue__
  delete win.__NEXT_DATA__
  delete win.__next_f
  delete win.__next_router_prefetch_for
  delete win.__NUXT__
  delete win.__NUXT_DATA__
  document.body.innerHTML = ""
})

afterEach(() => {
  delete win.__REACT_DEVTOOLS_GLOBAL_HOOK__
  delete win.__VUE__
  delete win.__vue__
  delete win.__NEXT_DATA__
  delete win.__next_f
  delete win.__next_router_prefetch_for
  delete win.__NUXT__
  delete win.__NUXT_DATA__
  document.body.innerHTML = ""
})

it("detectFramework: should return null when no framework detected", () => {
  expect(detectFramework()).toBeNull()
})

it("detectFramework: should detect React", () => {
  win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {}
  const result = detectFramework()
  expect(result).toEqual({ framework: "React", metaFramework: null })
})

it("detectFramework: should detect Vue via __VUE__", () => {
  win.__VUE__ = true
  const result = detectFramework()
  expect(result).toEqual({ framework: "Vue", metaFramework: null })
})

it("detectFramework: should detect Vue via __vue__", () => {
  win.__vue__ = true
  const result = detectFramework()
  expect(result).toEqual({ framework: "Vue", metaFramework: null })
})

it("detectFramework: should detect Next.js Pages Router", () => {
  win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {}
  win.__NEXT_DATA__ = {}
  const result = detectFramework()
  expect(result).toEqual({
    framework: "React",
    metaFramework: "Next.js (Pages Router)",
  })
})

it("detectFramework: should detect Next.js App Router via __next_f", () => {
  win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {}
  win.__next_f = []
  const result = detectFramework()
  expect(result).toEqual({
    framework: "React",
    metaFramework: "Next.js (App Router)",
  })
})

it("detectFramework: should detect Next.js App Router via __next_router_prefetch_for", () => {
  win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {}
  win.__next_router_prefetch_for = true
  const result = detectFramework()
  expect(result).toEqual({
    framework: "React",
    metaFramework: "Next.js (App Router)",
  })
})

it("detectFramework: should detect Next.js via DOM elements", () => {
  win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {}
  document.body.innerHTML =
    '<div id="__next"></div><script src="/_next/static/chunk.js"></script>'
  const result = detectFramework()
  expect(result).toEqual({
    framework: "React",
    metaFramework: "Next.js",
  })
})

it("detectFramework: should not detect Next.js with only __next div (no script)", () => {
  win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {}
  document.body.innerHTML = '<div id="__next"></div>'
  const result = detectFramework()
  expect(result).toEqual({ framework: "React", metaFramework: null })
})

it("detectFramework: should detect Nuxt via __NUXT__", () => {
  win.__VUE__ = true
  win.__NUXT__ = {}
  const result = detectFramework()
  expect(result).toEqual({ framework: "Vue", metaFramework: "Nuxt" })
})

it("detectFramework: should detect Nuxt via __NUXT_DATA__", () => {
  win.__VUE__ = true
  win.__NUXT_DATA__ = {}
  const result = detectFramework()
  expect(result).toEqual({ framework: "Vue", metaFramework: "Nuxt" })
})

it("detectFramework: should detect Nuxt via __nuxt element", () => {
  win.__VUE__ = true
  document.body.innerHTML = '<div id="__nuxt"></div>'
  const result = detectFramework()
  expect(result).toEqual({ framework: "Vue", metaFramework: "Nuxt" })
})

it("detectFramework: should detect Nuxt via __layout element", () => {
  win.__VUE__ = true
  document.body.innerHTML = '<div id="__layout"></div>'
  const result = detectFramework()
  expect(result).toEqual({ framework: "Vue", metaFramework: "Nuxt" })
})

it("detectFramework: should return metaFramework only when base framework is not detected", () => {
  win.__NEXT_DATA__ = {}
  const result = detectFramework()
  expect(result).toEqual({
    framework: null,
    metaFramework: "Next.js (Pages Router)",
  })
})
