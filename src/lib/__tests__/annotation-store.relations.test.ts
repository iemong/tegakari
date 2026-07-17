import { beforeEach, expect, it, vi } from "vitest"

import type { Annotation, AnnotationStore, PageMetadata, Relation } from "../types"
import { loadAnnotationStore, updateAnnotations } from "../annotation-store"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}
const storageGet = vi.fn()
const storageSet = vi.fn()

const metadata: PageMetadata = {
  url: "https://example.com/page",
  title: "Example",
  viewport: { width: 1280, height: 720 },
  userAgent: "vitest",
  language: "ja",
  timestamp: 1,
  frameworkInfo: null,
}

function annotation(id: number): Annotation {
  return {
    id,
    elementInfo: {
      selector: `#item-${id}`,
      tag: "button",
      text: `Item ${id}`,
      attributes: {},
    },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: id,
    pageY: id,
    createdAt: id,
  }
}

function relation(id: number, fromId: number, toId: number): Relation {
  return { id, fromId, toId, instruction: `Relate ${fromId} and ${toId}` }
}

function storageKey(url: string) {
  const parsed = new URL(url)
  parsed.hash = ""
  return `tegakariAnnotations:${parsed.toString()}`
}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  storageGet.mockImplementation(async (key: string) => ({
    [key]: storage[key],
  }))
  storageSet.mockImplementation(async (value: StorageRecord) => {
    Object.assign(storage, value)
  })

  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: storageGet,
        set: storageSet,
        remove: vi.fn(),
      },
    },
  })
})

it("annotation-store: persists relations alongside annotations", async () => {
  const relations = [relation(1, 1, 2)]
  await updateAnnotations(metadata.url, {
    metadata,
    annotations: [annotation(1), annotation(2)],
    relations,
  })

  const saved = storage[storageKey(metadata.url)] as AnnotationStore
  expect(saved.relations).toEqual(relations)

  const loaded = await loadAnnotationStore(metadata.url)
  expect(loaded?.relations).toEqual(relations)
})

it("annotation-store: defaults relations to an empty array when omitted", async () => {
  await updateAnnotations(metadata.url, {
    metadata,
    annotations: [annotation(1)],
  })

  const saved = storage[storageKey(metadata.url)] as AnnotationStore
  expect(saved.relations).toEqual([])
})

it("annotation-store: loads legacy data saved before the relations field existed", async () => {
  // Simulates a store persisted by an older version of the extension, where
  // the store never had a `relations` key at all.
  const key = storageKey(metadata.url)
  storage[key] = { url: metadata.url, metadata, annotations: [annotation(1)] }

  const loaded = await loadAnnotationStore(metadata.url)

  expect(loaded?.relations).toBeUndefined()
})
