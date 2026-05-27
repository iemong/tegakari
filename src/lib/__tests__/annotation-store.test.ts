import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Annotation, AnnotationStore, PageMetadata } from "../types"
import {
  archiveAnnotation,
  clearAllAnnotations,
  clearArchivedAnnotations,
  collectPageMetadata,
  loadAnnotationStore,
  saveAnnotationStore,
  unarchiveAnnotation,
  updateAnnotations,
} from "../annotation-store"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}
const storageGet = vi.fn()
const storageSet = vi.fn()
const storageRemove = vi.fn()

const metadata: PageMetadata = {
  url: "https://example.com/page#hash",
  title: "Example",
  viewport: { width: 1280, height: 720 },
  userAgent: "vitest",
  language: "ja",
  timestamp: 1,
  frameworkInfo: null,
}

function annotation(id: number, status: Annotation["status"] = "default") {
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
    status,
    createdAt: id,
  } satisfies Annotation
}

function storageKey(url: string) {
  const parsed = new URL(url)
  parsed.hash = ""
  return `tegakariAnnotations:${parsed.toString()}`
}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  storageGet.mockImplementation(async (key: string) => ({ [key]: storage[key] }))
  storageSet.mockImplementation(async (value: StorageRecord) => {
    Object.assign(storage, value)
  })
  storageRemove.mockImplementation(async (key: string) => {
    delete storage[key]
  })

  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: storageGet,
        set: storageSet,
        remove: storageRemove,
      },
    },
  })
})

describe("annotation-store", () => {
  it("saves and loads a store using a normalized URL key", async () => {
    const store: AnnotationStore = {
      url: metadata.url,
      metadata,
      annotations: [annotation(1)],
    }

    await saveAnnotationStore(store)

    expect(storage[storageKey(metadata.url)]).toEqual(store)
    await expect(loadAnnotationStore(metadata.url)).resolves.toEqual(store)
    await expect(loadAnnotationStore("https://example.com/page#other")).resolves.toEqual(
      store
    )
  })

  it("limits saved annotations to the newest 50", async () => {
    const annotations = Array.from({ length: 55 }, (_, idx) =>
      annotation(55 - idx)
    )
    await saveAnnotationStore({ url: metadata.url, metadata, annotations })

    const saved = storage[storageKey(metadata.url)] as AnnotationStore
    expect(saved.annotations).toHaveLength(50)
    expect(saved.annotations[0].id).toBe(6)
    expect(saved.annotations.at(-1)?.id).toBe(55)
  })

  it("updates, archives, unarchives, and clears annotations", async () => {
    await updateAnnotations(metadata.url, metadata, [
      annotation(1),
      annotation(2, "archived"),
    ])

    await archiveAnnotation(metadata.url, 1)
    let saved = storage[storageKey(metadata.url)] as AnnotationStore
    expect(saved.annotations.map((item) => item.status)).toEqual([
      "archived",
      "archived",
    ])

    await unarchiveAnnotation(metadata.url, 1)
    saved = storage[storageKey(metadata.url)] as AnnotationStore
    expect(saved.annotations[0].status).toBe("default")

    await clearArchivedAnnotations(metadata.url)
    saved = storage[storageKey(metadata.url)] as AnnotationStore
    expect(saved.annotations.map((item) => item.id)).toEqual([1])

    await clearAllAnnotations(metadata.url)
    expect(storage[storageKey(metadata.url)]).toBeUndefined()
  })

  it("returns null and swallows storage errors", async () => {
    storageGet.mockRejectedValueOnce(new Error("boom"))
    storageSet.mockRejectedValueOnce(new Error("boom"))
    storageRemove.mockRejectedValueOnce(new Error("boom"))

    await expect(loadAnnotationStore("not a url")).resolves.toBeNull()
    await expect(
      saveAnnotationStore({ url: "not a url", metadata, annotations: [] })
    ).resolves.toBeUndefined()
    await expect(clearAllAnnotations("not a url")).resolves.toBeUndefined()
  })

  it("uses the raw URL when URL parsing fails", async () => {
    const store = {
      url: "not a url",
      metadata,
      annotations: [annotation(1)],
    }

    await saveAnnotationStore(store)

    expect(storage["tegakariAnnotations:not a url"]).toEqual(store)
    await expect(loadAnnotationStore("not a url")).resolves.toEqual(store)
  })

  it("collects page metadata from browser globals", () => {
    vi.setSystemTime(12345)
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 })
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    })
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "ja-JP",
    })

    const frameworkInfo = { framework: "React", metaFramework: "Next.js" }
    const collected = collectPageMetadata(frameworkInfo)

    expect(collected).toMatchObject({
      url: location.href,
      title: document.title,
      viewport: { width: 800, height: 600 },
      language: "ja-JP",
      timestamp: 12345,
      frameworkInfo,
    })
  })
})
