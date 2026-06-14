import { expect, it } from "vitest"
import {
  exportFileName,
  isSamePage,
  parseAnnotationExport,
  serializeAnnotationStore,
} from "../annotation-share"
import type { Annotation, AnnotationStore } from "../types"

function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: {
      selector: "#app > button",
      tag: "button",
      text: "Save",
      attributes: { class: "btn" },
    },
    frameworkInfo: { framework: "React", metaFramework: null },
    componentInfo: null,
    instruction: "Fix the label",
    pageX: 100,
    pageY: 200,
    screenshot: "data:image/jpeg;base64,abc",
    createdAt: 1700000000000,
    ...overrides,
  }
}

function createStore(annotations: Annotation[]): AnnotationStore {
  return {
    url: "https://example.com/page",
    metadata: {
      url: "https://example.com/page",
      title: "Example",
      viewport: { width: 1280, height: 800 },
      userAgent: "test-agent",
      language: "ja",
      timestamp: 1700000000000,
      frameworkInfo: null,
    },
    annotations,
  }
}

it("serialize → parse roundtrip preserves the store", () => {
  const store = createStore([createAnnotation(), createAnnotation({ id: 2 })])

  const { store: parsed, errors } = parseAnnotationExport(
    serializeAnnotationStore(store)
  )

  expect(errors).toEqual([])
  expect(parsed).toEqual(store)
})

it("parseAnnotationExport: rejects invalid JSON", () => {
  const { store, errors } = parseAnnotationExport("not json")
  expect(store).toBeNull()
  expect(errors[0]).toMatch(/JSON/)
})

it("parseAnnotationExport: rejects files without the tegakari format marker", () => {
  const { store, errors } = parseAnnotationExport(
    JSON.stringify({ format: "other", version: 1, store: {} })
  )
  expect(store).toBeNull()
  expect(errors[0]).toMatch(/tegakari/)
})

it("parseAnnotationExport: rejects newer file versions", () => {
  const payload = JSON.parse(serializeAnnotationStore(createStore([createAnnotation()])))
  payload.version = 99

  const { store, errors } = parseAnnotationExport(JSON.stringify(payload))

  expect(store).toBeNull()
  expect(errors[0]).toMatch(/version/)
})

it("parseAnnotationExport: rejects a store without url", () => {
  const payload = JSON.parse(serializeAnnotationStore(createStore([createAnnotation()])))
  payload.store.url = ""

  const { store } = parseAnnotationExport(JSON.stringify(payload))

  expect(store).toBeNull()
})

it("parseAnnotationExport: skips broken annotations but keeps valid ones", () => {
  const payload = JSON.parse(serializeAnnotationStore(createStore([createAnnotation()])))
  payload.store.annotations.push({ id: "broken" })

  const { store, errors } = parseAnnotationExport(JSON.stringify(payload))

  expect(store!.annotations).toHaveLength(1)
  expect(errors[0]).toMatch(/Skipped annotation #2/)
})

it("parseAnnotationExport: fails when no annotation is valid", () => {
  const payload = JSON.parse(serializeAnnotationStore(createStore([createAnnotation()])))
  payload.store.annotations = [{ id: "broken" }]

  const { store, errors } = parseAnnotationExport(JSON.stringify(payload))

  expect(store).toBeNull()
  expect(errors[0]).toMatch(/No valid annotations/)
})

it("parseAnnotationExport: fills defaults for optional annotation fields", () => {
  const payload = JSON.parse(serializeAnnotationStore(createStore([createAnnotation()])))
  payload.store.annotations = [
    {
      id: 1,
      instruction: "",
      pageX: 0,
      pageY: 0,
      elementInfo: { selector: ".a", tag: "div" },
    },
  ]

  const { store } = parseAnnotationExport(JSON.stringify(payload))
  const annotation = store!.annotations[0]

  expect(annotation.elementInfo.text).toBe("")
  expect(annotation.elementInfo.attributes).toEqual({})
  expect(annotation.frameworkInfo).toBeNull()
  expect(annotation.componentInfo).toBeNull()
  expect(annotation.screenshot).toBeUndefined()
  expect(typeof annotation.createdAt).toBe("number")
})

it("isSamePage: ignores the hash, mirrors the storage key rule", () => {
  expect(
    isSamePage("https://example.com/page#section", "https://example.com/page")
  ).toBe(true)
  expect(
    isSamePage("https://example.com/page", "https://example.com/other")
  ).toBe(false)
})

it("isSamePage: falls back to string equality for invalid URLs", () => {
  expect(isSamePage("not-a-url", "not-a-url")).toBe(true)
  expect(isSamePage("not-a-url", "other")).toBe(false)
})

it("exportFileName: includes host and timestamp", () => {
  const name = exportFileName(
    "https://example.com/page",
    new Date("2026-06-13T12:00:00Z")
  )
  expect(name).toBe("tegakari-annotations-example.com-2026-06-13-12-00-00.json")
})

it("exportFileName: falls back to 'page' for invalid URLs", () => {
  const name = exportFileName("not-a-url", new Date("2026-06-13T12:00:00Z"))
  expect(name).toBe("tegakari-annotations-page-2026-06-13-12-00-00.json")
})
