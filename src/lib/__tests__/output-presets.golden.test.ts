import { describe, expect, it } from "vitest"

import { generateBatchJsonl, generateJsonl } from "../jsonl-generator"
import { generateBatchMarkdown, generateMarkdown } from "../markdown-generator"
import type { BatchInput, MarkdownInput } from "../types"

/**
 * Locks the exact byte-for-byte shape of the pre-existing `jsonl`/`markdown`
 * presets so the section-options refactor introduced for `cursor`/`minimal`
 * can never silently reorder or reformat a line. The other generator tests
 * use `toContain`, which would not catch that class of regression.
 */

const elementInfo = {
  selector: "#app > div.container",
  tag: "div",
  text: "Hello World",
  attributes: { class: "container", "data-testid": "main" },
  styles: { display: "flex", padding: "8px 16px" },
}

const frameworkInfo = {
  framework: "React" as const,
  metaFramework: "Next.js (App Router)" as const,
}

const componentInfo = {
  framework: "react" as const,
  hierarchy: ["App", "Layout", "Header"],
  props: { title: "My App" },
  state: { count: 0 },
  source: { file: "src/components/Header.tsx", line: 42 },
}

const singleInput: MarkdownInput = {
  instruction: "Fix the button style",
  pageUrl: "https://example.com",
  pageTitle: "Example Page",
  frameworkInfo,
  elementInfo,
  componentInfo,
}

describe("generateMarkdown: golden full output (backward-compat guard)", () => {
  it("matches the documented format exactly", () => {
    const expected = [
      "## User Instruction\nFix the button style",
      [
        "## Page Context",
        "- **URL**: https://example.com",
        "- **Framework**: React",
        "- **Meta Framework**: Next.js (App Router)",
        "- **Page Title**: Example Page",
      ].join("\n"),
      [
        "## Selected Element",
        "- **Selector**: `#app > div.container`",
        "- **Tag**: `<div>`",
        '- **Text**: "Hello World"',
        "- **Attributes**:",
        "  - class: `container`",
        "  - data-testid: `main`",
        "- **Styles**:",
        "  - display: `flex`",
        "  - padding: `8px 16px`",
      ].join("\n"),
      [
        "## Component Tree (React)",
        "- `App` → `Layout` → `Header`",
        "- **Source**: `src/components/Header.tsx:42`",
        '- **Props**: `{ title: "My App" }`',
        "- **State**: `{ count: 0 }`",
      ].join("\n"),
    ].join("\n\n")

    expect(generateMarkdown(singleInput)).toBe(expected)
  })
})

describe("generateJsonl: golden full output (backward-compat guard)", () => {
  it("matches the documented format exactly", () => {
    const expectedLines = [
      { type: "instruction", content: "Fix the button style" },
      {
        type: "pageContext",
        url: "https://example.com",
        pageTitle: "Example Page",
        framework: "React",
        metaFramework: "Next.js (App Router)",
      },
      {
        type: "selectedElement",
        selector: "#app > div.container",
        tag: "div",
        text: "Hello World",
        attributes: { class: "container", "data-testid": "main" },
        styles: { display: "flex", padding: "8px 16px" },
      },
      {
        type: "componentTree",
        framework: "react",
        hierarchy: ["App", "Layout", "Header"],
        source: "src/components/Header.tsx:42",
        props: { title: "My App" },
        state: { count: 0 },
      },
    ]

    expect(generateJsonl(singleInput)).toBe(
      expectedLines.map((line) => JSON.stringify(line)).join("\n")
    )
  })
})

const batchInput: BatchInput = {
  pageUrl: "https://example.com",
  pageTitle: "Test Page",
  prefix: "[repo=my-app]",
  annotations: [
    {
      id: 1,
      elementInfo,
      frameworkInfo,
      componentInfo,
      instruction: "Fix this",
      pageX: 100,
      pageY: 200,
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

describe("generateBatchMarkdown: golden full output (backward-compat guard)", () => {
  it("matches the documented format exactly, prefix included", () => {
    const body = [
      [
        "## Page Context",
        "- **URL**: https://example.com",
        "- **Framework**: React",
        "- **Meta Framework**: Next.js (App Router)",
        "- **Page Title**: Test Page",
        "- **Viewport**: 1280x800",
        "- **Language**: en-US",
        "- **User Agent**: TestAgent/1.0",
      ].join("\n"),
      [
        "## Annotation #1",
        "**Instruction**: Fix this",
        "- **Selector**: `#app > div.container`",
        "- **Tag**: `<div>`",
        '- **Text**: "Hello World"',
        "- **Attributes**:",
        "  - class: `container`",
        "  - data-testid: `main`",
        "- **Styles**:",
        "  - display: `flex`",
        "  - padding: `8px 16px`",
        "- **Component**: `App` → `Layout` → `Header`",
        "- **Source**: `src/components/Header.tsx:42`",
        '- **Props**: `{ title: "My App" }`',
        "- **State**: `{ count: 0 }`",
      ].join("\n"),
    ].join("\n\n")
    const expected = `[repo=my-app]\n\n${body}`

    expect(generateBatchMarkdown(batchInput)).toBe(expected)
  })
})

describe("generateBatchJsonl: golden full output (backward-compat guard)", () => {
  it("matches the documented format exactly, prefix included", () => {
    const expectedLines = [
      { type: "prefix", content: "[repo=my-app]" },
      {
        type: "pageContext",
        url: "https://example.com",
        pageTitle: "Test Page",
        framework: "React",
        metaFramework: "Next.js (App Router)",
        viewport: "1280x800",
        language: "en-US",
        userAgent: "TestAgent/1.0",
      },
      {
        type: "annotation",
        id: 1,
        instruction: "Fix this",
        element: {
          selector: "#app > div.container",
          tag: "div",
          text: "Hello World",
          attributes: { class: "container", "data-testid": "main" },
          styles: { display: "flex", padding: "8px 16px" },
        },
        component: {
          framework: "react",
          hierarchy: ["App", "Layout", "Header"],
          source: "src/components/Header.tsx:42",
          props: { title: "My App" },
          state: { count: 0 },
        },
      },
    ]

    expect(generateBatchJsonl(batchInput)).toBe(
      expectedLines.map((line) => JSON.stringify(line)).join("\n")
    )
  })
})
