import { expect, it } from "vitest"

import { generateBatchXml } from "../xml-generator"
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

it("generateBatchXml: renders <relation> tags after the </annotation> group and before </tegakari-output>", () => {
  const result = generateBatchXml(batchInput)
  const lines = result.split("\n")
  const lastAnnotationCloseIdx = lines.lastIndexOf("</annotation>")
  const closeTagIdx = lines.indexOf("</tegakari-output>")

  expect(lines.slice(lastAnnotationCloseIdx + 1, closeTagIdx)).toEqual([
    '<relation id="1" from="1" to="2">',
    "Make these equal",
    "</relation>",
  ])
})

it("generateBatchXml: renders one <relation> block per relation, in order", () => {
  const result = generateBatchXml({
    ...batchInput,
    relations: [
      { id: 1, fromId: 1, toId: 2, instruction: "First" },
      { id: 2, fromId: 2, toId: 1, instruction: "Second" },
    ],
  })

  expect(result).toContain(
    ['<relation id="1" from="1" to="2">', "First", "</relation>"].join("\n")
  )
  expect(result).toContain(
    ['<relation id="2" from="2" to="1">', "Second", "</relation>"].join("\n")
  )
})

it("generateBatchXml: omits <relation> tags entirely when relations is undefined or empty", () => {
  const undefinedRelations = generateBatchXml({ ...batchInput, relations: undefined })
  const emptyRelations = generateBatchXml({ ...batchInput, relations: [] })

  expect(undefinedRelations).not.toContain("<relation")
  expect(emptyRelations).not.toContain("<relation")
})
