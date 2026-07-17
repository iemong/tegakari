import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  collectPageMetadata,
  loadAnnotationStore,
  updateAnnotations,
} from "~lib/annotation-store"
import { generateSelector } from "~lib/selector"
import type { Annotation, CollectResult, PageMetadata, Rect, Relation } from "~lib/types"

import { buildElementInfo, captureScreenshot, cropToElement } from "./overlay-helpers"
import { useAnnotationActions } from "./use-annotation-actions"
import type { AddAnnotationOptions, Point } from "./use-picking"
import { useRelationActions, useRelationState } from "./use-relations"

type Persist = (anns: Annotation[], relations: Relation[]) => Promise<void>
export type Mutate = (
  annTransform: (prev: Annotation[]) => Annotation[],
  relTransform?: (prev: Relation[]) => Relation[]
) => void

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [metadata, setMetadata] = useState<PageMetadata | null>(null)
  const nextIdRef = useRef(1)
  const pendingIdRef = useRef<number | null>(null)
  const { relations, setRelations, nextRelationIdRef } = useRelationState()

  const persist = usePersist(metadata)
  const mutate = useMutate({ setAnnotations, setRelations, persist })
  const mutateRelations = useCallback(
    (transform: (prev: Relation[]) => Relation[]) => mutate((a) => a, transform),
    [mutate]
  )
  const loadPersisted = useLoadPersisted({
    setAnnotations,
    setRelations,
    setMetadata,
    nextIdRef,
    nextRelationIdRef,
  })
  const addAnnotation = useAddAnnotation({ mutate, setActiveId, nextIdRef, pendingIdRef })
  const actions = useAnnotationActions({
    mutate,
    setAnnotations,
    setRelations,
    setActiveId,
    nextIdRef,
    nextRelationIdRef,
    annotations,
    relations,
  })
  const relationActions = useRelationActions({
    mutateRelations,
    annotations,
    relations,
    nextRelationIdRef,
  })
  useResultListener({ mutate, setMetadata, pendingIdRef })

  return {
    annotations,
    activeId,
    setActiveId,
    metadata,
    setMetadata,
    relations,
    loadPersisted,
    addAnnotation,
    ...actions,
    ...relationActions,
  }
}

function usePersist(metadata: PageMetadata | null): Persist {
  return useCallback(
    async (anns: Annotation[], relations: Relation[]) => {
      const meta = metadata ?? collectPageMetadata(null)
      await updateAnnotations(location.href, { metadata: meta, annotations: anns, relations })
    },
    [metadata]
  )
}

interface MutateDeps {
  setAnnotations: (updater: (prev: Annotation[]) => Annotation[]) => void
  setRelations: (updater: (prev: Relation[]) => Relation[]) => void
  persist: Persist
}

/**
 * Applies an annotations transform and (optionally) a relations transform
 * together, then persists both as a single atomic write — this is what makes
 * cross-cutting changes like cascade-delete-on-annotation-delete correct
 * without stale closures or extra ref bookkeeping.
 */
function useMutate({ setAnnotations, setRelations, persist }: MutateDeps): Mutate {
  return useCallback(
    (
      annTransform: (prev: Annotation[]) => Annotation[],
      relTransform: (prev: Relation[]) => Relation[] = (r) => r
    ) => {
      setAnnotations((prevAnn) => {
        const updatedAnn = annTransform(prevAnn)
        setRelations((prevRel) => {
          const updatedRel = relTransform(prevRel)
          persist(updatedAnn, updatedRel)
          return updatedRel
        })
        return updatedAnn
      })
    },
    [setAnnotations, setRelations, persist]
  )
}

interface LoadPersistedDeps {
  setAnnotations: (anns: Annotation[]) => void
  setRelations: (rels: Relation[]) => void
  setMetadata: (meta: PageMetadata | null) => void
  nextIdRef: MutableRefObject<number>
  nextRelationIdRef: MutableRefObject<number>
}

function useLoadPersisted({
  setAnnotations,
  setRelations,
  setMetadata,
  nextIdRef,
  nextRelationIdRef,
}: LoadPersistedDeps) {
  return useCallback(async () => {
    const store = await loadAnnotationStore(location.href)
    if (store && store.annotations.length > 0) {
      setAnnotations(store.annotations)
      nextIdRef.current = Math.max(...store.annotations.map((a) => a.id)) + 1
      setMetadata(store.metadata)
      const rels = store.relations ?? []
      setRelations(rels)
      nextRelationIdRef.current =
        rels.length > 0 ? Math.max(...rels.map((r) => r.id)) + 1 : 1
    }
  }, [setAnnotations, setRelations, setMetadata, nextIdRef, nextRelationIdRef])
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

interface ResultDeps {
  mutate: Mutate
  setMetadata: (updater: (prev: PageMetadata | null) => PageMetadata | null) => void
  pendingIdRef: MutableRefObject<number | null>
}

function useResultListener({ mutate, setMetadata, pendingIdRef }: ResultDeps) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== "TEGAKARI_RESULT") return
      const result = event.data as CollectResult
      const pendingId = pendingIdRef.current
      if (pendingId === null) return
      pendingIdRef.current = null

      mutate((prev) =>
        prev.map((a) =>
          a.id === pendingId
            ? { ...a, frameworkInfo: result.framework, componentInfo: result.component }
            : a
        )
      )
      if (result.framework) {
        setMetadata((m) => (m ? { ...m, frameworkInfo: result.framework } : m))
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [mutate, setMetadata, pendingIdRef])
}
