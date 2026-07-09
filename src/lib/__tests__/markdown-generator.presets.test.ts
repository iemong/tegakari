import { describe, expect, it } from "vitest"

import { generateBatchMarkdown, generateMarkdown } from "../markdown-generator"
import type { BatchInput, MarkdownInput, MarkdownSectionOptions } from "../types"

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

const deepComponentInfo = {
  framework: "react" as const,
  hierarchy: ["App", "Layout", "Page", "Section", "Header"],
  props: { title: "My App" },
  state: { count: 0 },
  source: { file: "src/components/Header.tsx", line: 10 },
}

const CURSOR_OPTIONS: MarkdownSectionOptions = {
  pageContext: "compact",
  component: "brief",
}

const MINIMAL_OPTIONS: MarkdownSectionOptions = {
  pageContext: "url-only",
  element: "minimal",
  component: "none",
}

const fullInput: MarkdownInput = {
  instruction: "Fix the button style",
  pageUrl: "https://example.com",
  pageTitle: "Example Page",
  frameworkInfo: baseFrameworkInfo,
  elementInfo: baseElementInfo,
  componentInfo: deepComponentInfo,
}

describe("generateMarkdown: pageContext option", () => {
  it("compact keeps url/title/framework but no batch-only metadata (single already has none)", () => {
    const result = generateMarkdown(fullInput, { pageContext: "compact" })
    expect(result).toContain("- **URL**: https://example.com")
    expect(result).toContain("- **Framework**: React")
    expect(result).toContain("- **Page Title**: Example Page")
  })

  it("url-only drops title and framework", () => {
    const result = generateMarkdown(fullInput, { pageContext: "url-only" })
    expect(result).toContain("- **URL**: https://example.com")
    expect(result).not.toContain("- **Framework**:")
    expect(result).not.toContain("- **Page Title**:")
  })
})

describe("generateMarkdown: element option", () => {
  it("minimal keeps selector/tag/class/text and drops full attributes + styles", () => {
    const result = generateMarkdown(fullInput, { element: "minimal" })
    expect(result).toContain("- **Selector**: `#app > div.container`")
    expect(result).toContain("- **Tag**: `<div>`")
    expect(result).toContain("- **Class**: `container`")
    expect(result).toContain('- **Text**: "Hello World"')
    expect(result).not.toContain("- **Attributes**:")
    expect(result).not.toContain("- **Styles**:")
    expect(result).not.toContain("data-testid")
  })

  it("minimal omits the Class line when the element has no class attribute", () => {
    const result = generateMarkdown(
      {
        ...fullInput,
        elementInfo: { selector: "p", tag: "p", text: "", attributes: {} },
      },
      { element: "minimal" }
    )
    expect(result).not.toContain("- **Class**:")
  })
})

describe("generateMarkdown: component option", () => {
  it("brief slices to the 3 hierarchy levels closest to the selected element, source only", () => {
    const result = generateMarkdown(fullInput, { component: "brief" })
    expect(result).toContain("`Page` → `Section` → `Header`")
    expect(result).not.toContain("`App` →")
    expect(result).toContain("- **Source**: `src/components/Header.tsx:10`")
    expect(result).not.toContain("**Props**")
    expect(result).not.toContain("**State**")
  })

  it("none omits the Component Tree section entirely", () => {
    const result = generateMarkdown(fullInput, { component: "none" })
    expect(result).not.toContain("## Component Tree")
  })
})

describe("generateMarkdown: cursor preset options combined", () => {
  it("produces a concise but code-locatable output", () => {
    const result = generateMarkdown(fullInput, CURSOR_OPTIONS)
    expect(result).toContain("## User Instruction")
    expect(result).toContain("- **Selector**:")
    expect(result).toContain("`Page` → `Section` → `Header`")
    expect(result).toContain("- **Source**:")
    expect(result).not.toContain("**Props**")
  })
})

describe("generateMarkdown: minimal preset options combined", () => {
  it("produces the token-saving minimal shape", () => {
    const result = generateMarkdown(fullInput, MINIMAL_OPTIONS)
    expect(result).toContain("## User Instruction")
    expect(result).toContain("- **URL**: https://example.com")
    expect(result).not.toContain("- **Page Title**:")
    expect(result).toContain("- **Selector**:")
    expect(result).toContain("- **Class**: `container`")
    expect(result).not.toContain("- **Attributes**:")
    expect(result).not.toContain("## Component Tree")
  })
})

describe("generateBatchMarkdown: preset options", () => {
  const batchInput: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Test Page",
    annotations: [
      {
        id: 1,
        elementInfo: baseElementInfo,
        frameworkInfo: baseFrameworkInfo,
        componentInfo: deepComponentInfo,
        instruction: "Fix this",
        pageX: 0,
        pageY: 0,
        createdAt: 0,
      },
    ],
    metadata: {
      url: "https://example.com",
      title: "Test Page",
      viewport: { width: 1280, height: 800 },
      userAgent: "TestAgent/1.0",
      language: "en-US",
      timestamp: 0,
      frameworkInfo: null,
    },
  }

  it("cursor drops batch metadata from Page Context", () => {
    const result = generateBatchMarkdown(batchInput, CURSOR_OPTIONS)
    expect(result).toContain("- **URL**: https://example.com")
    expect(result).not.toContain("- **Viewport**:")
    expect(result).not.toContain("- **User Agent**:")
  })

  it("cursor brief component appears inline under the annotation", () => {
    const result = generateBatchMarkdown(batchInput, CURSOR_OPTIONS)
    expect(result).toContain("- **Component**: `Page` → `Section` → `Header`")
    expect(result).not.toContain("- **Props**:")
  })

  it("minimal drops the component section for batch annotations", () => {
    const result = generateBatchMarkdown(batchInput, MINIMAL_OPTIONS)
    expect(result).not.toContain("- **Component**:")
    expect(result).toContain("- **Class**: `container`")
  })
})
