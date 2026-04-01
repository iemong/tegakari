import { describe, it, expect } from "vitest"
import { generateMarkdown, generateBatchMarkdown } from "../markdown-generator"
import type { MarkdownInput, BatchInput } from "../types"

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

describe("generateMarkdown", () => {
  it("should generate full markdown with all sections", () => {
    const input: MarkdownInput = {
      instruction: "Fix the button style",
      pageUrl: "https://example.com",
      pageTitle: "Example Page",
      frameworkInfo: baseFrameworkInfo,
      elementInfo: baseElementInfo,
      componentInfo: baseComponentInfo,
    }

    const result = generateMarkdown(input)

    expect(result).toContain("## User Instruction")
    expect(result).toContain("Fix the button style")
    expect(result).toContain("## Page Context")
    expect(result).toContain("- **URL**: https://example.com")
    expect(result).toContain("- **Framework**: React")
    expect(result).toContain("- **Meta Framework**: Next.js (App Router)")
    expect(result).toContain("- **Page Title**: Example Page")
    expect(result).toContain("## Selected Element")
    expect(result).toContain("- **Selector**: `#app > div.container`")
    expect(result).toContain("- **Tag**: `<div>`")
    expect(result).toContain('- **Text**: "Hello World"')
    expect(result).toContain("- **Attributes**:")
    expect(result).toContain("  - class: `container`")
    expect(result).toContain("  - data-testid: `main`")
    expect(result).toContain("## Component Tree (React)")
    expect(result).toContain("- `App` → `Layout` → `Header`")
    expect(result).toContain("- **Props**: `{ title: \"My App\" }`")
    expect(result).toContain("- **State**: `{ count: 0 }`")
  })

  it("should skip instruction section when empty", () => {
    const input: MarkdownInput = {
      instruction: "   ",
      pageUrl: "https://example.com",
      pageTitle: "Example",
      frameworkInfo: null,
      elementInfo: { ...baseElementInfo, text: "", attributes: {} },
      componentInfo: null,
    }

    const result = generateMarkdown(input)

    expect(result).not.toContain("## User Instruction")
    expect(result).not.toContain("## Component Tree")
    expect(result).not.toContain("**Text**")
    expect(result).not.toContain("**Attributes**")
  })

  it("should handle Vue component info with Data label", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Vue Page",
      frameworkInfo: { framework: "Vue", metaFramework: null },
      elementInfo: baseElementInfo,
      componentInfo: {
        framework: "vue",
        hierarchy: ["App", "Header"],
        props: { msg: "hello" },
        state: { visible: true },
      },
    }

    const result = generateMarkdown(input)

    expect(result).toContain("## Component Tree (Vue)")
    expect(result).toContain("- **Data**: `{ visible: true }`")
    expect(result).not.toContain("- **Meta Framework**:")
  })

  it("should handle frameworkInfo with only framework (no metaFramework)", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: { framework: "React", metaFramework: null },
      elementInfo: baseElementInfo,
      componentInfo: null,
    }

    const result = generateMarkdown(input)

    expect(result).toContain("- **Framework**: React")
    expect(result).not.toContain("Meta Framework")
  })

  it("should handle frameworkInfo with only metaFramework (no framework)", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: { framework: null, metaFramework: "Next.js" },
      elementInfo: baseElementInfo,
      componentInfo: null,
    }

    const result = generateMarkdown(input)

    expect(result).not.toContain("- **Framework**:")
    expect(result).toContain("- **Meta Framework**: Next.js")
  })

  it("should handle componentInfo without props and state", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: null,
      elementInfo: baseElementInfo,
      componentInfo: {
        framework: "react",
        hierarchy: ["App"],
        props: undefined,
        state: undefined,
      },
    }

    const result = generateMarkdown(input)

    expect(result).toContain("## Component Tree (React)")
    expect(result).toContain("- `App`")
    expect(result).not.toContain("**Props**")
    expect(result).not.toContain("**State**")
  })

  it("should handle componentInfo with empty hierarchy", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: null,
      elementInfo: baseElementInfo,
      componentInfo: {
        framework: "react",
        hierarchy: [],
        props: { a: 1 },
      },
    }

    const result = generateMarkdown(input)

    expect(result).toContain("## Component Tree (React)")
    expect(result).not.toContain("→")
  })

  it("should format special values in props: null, undefined, fn, [Circular], ..., HTML element, array, nested object, number, boolean", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: null,
      elementInfo: baseElementInfo,
      componentInfo: {
        framework: "react",
        hierarchy: ["App"],
        props: {
          a: null,
          b: undefined,
          c: "fn",
          d: "[Circular]",
          e: "...",
          f: "<div>",
          g: [1, "hello"],
          h: { nested: true },
          i: 42,
          j: true,
          k: "normal string",
          l: [],
          m: {},
        },
      },
    }

    const result = generateMarkdown(input)

    expect(result).toContain("null")
    expect(result).toContain("undefined")
    expect(result).toContain("fn")
    expect(result).toContain("[Circular]")
    expect(result).toContain("...")
    expect(result).toContain("<div>")
    expect(result).toContain("[1, \"hello\"]")
    expect(result).toContain("{ nested: true }")
    expect(result).toContain("42")
    expect(result).toContain("true")
    expect(result).toContain('"normal string"')
    expect(result).toContain("[]")
    expect(result).toContain("{}")
  })

  it("should handle empty props/state objects through formatObject", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: null,
      elementInfo: baseElementInfo,
      componentInfo: {
        framework: "react",
        hierarchy: ["App"],
        props: {},
        state: {},
      },
    }

    const result = generateMarkdown(input)

    expect(result).toContain("**Props**: `{}`")
    expect(result).toContain("**State**: `{}`")
  })

  it("should handle formatObject catch branch with non-iterable object", () => {
    const throwingProxy = new Proxy({} as Record<string, unknown>, {
      ownKeys() {
        throw new Error("cannot enumerate")
      },
    })

    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: null,
      elementInfo: baseElementInfo,
      componentInfo: {
        framework: "react",
        hierarchy: ["App"],
        props: throwingProxy,
      },
    }

    const result = generateMarkdown(input)

    expect(result).toContain("{...}")
  })

  it("should format non-standard value types via String() fallback", () => {
    const input: MarkdownInput = {
      instruction: "test",
      pageUrl: "https://example.com",
      pageTitle: "Page",
      frameworkInfo: null,
      elementInfo: baseElementInfo,
      componentInfo: {
        framework: "react",
        hierarchy: ["App"],
        props: {
          big: BigInt(42),
        },
      },
    }

    const result = generateMarkdown(input)

    expect(result).toContain("42")
  })
})

