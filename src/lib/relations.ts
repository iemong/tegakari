// Pure data-invariant helpers for `Relation` (see `types.ts`). Framework-free
// so both the overlay hooks (`src/contents/use-relations.ts`) and the share
// import/export layer (`annotation-share.ts`) can reuse the same rules.

import type { Relation } from "./types"

/** True when two relations connect the same pair of pins, direction-agnostic. */
export function isSameRelationPair(
  relation: Relation,
  fromId: number,
  toId: number
): boolean {
  return (
    (relation.fromId === fromId && relation.toId === toId) ||
    (relation.fromId === toId && relation.toId === fromId)
  )
}

interface CanAddArgs {
  relations: Relation[]
  annotationIds: Set<number>
  fromId: number
  toId: number
}

/** Validates a candidate relation: two distinct, existing pins with no pre-existing pair. */
export function canAddRelation({
  relations,
  annotationIds,
  fromId,
  toId,
}: CanAddArgs): boolean {
  if (fromId === toId) return false
  if (!annotationIds.has(fromId) || !annotationIds.has(toId)) return false
  return !relations.some((r) => isSameRelationPair(r, fromId, toId))
}

/** Drops any relation referencing a deleted annotation id (cascade delete). */
export function cascadeDeleteRelations(
  relations: Relation[],
  deletedId: number
): Relation[] {
  return relations.filter((r) => r.fromId !== deletedId && r.toId !== deletedId)
}

interface RemapArgs {
  importedRelations: Relation[]
  idMap: Map<number, number>
  existingRelations: Relation[]
  nextId: () => number
}

/**
 * Remaps imported relations' fromId/toId through an annotation id-renumbering
 * map (imported annotations get fresh ids on import — see
 * `use-annotations.ts`'s `handleImportAnnotations`), dropping any that become
 * invalid: a dangling reference (annotation wasn't imported), a self-loop, or
 * a duplicate of an existing/already-remapped pair. Surviving relations get
 * fresh ids via `nextId`.
 */
export function remapImportedRelations({
  importedRelations,
  idMap,
  existingRelations,
  nextId,
}: RemapArgs): Relation[] {
  const remapped: Relation[] = []
  for (const r of importedRelations) {
    const fromId = idMap.get(r.fromId)
    const toId = idMap.get(r.toId)
    if (fromId === undefined || toId === undefined || fromId === toId) continue
    if (existingRelations.some((e) => isSameRelationPair(e, fromId, toId))) continue
    if (remapped.some((e) => isSameRelationPair(e, fromId, toId))) continue
    remapped.push({ id: nextId(), fromId, toId, instruction: r.instruction })
  }
  return remapped
}
