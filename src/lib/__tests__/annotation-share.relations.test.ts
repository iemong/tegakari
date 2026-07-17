import { expect, it } from "vitest"

import { parseAnnotationExport, serializeAnnotationStore } from "../annotation-share"
import type { Annotation, AnnotationStore, Relation } from "../types"

function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: {
      selector: "#app > button",
      tag: "button",
      text: "Save",
      attributes: { class: "btn" },
    },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "Fix the label",
    pageX: 100,
    pageY: 200,
    createdAt: 1700000000000,
    ...overrides,
  }
}

function createStore(
  annotations: Annotation[],
  relations?: Relation[]
): AnnotationStore {
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
    ...(relations ? { relations } : {}),
  }
}

it("serialize → parse roundtrip preserves relations", () => {
  const store = createStore(
    [createAnnotation({ id: 1 }), createAnnotation({ id: 2 })],
    [{ id: 1, fromId: 1, toId: 2, instruction: "Align these" }]
  )

  const { store: parsed, errors } = parseAnnotationExport(serializeAnnotationStore(store))

  expect(errors).toEqual([])
  expect(parsed!.relations).toEqual([
    { id: 1, fromId: 1, toId: 2, instruction: "Align these" },
  ])
})

it("parseAnnotationExport: leaves relations unset for legacy files without a relations field (backward compat)", () => {
  const payload = JSON.parse(
    serializeAnnotationStore(createStore([createAnnotation()]))
  )
  expect(payload.store.relations).toBeUndefined()

  const { store, errors } = parseAnnotationExport(JSON.stringify(payload))

  expect(errors).toEqual([])
  expect(store!.relations).toBeUndefined()
})

it("parseAnnotationExport: drops a relation referencing an annotation id that wasn't imported", () => {
  const store = createStore(
    [createAnnotation({ id: 1 }), createAnnotation({ id: 2 })],
    [{ id: 1, fromId: 1, toId: 99, instruction: "Dangling" }]
  )

  const { store: parsed } = parseAnnotationExport(serializeAnnotationStore(store))

  expect(parsed!.relations).toBeUndefined()
})

it("parseAnnotationExport: drops a self-referencing relation", () => {
  const store = createStore(
    [createAnnotation({ id: 1 }), createAnnotation({ id: 2 })],
    [{ id: 1, fromId: 1, toId: 1, instruction: "Self loop" }]
  )

  const { store: parsed } = parseAnnotationExport(serializeAnnotationStore(store))

  expect(parsed!.relations).toBeUndefined()
})

it("parseAnnotationExport: drops a relation with an empty instruction", () => {
  const store = createStore(
    [createAnnotation({ id: 1 }), createAnnotation({ id: 2 })],
    [{ id: 1, fromId: 1, toId: 2, instruction: "   " }]
  )

  const { store: parsed } = parseAnnotationExport(serializeAnnotationStore(store))

  expect(parsed!.relations).toBeUndefined()
})

it("parseAnnotationExport: dedupes duplicate (order-agnostic) relation pairs, keeping the first", () => {
  const store = createStore(
    [createAnnotation({ id: 1 }), createAnnotation({ id: 2 })],
    [
      { id: 1, fromId: 1, toId: 2, instruction: "First" },
      { id: 2, fromId: 2, toId: 1, instruction: "Duplicate, reversed" },
    ]
  )

  const { store: parsed } = parseAnnotationExport(serializeAnnotationStore(store))

  expect(parsed!.relations).toEqual([
    { id: 1, fromId: 1, toId: 2, instruction: "First" },
  ])
})

it("parseAnnotationExport: keeps valid relations while dropping only the broken ones", () => {
  const payload = JSON.parse(
    serializeAnnotationStore(
      createStore([createAnnotation({ id: 1 }), createAnnotation({ id: 2 })])
    )
  )
  payload.store.relations = [
    { id: 1, fromId: 1, toId: 2, instruction: "Valid" },
    { id: "broken", fromId: 1, toId: 2, instruction: "Bad id type" },
  ]

  const { store, errors } = parseAnnotationExport(JSON.stringify(payload))

  expect(errors).toEqual([])
  expect(store!.relations).toEqual([
    { id: 1, fromId: 1, toId: 2, instruction: "Valid" },
  ])
})
