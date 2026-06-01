import { expect, it } from "vitest"
import { generateBatchMarkdown } from "../markdown-generator"
import type { BatchInput } from "../types"

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

const fullBatchInput: BatchInput = {
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

it("generateBatchMarkdown: should generate batch markdown with page context and annotations", () => {
  const result = generateBatchMarkdown(fullBatchInput)

  expect(result).toContain("## Page Context")
  expect(result).toContain("- **URL**: https://example.com")
  expect(result).toContain("- **Framework**: React")
  expect(result).toContain("- **Meta Framework**: Next.js (App Router)")
  expect(result).toContain("- **Page Title**: Test Page")
  expect(result).toContain("## Annotation #1")
  expect(result).toContain("**Instruction**: Fix this")
  expect(result).toContain("- **Component**: `App` → `Layout` → `Header`")
  expect(result).toContain("- **Props**:")
  expect(result).toContain("- **State**:")
  expect(result).toContain("## Annotation #2")
  // Annotation #2 has empty instruction, so it should not have an instruction line
  const annotation2Section = result.split("## Annotation #2")[1]
  expect(annotation2Section).not.toContain("**Instruction**")
})

it("generateBatchMarkdown: should handle batch with no framework info", () => {
  const input: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Plain Page",
    annotations: [
      {
        id: 1,
        elementInfo: baseElementInfo,
        frameworkInfo: null,
        componentInfo: null,
        instruction: "test",
        pageX: 0,
        pageY: 0,
        createdAt: 0,
      },
    ],
  }

  const result = generateBatchMarkdown(input)

  expect(result).not.toContain("**Framework**")
  expect(result).not.toContain("**Component**")
})

it("generateBatchMarkdown: should handle vue component with Data label in batch", () => {
  const input: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Vue Page",
    annotations: [
      {
        id: 1,
        elementInfo: baseElementInfo,
        frameworkInfo: { framework: "Vue", metaFramework: null },
        componentInfo: {
          framework: "vue",
          hierarchy: ["App"],
          props: { msg: "hi" },
          state: { count: 1 },
        },
        instruction: "test",
        pageX: 0,
        pageY: 0,
        createdAt: 0,
      },
    ],
  }

  const result = generateBatchMarkdown(input)

  expect(result).toContain("- **Data**: `{ count: 1 }`")
})

it("generateBatchMarkdown: should handle batch annotation with empty element text and no attributes", () => {
  const input: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Page",
    annotations: [
      {
        id: 1,
        elementInfo: {
          selector: "div",
          tag: "div",
          text: "",
          attributes: {},
        },
        frameworkInfo: null,
        componentInfo: null,
        instruction: "check",
        pageX: 0,
        pageY: 0,
        createdAt: 0,
      },
    ],
  }

  const result = generateBatchMarkdown(input)

  expect(result).not.toContain("**Text**")
  expect(result).not.toContain("**Attributes**")
})

it("generateBatchMarkdown: should handle annotation with componentInfo without props/state and empty hierarchy", () => {
  const input: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Page",
    annotations: [
      {
        id: 1,
        elementInfo: baseElementInfo,
        frameworkInfo: null,
        componentInfo: {
          framework: "react",
          hierarchy: [],
          props: undefined,
          state: undefined,
        },
        instruction: "test",
        pageX: 0,
        pageY: 0,
        createdAt: 0,
      },
    ],
  }

  const result = generateBatchMarkdown(input)

  expect(result).not.toContain("**Component**:")
  expect(result).not.toContain("**Props**")
  expect(result).not.toContain("**State**")
})

it("generateBatchMarkdown: should handle batch frameworkInfo with only metaFramework from first annotation", () => {
  const input: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Page",
    annotations: [
      {
        id: 1,
        elementInfo: baseElementInfo,
        frameworkInfo: { framework: null, metaFramework: "Nuxt" },
        componentInfo: null,
        instruction: "",
        pageX: 0,
        pageY: 0,
        createdAt: 0,
      },
    ],
  }

  const result = generateBatchMarkdown(input)

  expect(result).not.toContain("- **Framework**:")
  expect(result).toContain("- **Meta Framework**: Nuxt")
})
