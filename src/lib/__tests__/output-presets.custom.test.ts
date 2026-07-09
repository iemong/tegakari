import { describe, expect, it } from "vitest"

import { generateBatchPresetOutput } from "../output-presets"
import { toCustomPresetValue } from "../output-templates"
import type { BatchInput } from "../types"

const batchInput: BatchInput = {
  pageUrl: "https://example.com",
  pageTitle: "Example",
  annotations: [
    {
      id: 1,
      elementInfo: { selector: "#app", tag: "div", text: "Hi", attributes: {} },
      frameworkInfo: null,
      componentInfo: null,
      instruction: "Fix this",
      pageX: 0,
      pageY: 0,
      createdAt: 0,
    },
  ],
}

describe("generateBatchPresetOutput: custom template routing", () => {
  it("renders through the referenced template when it's found in customTemplates", () => {
    const template = {
      id: "tpl-1",
      name: "My Template",
      header: "URL: {{page.url}}",
      annotation: "Selector: {{selector}}",
    }
    const result = generateBatchPresetOutput(
      toCustomPresetValue("tpl-1"),
      batchInput,
      [template]
    )
    expect(result).toBe("URL: https://example.com\n\nSelector: #app")
  })

  it("falls back to the jsonl preset when the referenced template id isn't found", () => {
    const result = generateBatchPresetOutput(
      toCustomPresetValue("missing-id"),
      batchInput,
      []
    )
    const lines = result.split("\n")
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow()
  })

  it("falls back to the jsonl preset when no customTemplates argument is passed at all", () => {
    const result = generateBatchPresetOutput(toCustomPresetValue("tpl-1"), batchInput)
    const lines = result.split("\n")
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow()
  })

  it("built-in presets are unaffected by the customTemplates parameter", () => {
    const result = generateBatchPresetOutput("jsonl", batchInput, [
      { id: "tpl-1", name: "Unused", header: "H", annotation: "A" },
    ])
    const lines = result.split("\n")
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow()
  })
})
