import { expect, it } from "vitest"

import { generateBatchJsonl } from "../jsonl-generator"
import type { BatchInput } from "../types"

const elementInfo = {
  selector: "#app > div.container",
  tag: "div",
  text: "",
  attributes: {},
}

const baseAnnotations: BatchInput["annotations"] = [
  {
    id: 1,
    elementInfo,
    frameworkInfo: null,
    componentInfo: null,
    instruction: "Fix this",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
  },
  {
    id: 2,
    elementInfo,
    frameworkInfo: null,
    componentInfo: null,
    instruction: "Fix that",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
  },
]

const batchInput: BatchInput = {
  pageUrl: "https://example.com",
  pageTitle: "Test Page",
  annotations: baseAnnotations,
  relations: [{ id: 1, fromId: 1, toId: 2, instruction: "Make these equal" }],
}

it("generateBatchJsonl: appends one relation line per relation, after the annotation lines", () => {
  const result = generateBatchJsonl(batchInput)
  const lines = result.split("\n")

  expect(lines.at(-1)).toBe(
    JSON.stringify({
      type: "relation",
      id: 1,
      from: 1,
      to: 2,
      instruction: "Make these equal",
    })
  )
  const annotationLastIdx = lines.findLastIndex((l) => l.includes('"type":"annotation"'))
  const relationIdx = lines.findIndex((l) => l.includes('"type":"relation"'))
  expect(relationIdx).toBeGreaterThan(annotationLastIdx)
})

it("generateBatchJsonl: emits one line per relation, in order", () => {
  const result = generateBatchJsonl({
    ...batchInput,
    relations: [
      { id: 1, fromId: 1, toId: 2, instruction: "First" },
      { id: 2, fromId: 2, toId: 1, instruction: "Second" },
    ],
  })
  const relationLines = result
    .split("\n")
    .filter((l) => l.includes('"type":"relation"'))

  expect(relationLines).toEqual([
    JSON.stringify({ type: "relation", id: 1, from: 1, to: 2, instruction: "First" }),
    JSON.stringify({ type: "relation", id: 2, from: 2, to: 1, instruction: "Second" }),
  ])
})

it("generateBatchJsonl: emits no relation lines when relations is undefined or empty", () => {
  const undefinedRelations = generateBatchJsonl({ ...batchInput, relations: undefined })
  const emptyRelations = generateBatchJsonl({ ...batchInput, relations: [] })

  expect(undefinedRelations).not.toContain('"type":"relation"')
  expect(emptyRelations).not.toContain('"type":"relation"')
})
