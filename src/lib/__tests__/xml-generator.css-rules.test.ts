import { expect, it } from "vitest"
import { generateXml } from "../xml-generator"
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

it("generateXml: <element> includes CSS Rules lines when cssRules is present", () => {
  const result = generateXml(
    buildInput({
      ...baseElementInfo,
      cssRules: [
        { selector: ".container", source: "app.css", declarations: ["color: red"] },
      ],
    })
  )

  const elementBlock = result.slice(result.indexOf("<element>"), result.indexOf("</element>"))
  expect(elementBlock).toContain("- **CSS Rules**:")
  expect(elementBlock).toContain("  - `.container` (app.css)")
  expect(elementBlock).toContain("    - color: `red`")
})

it("generateXml: <element> does not gain a CSS Rules line when cssRules is absent", () => {
  const result = generateXml(buildInput(baseElementInfo))

  expect(result).not.toContain("**CSS Rules**")
})
