// Export/import of an annotation set as a single JSON file
// (tegakari-annotations-*.json), so a
// set pinned by one person (e.g. a PM on a staging site) can be reviewed and
// fed to an AI editor by another.

import type { Annotation, AnnotationStore } from "./types"

const EXPORT_FORMAT = "tegakari-annotations"
const EXPORT_VERSION = 1

export interface AnnotationExport {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: number
  store: AnnotationStore
}

export interface ParseResult {
  store: AnnotationStore | null
  errors: string[]
}

export function serializeAnnotationStore(store: AnnotationStore): string {
  const payload: AnnotationExport = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    store,
  }
  return JSON.stringify(payload, null, 2)
}

export function exportFileName(url: string, date: Date): string {
  const host = hostOf(url)
  // Include the time, not just the day, so multiple exports of the same page
  // on one day don't collide (e.g. 2026-06-13-12-00-00).
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, "-")
  return `tegakari-annotations-${host}-${stamp}.json`
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname || "page"
  } catch {
    return "page"
  }
}

export function parseAnnotationExport(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { store: null, errors: ["Not a valid JSON file."] }
  }

  const payload = raw as Partial<AnnotationExport>
  if (payload?.format !== EXPORT_FORMAT) {
    return { store: null, errors: ["Not a tegakari annotations file."] }
  }
  if (typeof payload.version !== "number" || payload.version > EXPORT_VERSION) {
    return {
      store: null,
      errors: [
        `Unsupported file version (${String(payload.version)}). Update tegakari and retry.`,
      ],
    }
  }

  const store = payload.store as Partial<AnnotationStore> | undefined
  if (!store || typeof store.url !== "string" || !store.url) {
    return { store: null, errors: ["File is missing the page URL."] }
  }
  if (!Array.isArray(store.annotations)) {
    return { store: null, errors: ["File is missing the annotations array."] }
  }

  const errors: string[] = []
  const annotations: Annotation[] = []
  store.annotations.forEach((entry, index) => {
    const annotation = validateAnnotation(entry)
    if (annotation) {
      annotations.push(annotation)
    } else {
      errors.push(`Skipped annotation #${index + 1}: missing required fields.`)
    }
  })

  if (annotations.length === 0) {
    return { store: null, errors: ["No valid annotations found.", ...errors] }
  }

  return {
    store: {
      url: store.url,
      metadata: store.metadata as AnnotationStore["metadata"],
      annotations,
    },
    errors,
  }
}

function validateAnnotation(entry: unknown): Annotation | null {
  if (typeof entry !== "object" || entry === null) return null
  const a = entry as Partial<Annotation>
  const el = a.elementInfo
  if (
    typeof a.id !== "number" ||
    typeof a.instruction !== "string" ||
    typeof a.pageX !== "number" ||
    typeof a.pageY !== "number" ||
    typeof el !== "object" ||
    el === null ||
    typeof el.selector !== "string" ||
    typeof el.tag !== "string"
  ) {
    return null
  }
  return {
    id: a.id,
    elementInfo: {
      selector: el.selector,
      tag: el.tag,
      text: typeof el.text === "string" ? el.text : "",
      attributes:
        typeof el.attributes === "object" && el.attributes !== null
          ? el.attributes
          : {},
    },
    frameworkInfo: a.frameworkInfo ?? null,
    componentInfo: a.componentInfo ?? null,
    instruction: a.instruction,
    pageX: a.pageX,
    pageY: a.pageY,
    ...(typeof a.screenshot === "string" ? { screenshot: a.screenshot } : {}),
    createdAt: typeof a.createdAt === "number" ? a.createdAt : Date.now(),
    ...validTags(a.tags),
  }
}

/** Keep `tags` only if every entry survived the JSON round-trip as a string. */
function validTags(tags: unknown): { tags: string[] } | Record<string, never> {
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
    return {}
  }
  return { tags }
}

/** Compare URLs ignoring the hash, mirroring the annotation-store key rule */
export function isSamePage(a: string, b: string): boolean {
  return normalize(a) === normalize(b)
}

function normalize(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ""
    return u.toString()
  } catch {
    return url
  }
}
