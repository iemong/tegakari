import { expect, it } from "vitest"
import { generateJsonl } from "../jsonl-generator"
import type { ElementInfo, MarkdownInput } from "../types"

const baseElementInfo: ElementInfo = {
  selector: "#app > div.container",
  tag: "div",
  text: "Hello World",
  attributes: { class: "container" },
}

function buildInput(elementInfo: ElementInfo): MarkdownInput {
  return {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example Page",
    frameworkInfo: null,
    elementInfo,
    componentInfo: null,
  }
}

it("generateJsonl: includes cssRules/customProperties on the selectedElement line when present", () => {
  const cssRules = [
    { selector: ".container", source: "app.css", declarations: ["color: red"] },
  ]
  const customProperties = { "--brand-color": "rgb(37, 99, 235)" }

  const line = JSON.parse(
    generateJsonl(buildInput({ ...baseElementInfo, cssRules, customProperties }))
      .split("\n")
      .find((l) => l.includes('"type":"selectedElement"'))!
  )

  expect(line.cssRules).toEqual(cssRules)
  expect(line.customProperties).toEqual(customProperties)
})

it("generateJsonl: omits cssRules/customProperties keys when absent", () => {
  const line = JSON.parse(
    generateJsonl(buildInput(baseElementInfo))
      .split("\n")
      .find((l) => l.includes('"type":"selectedElement"'))!
  )

  expect(line).not.toHaveProperty("cssRules")
  expect(line).not.toHaveProperty("customProperties")
})

it("generateJsonl: omits cssRules key for an empty array", () => {
  const line = JSON.parse(
    generateJsonl(buildInput({ ...baseElementInfo, cssRules: [] }))
      .split("\n")
      .find((l) => l.includes('"type":"selectedElement"'))!
  )

  expect(line).not.toHaveProperty("cssRules")
})
