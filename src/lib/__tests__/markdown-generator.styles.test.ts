import { expect, it } from "vitest"
import { generateMarkdown } from "../markdown-generator"
import type { MarkdownInput } from "../types"

const baseElementInfo = {
  selector: "#app > div.container",
  tag: "div",
  text: "Hello World",
  attributes: { class: "container", "data-testid": "main" },
}

it("generateMarkdown: should render a Styles list when element has styles", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example Page",
    frameworkInfo: null,
    elementInfo: {
      ...baseElementInfo,
      styles: { display: "flex", "background-color": "rgb(37, 99, 235)" },
    },
    componentInfo: null,
  }

  const result = generateMarkdown(input)

  expect(result).toContain("- **Styles**:")
  expect(result).toContain("  - display: `flex`")
  expect(result).toContain("  - background-color: `rgb(37, 99, 235)`")
})

it("generateMarkdown: should not render Styles when element has none", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example Page",
    frameworkInfo: null,
    elementInfo: baseElementInfo,
    componentInfo: null,
  }

  const result = generateMarkdown(input)

  expect(result).not.toContain("**Styles**")
})
