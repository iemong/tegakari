import { expect, it } from "vitest"

import { generateBatchMarkdown, generateMarkdown } from "../markdown-generator"
import type { BatchInput, MarkdownInput } from "../types"

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
  relations: [
    { id: 1, fromId: 1, toId: 2, instruction: "Make the spacing between these equal" },
  ],
}

it("generateBatchMarkdown: appends a Relations section after all annotation sections", () => {
  const result = generateBatchMarkdown(batchInput)

  expect(result).toContain(
    ["## Relations", "- [#1 ↔ #2] Make the spacing between these equal"].join("\n")
  )
  const annotation2Idx = result.indexOf("## Annotation #2")
  const relationsIdx = result.indexOf("## Relations")
  expect(relationsIdx).toBeGreaterThan(annotation2Idx)
})

it("generateBatchMarkdown: renders one line per relation, in order", () => {
  const result = generateBatchMarkdown({
    ...batchInput,
    relations: [
      { id: 1, fromId: 1, toId: 2, instruction: "First" },
      { id: 2, fromId: 2, toId: 1, instruction: "Second" },
    ],
  })

  expect(result).toContain(
    ["## Relations", "- [#1 ↔ #2] First", "- [#2 ↔ #1] Second"].join("\n")
  )
})

it("generateBatchMarkdown: omits the Relations section entirely when relations is undefined or empty", () => {
  const undefinedRelations = generateBatchMarkdown({
    ...batchInput,
    relations: undefined,
  })
  const emptyRelations = generateBatchMarkdown({ ...batchInput, relations: [] })

  expect(undefinedRelations).not.toContain("## Relations")
  expect(emptyRelations).not.toContain("## Relations")
})

it("generateMarkdown (single, non-batch): has no relations concept at all", () => {
  const input: MarkdownInput = {
    instruction: "Fix it",
    pageUrl: "https://example.com",
    pageTitle: "Page",
    frameworkInfo: null,
    elementInfo,
    componentInfo: null,
  }
  expect(generateMarkdown(input)).not.toContain("## Relations")
})
