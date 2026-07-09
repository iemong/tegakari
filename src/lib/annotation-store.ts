import type { AnnotationStore, PageMetadata } from "./types"

const STORAGE_PREFIX = "tegakariAnnotations:"
const MAX_ANNOTATIONS = 50

/** Normalize URL to use as storage key (strip hash) */
function storageKey(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ""
    return `${STORAGE_PREFIX}${u.toString()}`
  } catch {
    return `${STORAGE_PREFIX}${url}`
  }
}

export async function loadAnnotationStore(
  url: string
): Promise<AnnotationStore | null> {
  try {
    const key = storageKey(url)
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  } catch {
    return null
  }
}

export async function saveAnnotationStore(
  store: AnnotationStore
): Promise<void> {
  try {
    const key = storageKey(store.url)
    // Enforce max limit — drop oldest first
    if (store.annotations.length > MAX_ANNOTATIONS) {
      store.annotations
        .sort((a, b) => a.createdAt - b.createdAt)
        .splice(0, store.annotations.length - MAX_ANNOTATIONS)
    }
    await chrome.storage.local.set({ [key]: store })
  } catch {
    // silently fail
  }
}

export async function updateAnnotations(
  url: string,
  data: Pick<AnnotationStore, "metadata" | "annotations" | "relations">
): Promise<void> {
  await saveAnnotationStore({ url, ...data, relations: data.relations ?? [] })
}

export async function clearAllAnnotations(url: string): Promise<void> {
  try {
    const key = storageKey(url)
    await chrome.storage.local.remove(key)
  } catch {
    // silently fail
  }
}

export function collectPageMetadata(
  frameworkInfo: import("./types").FrameworkInfo | null
): PageMetadata {
  return {
    url: location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent: navigator.userAgent,
    language: navigator.language,
    timestamp: Date.now(),
    frameworkInfo,
  }
}
