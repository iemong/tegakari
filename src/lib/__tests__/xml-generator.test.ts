import { expect, it } from "vitest"

import { CLAUDE_CODE_MARKER, generateXml } from "../xml-generator"
import type { MarkdownInput } from "../types"

const baseElementInfo = {
  selector: "#app > div.container",
  tag: "div",
  text: "Hello World",
  attributes: { class: "container", "data-testid": "main" },
  styles: { display: "flex", padding: "8px 16px" },
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
  source: { file: "src/components/Header.tsx", line: 10 },
}

const fullInput: MarkdownInput = {
  instruction: "Fix the button style",
  pageUrl: "https://example.com",
  pageTitle: "Example Page",
  frameworkInfo: baseFrameworkInfo,
  elementInfo: baseElementInfo,
  componentInfo: baseComponentInfo,
}

it("CLAUDE_CODE_MARKER: is the exact contract string the tegakari-fix skill triggers on", () => {
  expect(CLAUDE_CODE_MARKER).toBe(
    '<tegakari-output version="1" preset="claude-code">'
  )
})

it("generateXml: wraps the output in the marker and a single annotation id=1", () => {
  const lines = generateXml(fullInput).split("\n")
  expect(lines[0]).toBe(CLAUDE_CODE_MARKER)
  expect(lines[lines.length - 1]).toBe("</tegakari-output>")
  expect(lines).toContain('<annotation id="1">')
})

it("generateXml: includes page-context with the same content lines as the Markdown Page Context section", () => {
  const result = generateXml(fullInput)
  expect(result).toContain("<page-context>")
  expect(result).toContain("- **URL**: https://example.com")
  expect(result).toContain("- **Framework**: React")
  expect(result).toContain("- **Meta Framework**: Next.js (App Router)")
  expect(result).toContain("- **Page Title**: Example Page")
  expect(result).toContain("</page-context>")
})

it("generateXml: includes the instruction tag when present", () => {
  const result = generateXml(fullInput)
  expect(result).toContain("<instruction>")
  expect(result).toContain("Fix the button style")
  expect(result).toContain("</instruction>")
})

it("generateXml: omits the instruction tag when blank", () => {
  const result = generateXml({ ...fullInput, instruction: "   " })
  expect(result).not.toContain("<instruction>")
})

it("generateXml: includes the element tag without styles", () => {
  const result = generateXml(fullInput)
  const elementBlock = result.slice(
    result.indexOf("<element>"),
    result.indexOf("</element>")
  )
  expect(elementBlock).toContain("- **Selector**: `#app > div.container`")
  expect(elementBlock).toContain("- **Tag**: `<div>`")
  expect(elementBlock).toContain("- **Attributes**:")
  expect(elementBlock).not.toContain("Styles")
})

it("generateXml: includes the style-diff tag with styles separately from element", () => {
  const result = generateXml(fullInput)
  expect(result).toContain("<style-diff>")
  expect(result).toContain("- **Styles**:")
  expect(result).toContain("  - display: `flex`")
  expect(result).toContain("</style-diff>")
})

it("generateXml: omits the style-diff tag when there are no styles", () => {
  const result = generateXml({
    ...fullInput,
    elementInfo: { ...baseElementInfo, styles: undefined },
  })
  expect(result).not.toContain("<style-diff>")
})

it("generateXml: includes the component tag with full hierarchy/source/props/state", () => {
  const result = generateXml(fullInput)
  expect(result).toContain("<component>")
  expect(result).toContain("- `App` → `Layout` → `Header`")
  expect(result).toContain("- **Source**: `src/components/Header.tsx:10`")
  expect(result).toContain('- **Props**: `{ title: "My App" }`')
  expect(result).toContain("- **State**: `{ count: 0 }`")
  expect(result).toContain("</component>")
})

it("generateXml: omits the component tag when componentInfo is null", () => {
  const result = generateXml({ ...fullInput, componentInfo: null })
  expect(result).not.toContain("<component>")
  expect(result).not.toContain("</component>")
})

it("generateXml: produces the exact contract for a minimal input", () => {
  const minimalInput: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example",
    frameworkInfo: null,
    elementInfo: { selector: "#app", tag: "div", text: "", attributes: {} },
    componentInfo: null,
  }
  const expected = [
    CLAUDE_CODE_MARKER,
    "<page-context>",
    "- **URL**: https://example.com",
    "- **Page Title**: Example",
    "</page-context>",
    '<annotation id="1">',
    "<element>",
    "- **Selector**: `#app`",
    "- **Tag**: `<div>`",
    "</element>",
    "</annotation>",
    "</tegakari-output>",
  ].join("\n")
  expect(generateXml(minimalInput)).toBe(expected)
})
