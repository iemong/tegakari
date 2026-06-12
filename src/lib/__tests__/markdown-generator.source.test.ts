import { expect, it } from "vitest"
import { generateMarkdown } from "../markdown-generator"
import type { MarkdownInput } from "../types"

const baseElementInfo = {
  selector: "#app > div.container",
  tag: "div",
  text: "Hello World",
  attributes: { class: "container", "data-testid": "main" },
}

const baseFrameworkInfo = {
  framework: "React" as const,
  metaFramework: "Next.js (App Router)" as const,
}

const baseComponentInfo = {
  framework: "react" as const,
  hierarchy: ["App", "Layout", "Header"],
  props: { title: "My App" },
  state: { count: 0 },
}

it("generateMarkdown: should include component source line", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example Page",
    frameworkInfo: baseFrameworkInfo,
    elementInfo: baseElementInfo,
    componentInfo: {
      ...baseComponentInfo,
      source: { file: "src/components/Header.tsx", line: 42 },
    },
  }

  const result = generateMarkdown(input)

  expect(result).toContain("- **Source**: `src/components/Header.tsx:42`")
})

it("generateMarkdown: should not render a Source line when component has none", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example Page",
    frameworkInfo: baseFrameworkInfo,
    elementInfo: baseElementInfo,
    componentInfo: baseComponentInfo,
  }

  const result = generateMarkdown(input)

  expect(result).not.toContain("**Source**")
})
