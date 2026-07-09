import { type MutableRefObject, useCallback, useRef, useState } from "react"

import { canAddRelation, remapImportedRelations } from "~lib/relations"
import type { Annotation, Relation } from "~lib/types"

export type RelationMutate = (
  transform: (prev: Relation[]) => Relation[]
) => void

/** Local relation state + its id counter, mirroring useAnnotations' annotation state. */
export function useRelationState() {
  const [relations, setRelations] = useState<Relation[]>([])
  const nextRelationIdRef = useRef(1)
  return { relations, setRelations, nextRelationIdRef }
}

interface RelationActionDeps {
  mutateRelations: RelationMutate
  annotations: Annotation[]
  relations: Relation[]
  nextRelationIdRef: MutableRefObject<number>
}

/** CRUD for relations: create (validated), edit instruction, delete. */
export function useRelationActions({
  mutateRelations,
  annotations,
  relations,
  nextRelationIdRef,
}: RelationActionDeps) {
  const addRelation = useCallback(
    (fromId: number, toId: number, instruction: string) => {
      const trimmed = instruction.trim()
      if (!trimmed) return false
      const annotationIds = new Set(annotations.map((a) => a.id))
      if (!canAddRelation({ relations, annotationIds, fromId, toId })) return false
      const id = nextRelationIdRef.current++
      mutateRelations((prev) => [...prev, { id, fromId, toId, instruction: trimmed }])
      return true
    },
    [mutateRelations, annotations, relations, nextRelationIdRef]
  )

  const updateRelationInstruction = useCallback(
    (id: number, instruction: string) => {
      const trimmed = instruction.trim()
      if (!trimmed) return false
      mutateRelations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, instruction: trimmed } : r))
      )
      return true
    },
    [mutateRelations]
  )

  const deleteRelation = useCallback(
    (id: number) => {
      mutateRelations((prev) => prev.filter((r) => r.id !== id))
    },
    [mutateRelations]
  )

  return { addRelation, updateRelationInstruction, deleteRelation }
}

interface ImportRelationsArgs {
  importedRelations: Relation[]
  idMap: Map<number, number>
  existingRelations: Relation[]
  nextRelationIdRef: MutableRefObject<number>
}

/** Remaps an imported annotation-id map onto imported relations for `handleImportAnnotations`. */
export function buildImportedRelations({
  importedRelations,
  idMap,
  existingRelations,
  nextRelationIdRef,
}: ImportRelationsArgs): Relation[] {
  return remapImportedRelations({
    importedRelations,
    idMap,
    existingRelations,
    nextId: () => nextRelationIdRef.current++,
  })
}
