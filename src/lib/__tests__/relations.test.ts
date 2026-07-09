import { expect, it } from "vitest"

import {
  canAddRelation,
  cascadeDeleteRelations,
  isSameRelationPair,
  remapImportedRelations,
} from "../relations"
import type { Relation } from "../types"

function rel(id: number, fromId: number, toId: number): Relation {
  return { id, fromId, toId, instruction: `#${fromId}-#${toId}` }
}

it("isSameRelationPair: matches regardless of from/to order", () => {
  const r = rel(1, 1, 2)
  expect(isSameRelationPair(r, 1, 2)).toBe(true)
  expect(isSameRelationPair(r, 2, 1)).toBe(true)
  expect(isSameRelationPair(r, 1, 3)).toBe(false)
})

it("canAddRelation: rejects a self-loop", () => {
  expect(
    canAddRelation({
      relations: [],
      annotationIds: new Set([1]),
      fromId: 1,
      toId: 1,
    })
  ).toBe(false)
})

it("canAddRelation: rejects a reference to a nonexistent pin", () => {
  expect(
    canAddRelation({
      relations: [],
      annotationIds: new Set([1, 2]),
      fromId: 1,
      toId: 99,
    })
  ).toBe(false)
})

it("canAddRelation: rejects a duplicate pair regardless of direction", () => {
  const relations = [rel(1, 1, 2)]
  expect(
    canAddRelation({ relations, annotationIds: new Set([1, 2]), fromId: 1, toId: 2 })
  ).toBe(false)
  expect(
    canAddRelation({ relations, annotationIds: new Set([1, 2]), fromId: 2, toId: 1 })
  ).toBe(false)
})

it("canAddRelation: allows a valid, distinct pair", () => {
  const relations = [rel(1, 1, 2)]
  expect(
    canAddRelation({ relations, annotationIds: new Set([1, 2, 3]), fromId: 1, toId: 3 })
  ).toBe(true)
})

it("cascadeDeleteRelations: drops relations referencing the deleted id from either side", () => {
  const relations = [rel(1, 1, 2), rel(2, 2, 3), rel(3, 1, 3)]
  expect(cascadeDeleteRelations(relations, 2)).toEqual([rel(3, 1, 3)])
})

it("cascadeDeleteRelations: leaves unrelated relations untouched", () => {
  const relations = [rel(1, 1, 2)]
  expect(cascadeDeleteRelations(relations, 99)).toEqual(relations)
})

it("remapImportedRelations: remaps fromId/toId through the id map and assigns fresh ids", () => {
  const idMap = new Map([
    [1, 101],
    [2, 102],
  ])
  let next = 5
  const result = remapImportedRelations({
    importedRelations: [rel(1, 1, 2)],
    idMap,
    existingRelations: [],
    nextId: () => next++,
  })
  expect(result).toEqual([{ id: 5, fromId: 101, toId: 102, instruction: "#1-#2" }])
})

it("remapImportedRelations: drops a relation whose pin wasn't imported (dangling ref)", () => {
  const idMap = new Map([[1, 101]])
  const result = remapImportedRelations({
    importedRelations: [rel(1, 1, 2)],
    idMap,
    existingRelations: [],
    nextId: () => 1,
  })
  expect(result).toEqual([])
})

it("remapImportedRelations: drops a self-loop created by the remap", () => {
  const idMap = new Map([
    [1, 101],
    [2, 101],
  ])
  const result = remapImportedRelations({
    importedRelations: [rel(1, 1, 2)],
    idMap,
    existingRelations: [],
    nextId: () => 1,
  })
  expect(result).toEqual([])
})

it("remapImportedRelations: drops a pair that already exists among current relations", () => {
  const idMap = new Map([
    [1, 101],
    [2, 102],
  ])
  const result = remapImportedRelations({
    importedRelations: [rel(1, 1, 2)],
    idMap,
    existingRelations: [rel(9, 101, 102)],
    nextId: () => 1,
  })
  expect(result).toEqual([])
})

it("remapImportedRelations: dedupes against other relations remapped in the same batch", () => {
  const idMap = new Map([
    [1, 101],
    [2, 102],
  ])
  let next = 1
  const result = remapImportedRelations({
    importedRelations: [rel(1, 1, 2), rel(2, 2, 1)],
    idMap,
    existingRelations: [],
    nextId: () => next++,
  })
  expect(result).toHaveLength(1)
})
