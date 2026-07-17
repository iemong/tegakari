import { it, expect, beforeEach, afterEach } from "vitest"
import { detectFramework } from "../framework-detector"

const win = globalThis.window as any

function resetGlobals() {
  delete win.__REACT_DEVTOOLS_GLOBAL_HOOK__
  delete win.__VUE__
  delete win.__vue__
  delete win.__NEXT_DATA__
  delete win.__next_f
  delete win.__next_router_prefetch_for
  delete win.__NUXT__
  delete win.__NUXT_DATA__
  delete win.__svelte
  for (const key of Object.keys(win)) {
    if (key.startsWith("__sveltekit_")) delete win[key]
  }
  document.body.innerHTML = ""
}

beforeEach(resetGlobals)

afterEach(resetGlobals)

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

it("detectFramework: should detect Svelte via window.__svelte with version", () => {
  win.__svelte = { v: new Set(["5"]) }
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte 5", metaFramework: null })
})

it("detectFramework: should detect Svelte 4 via window.__svelte version set", () => {
  win.__svelte = { v: new Set(["4"]) }
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte 4", metaFramework: null })
})

it("detectFramework: should pick the newest version when multiple Svelte instances are loaded", () => {
  win.__svelte = { v: new Set(["4", "5"]) }
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte 5", metaFramework: null })
})

it("detectFramework: should detect Svelte via window.__svelte without a usable version set", () => {
  win.__svelte = {}
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte", metaFramework: null })
})

it("detectFramework: should detect Svelte via window.__svelte with an empty version set", () => {
  win.__svelte = { v: new Set() }
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte", metaFramework: null })
})

it("detectFramework: should detect Svelte via scoped-style class name", () => {
  document.body.innerHTML = '<div class="card svelte-1a2b3c"></div>'
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte", metaFramework: null })
})

it("detectFramework: should detect Svelte via __svelte_meta on an element (dev build)", () => {
  document.body.innerHTML = "<div></div>"
  ;(document.querySelector("div") as any).__svelte_meta = {
    loc: { file: "src/App.svelte", line: 1 },
  }
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte", metaFramework: null })
})

it("detectFramework: should detect SvelteKit via #svelte-announcer", () => {
  win.__svelte = { v: new Set(["5"]) }
  document.body.innerHTML = '<div id="svelte-announcer"></div>'
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte 5", metaFramework: "SvelteKit" })
})

it("detectFramework: should detect SvelteKit via data-sveltekit-* attributes", () => {
  win.__svelte = { v: new Set(["5"]) }
  document.body.innerHTML = '<a href="/" data-sveltekit-preload-data>Home</a>'
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte 5", metaFramework: "SvelteKit" })
})

it("detectFramework: should detect SvelteKit via __sveltekit_ global", () => {
  win.__svelte = { v: new Set(["5"]) }
  win.__sveltekit_1a2b3c = {}
  const result = detectFramework()
  expect(result).toEqual({ framework: "Svelte 5", metaFramework: "SvelteKit" })
})

it("detectFramework: should return metaFramework SvelteKit only when Svelte itself is not detected", () => {
  document.body.innerHTML = '<div id="svelte-announcer"></div>'
  const result = detectFramework()
  expect(result).toEqual({ framework: null, metaFramework: "SvelteKit" })
})
