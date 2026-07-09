import { expect, it } from "vitest"

import { CLAUDE_CODE_MARKER, generateBatchXml } from "../xml-generator"
import type { BatchInput } from "../types"

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

const batchInput: BatchInput = {
  pageUrl: "https://example.com",
  pageTitle: "Test Page",
  annotations: [
    {
      id: 1,
      elementInfo: baseElementInfo,
      frameworkInfo: baseFrameworkInfo,
      componentInfo: baseComponentInfo,
      instruction: "Fix this",
      pageX: 100,
      pageY: 200,
      createdAt: 0,
    },
    {
      id: 2,
      elementInfo: { selector: "p", tag: "p", text: "", attributes: {} },
      frameworkInfo: null,
      componentInfo: null,
      instruction: "   ",
      pageX: 300,
      pageY: 400,
      createdAt: 0,
    },
  ],
}

it("generateBatchXml: wraps multiple annotations under a single shared page-context", () => {
  const result = generateBatchXml(batchInput)
  expect(result).toContain('<annotation id="1">')
  expect(result).toContain('<annotation id="2">')
  expect(result.match(/<page-context>/g)?.length).toBe(1)
})

it("generateBatchXml: skips the instruction tag for annotations with blank instruction", () => {
  const result = generateBatchXml(batchInput)
  const annotation2 = result.split('<annotation id="2">')[1]
  expect(annotation2).not.toContain("<instruction>")
})

it("generateBatchXml: puts the prefix on its own line directly before the marker", () => {
  const result = generateBatchXml({ ...batchInput, prefix: "[repo=my-app]" })
  const lines = result.split("\n")
  expect(lines[0]).toBe("[repo=my-app]")
  expect(lines[1]).toBe(CLAUDE_CODE_MARKER)
})

it("generateBatchXml: omits the prefix line when unset", () => {
  const result = generateBatchXml(batchInput)
  expect(result.split("\n")[0]).toBe(CLAUDE_CODE_MARKER)
})

it("generateBatchXml: includes batch metadata (viewport/language/userAgent) in page-context", () => {
  const result = generateBatchXml({
    ...batchInput,
    metadata: {
      url: "https://example.com",
      title: "Test Page",
      viewport: { width: 1280, height: 800 },
      userAgent: "TestAgent/1.0",
      language: "en-US",
      timestamp: 0,
      frameworkInfo: null,
    },
  })
  expect(result).toContain("- **Viewport**: 1280x800")
  expect(result).toContain("- **Language**: en-US")
  expect(result).toContain("- **User Agent**: TestAgent/1.0")
})

it("generateBatchXml: uses the first annotation with framework info for page-context", () => {
  const result = generateBatchXml(batchInput)
  expect(result).toContain("- **Framework**: React")
})

it("generateBatchXml: single pin copy (one annotation) still uses the same wrapper contract", () => {
  const single: BatchInput = {
    pageUrl: batchInput.pageUrl,
    pageTitle: batchInput.pageTitle,
    annotations: [batchInput.annotations[0]],
  }
  const result = generateBatchXml(single)
  expect(result.match(/<annotation /g)?.length).toBe(1)
  expect(result.startsWith(CLAUDE_CODE_MARKER)).toBe(true)
})
