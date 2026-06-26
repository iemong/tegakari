import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  clearAllAnnotations,
  collectPageMetadata,
  loadAnnotationStore,
  updateAnnotations,
} from "~lib/annotation-store"
import { generateSelector } from "~lib/selector"
import type {
  Annotation,
  CollectResult,
  PageMetadata,
  Rect,
} from "~lib/types"

import { buildElementInfo, captureScreenshot, cropToElement } from "./overlay-helpers"
import type { AddAnnotationOptions, Point } from "./use-picking"

type Persist = (anns: Annotation[]) => Promise<void>
type Mutate = (transform: (prev: Annotation[]) => Annotation[]) => void

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [metadata, setMetadata] = useState<PageMetadata | null>(null)
  const nextIdRef = useRef(1)
  const pendingIdRef = useRef<number | null>(null)

  const persist = usePersist(metadata)
  const mutate = useMutate(setAnnotations, persist)
  const loadPersisted = useLoadPersisted(setAnnotations, setMetadata, nextIdRef)
  const addAnnotation = useAddAnnotation({
    mutate,
    setActiveId,
    nextIdRef,
    pendingIdRef,
  })
  const actions = useAnnotationActions({
    mutate,
    setAnnotations,
    setActiveId,
    nextIdRef,
  })
  useResultListener({ setAnnotations, setMetadata, persist, pendingIdRef })

  return {
    annotations,
    activeId,
    setActiveId,
    metadata,
    setMetadata,
    loadPersisted,
    addAnnotation,
    ...actions,
  }
}

function usePersist(metadata: PageMetadata | null): Persist {
  return useCallback(
    async (anns: Annotation[]) => {
      const meta = metadata ?? collectPageMetadata(null)
      await updateAnnotations(location.href, meta, anns)
    },
    [metadata]
  )
}

function useMutate(
  setAnnotations: (updater: (prev: Annotation[]) => Annotation[]) => void,
  persist: Persist
): Mutate {
  return useCallback(
    (transform: (prev: Annotation[]) => Annotation[]) => {
      setAnnotations((prev) => {
        const updated = transform(prev)
        persist(updated)
        return updated
      })
    },
    [setAnnotations, persist]
  )
}

function useLoadPersisted(
  setAnnotations: (anns: Annotation[]) => void,
  setMetadata: (meta: PageMetadata | null) => void,
  nextIdRef: MutableRefObject<number>
) {
  return useCallback(async () => {
    const store = await loadAnnotationStore(location.href)
    if (store && store.annotations.length > 0) {
      setAnnotations(store.annotations)
      nextIdRef.current = Math.max(...store.annotations.map((a) => a.id)) + 1
      setMetadata(store.metadata)
    }
  }, [setAnnotations, setMetadata, nextIdRef])
}

interface AddDeps {
  mutate: Mutate
  setActiveId: (id: number) => void
  nextIdRef: MutableRefObject<number>
  pendingIdRef: MutableRefObject<number | null>
}

function useAddAnnotation({
  mutate,
  setActiveId,
  nextIdRef,
  pendingIdRef,
}: AddDeps) {
  return useCallback(
    (target: Element, point: Point, options?: AddAnnotationOptions) => {
      const info = buildElementInfo(target, generateSelector(target))
      const id = nextIdRef.current++
      // For elements inside an iframe the caller passes a rect already
      // translated to top-viewport coords (matches the captured screenshot).
      const boundingRect = options?.viewportRect ?? target.getBoundingClientRect()
      const annotation: Annotation = {
        id,
        elementInfo: info,
        frameworkInfo: null,
        componentInfo: null,
        instruction: "",
        pageX: point.pageX,
        pageY: point.pageY,
        createdAt: Date.now(),
      }
      mutate((prev) => [...prev, annotation])
      setActiveId(id)
      attachScreenshot(id, boundingRect, mutate)

      // Main-World framework collection is not injected inside iframes, so skip
      // the round-trip for iframe elements (frameworkInfo stays null).
      if (options?.skipFramework) return
      pendingIdRef.current = id
      window.postMessage(
        { type: "TEGAKARI_COLLECT", selector: info.selector },
        "*"
      )
    },
    [mutate, setActiveId, nextIdRef, pendingIdRef]
  )
}

function attachScreenshot(id: number, rect: Rect, mutate: Mutate) {
  captureScreenshot().then(async (full) => {
    if (!full) return
    const cropped = await cropToElement(full, rect)
    mutate((prev) =>
      prev.map((a) => (a.id === id ? { ...a, screenshot: cropped } : a))
    )
  })
}

interface ActionDeps {
  mutate: Mutate
  setAnnotations: (anns: Annotation[]) => void
  setActiveId: (updater: (prev: number | null) => number | null) => void
  nextIdRef: MutableRefObject<number>
}

function useAnnotationActions({
  mutate,
  setAnnotations,
  setActiveId,
  nextIdRef,
}: ActionDeps) {
  const handleUpdateInstruction = useCallback(
    (id: number, instruction: string) => {
      mutate((prev) => prev.map((a) => (a.id === id ? { ...a, instruction } : a)))
    },
    [mutate]
  )

  const handleDeleteAnnotation = useCallback(
    (id: number) => {
      mutate((prev) => prev.filter((a) => a.id !== id))
      setActiveId((prev) => (prev === id ? null : prev))
    },
    [mutate, setActiveId]
  )

  const handleClearAll = useCallback(async () => {
    setAnnotations([])
    setActiveId(() => null)
    nextIdRef.current = 1
    await clearAllAnnotations(location.href)
  }, [setAnnotations, setActiveId, nextIdRef])

  // Append imported annotations, renumbering them to avoid id collisions
  const handleImportAnnotations = useCallback(
    (imported: Annotation[]) => {
      mutate((prev) => {
        const renumbered = imported.map((a) => ({
          ...a,
          id: nextIdRef.current++,
        }))
        return [...prev, ...renumbered]
      })
    },
    [mutate, nextIdRef]
  )

  return {
    handleUpdateInstruction,
    handleDeleteAnnotation,
    handleClearAll,
    handleImportAnnotations,
  }
}

interface ResultDeps {
  setAnnotations: (updater: (prev: Annotation[]) => Annotation[]) => void
  setMetadata: (updater: (prev: PageMetadata | null) => PageMetadata | null) => void
  persist: Persist
  pendingIdRef: MutableRefObject<number | null>
}

function useResultListener({
  setAnnotations,
  setMetadata,
  persist,
  pendingIdRef,
}: ResultDeps) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== "TEGAKARI_RESULT") return
      const result = event.data as CollectResult
      const pendingId = pendingIdRef.current
      if (pendingId === null) return
      pendingIdRef.current = null

      setAnnotations((prev) => {
        const updated = prev.map((a) =>
          a.id === pendingId
            ? {
                ...a,
                frameworkInfo: result.framework,
                componentInfo: result.component,
              }
            : a
        )
        persist(updated)
        if (result.framework) {
          setMetadata((m) => (m ? { ...m, frameworkInfo: result.framework } : m))
        }
        return updated
      })
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [setAnnotations, setMetadata, persist, pendingIdRef])
}
