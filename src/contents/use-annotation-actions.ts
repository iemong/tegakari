import { type MutableRefObject, useCallback } from "react"

import { clearAllAnnotations } from "~lib/annotation-store"
import { cascadeDeleteRelations } from "~lib/relations"
import { revertAnnotationStylePreview } from "~lib/style-preview"
import type { Annotation, Relation, StyleDelta } from "~lib/types"

import type { Mutate } from "./use-annotations"
import { buildImportedRelations } from "./use-relations"

/** Payload for `handleUpdateInstruction`: the pin popover's full editable state, saved atomically. */
export interface AnnotationEditPayload {
  instruction: string
  tags?: string[]
  styleDelta?: StyleDelta[]
}

function nonEmpty<T>(arr: T[] | undefined): T[] | undefined {
  return arr && arr.length > 0 ? arr : undefined
}

function applyEditPayload(a: Annotation, payload: AnnotationEditPayload): Annotation {
  return {
    ...a,
    instruction: payload.instruction,
    tags: nonEmpty(payload.tags),
    styleDelta: nonEmpty(payload.styleDelta),
  }
}

interface ActionDeps {
  mutate: Mutate
  setAnnotations: (anns: Annotation[]) => void
  setRelations: (rels: Relation[]) => void
  setActiveId: (updater: (prev: number | null) => number | null) => void
  nextIdRef: MutableRefObject<number>
  nextRelationIdRef: MutableRefObject<number>
  annotations: Annotation[]
  relations: Relation[]
}

export function useAnnotationActions({
  mutate,
  setAnnotations,
  setRelations,
  setActiveId,
  nextIdRef,
  nextRelationIdRef,
  annotations,
  relations,
}: ActionDeps) {
  const handleUpdateInstruction = useCallback(
    (id: number, payload: AnnotationEditPayload) => {
      mutate((prev) => prev.map((a) => (a.id === id ? applyEditPayload(a, payload) : a)))
    },
    [mutate]
  )

  const handleDeleteAnnotation = useCallback(
    (id: number) => {
      const target = annotations.find((a) => a.id === id)
      if (target) revertAnnotationStylePreview(target)
      mutate(
        (prev) => prev.filter((a) => a.id !== id),
        (prev) => cascadeDeleteRelations(prev, id)
      )
      setActiveId((prev) => (prev === id ? null : prev))
    },
    [mutate, setActiveId, annotations]
  )

  const handleClearAll = useCallback(async () => {
    for (const a of annotations) revertAnnotationStylePreview(a)
    setAnnotations([])
    setRelations([])
    setActiveId(() => null)
    nextIdRef.current = 1
    nextRelationIdRef.current = 1
    await clearAllAnnotations(location.href)
  }, [setAnnotations, setRelations, setActiveId, nextIdRef, nextRelationIdRef, annotations])

  // Append imported annotations (renumbered to avoid id collisions) and any
  // relations among them (remapped through the same id renumbering, see
  // `~lib/relations`).
  const handleImportAnnotations = useCallback(
    (imported: Annotation[], importedRelations: Relation[] = []) => {
      const idMap = new Map<number, number>()
      const renumbered = imported.map((a) => {
        const newId = nextIdRef.current++
        idMap.set(a.id, newId)
        return { ...a, id: newId }
      })
      const remapped = buildImportedRelations({
        importedRelations,
        idMap,
        existingRelations: relations,
        nextRelationIdRef,
      })
      mutate(
        (prev) => [...prev, ...renumbered],
        (prev) => [...prev, ...remapped]
      )
    },
    [mutate, nextIdRef, relations, nextRelationIdRef]
  )

  return {
    handleUpdateInstruction,
    handleDeleteAnnotation,
    handleClearAll,
    handleImportAnnotations,
  }
}