describe("generateBatchMarkdown", () => {
  it("should generate batch markdown with page context and annotations", () => {
    const input: BatchInput = {
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
          status: "default" as const,
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
          status: "default" as const,
          createdAt: 0,
        },
      ],
    }

    const result = generateBatchMarkdown(input)

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

  it("should handle batch with no framework info", () => {
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
          status: "default" as const,
          createdAt: 0,
        },
      ],
    }

    const result = generateBatchMarkdown(input)

    expect(result).not.toContain("**Framework**")
    expect(result).not.toContain("**Component**")
  })

  it("should handle vue component with Data label in batch", () => {
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
          status: "default" as const,
          createdAt: 0,
        },
      ],
    }

    const result = generateBatchMarkdown(input)

    expect(result).toContain("- **Data**: `{ count: 1 }`")
  })

  it("should handle batch annotation with empty element text and no attributes", () => {
    const input: BatchInput = {
      pageUrl: "https://example.com",
      pageTitle: "Page",
      annotations: [
        {
          id: 1,
          elementInfo: { selector: "div", tag: "div", text: "", attributes: {} },
          frameworkInfo: null,
          componentInfo: null,
          instruction: "check",
          pageX: 0,
          pageY: 0,
          status: "default" as const,
          createdAt: 0,
        },
      ],
    }

    const result = generateBatchMarkdown(input)

    expect(result).not.toContain("**Text**")
    expect(result).not.toContain("**Attributes**")
  })

  it("should handle annotation with componentInfo without props/state and empty hierarchy", () => {
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
          status: "default" as const,
          createdAt: 0,
        },
      ],
    }

    const result = generateBatchMarkdown(input)

    expect(result).not.toContain("**Component**:")
    expect(result).not.toContain("**Props**")
    expect(result).not.toContain("**State**")
  })

  it("should handle batch frameworkInfo with only metaFramework from first annotation", () => {
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
          status: "default" as const,
          createdAt: 0,
        },
      ],
    }

    const result = generateBatchMarkdown(input)

    expect(result).not.toContain("- **Framework**:")
    expect(result).toContain("- **Meta Framework**: Nuxt")
  })
})
