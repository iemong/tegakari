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

it("generateMarkdown: should generate full markdown with all sections", () => {
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
  expect(result).toContain('- **Props**: `{ title: "My App" }`')
  expect(result).toContain("- **State**: `{ count: 0 }`")
})

it("generateMarkdown: should skip instruction section when empty", () => {
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

it("generateMarkdown: should handle Vue component info with Data label", () => {
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

it("generateMarkdown: should handle frameworkInfo with only framework (no metaFramework)", () => {
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

it("generateMarkdown: should handle frameworkInfo with only metaFramework (no framework)", () => {
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

it("generateMarkdown: should handle componentInfo without props and state", () => {
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

it("generateMarkdown: should handle componentInfo with empty hierarchy", () => {
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

const specialPropsComponentInfo = {
  framework: "react" as const,
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
}

it("generateMarkdown: should format special values in props: null, undefined, fn, [Circular], ..., HTML element, array, nested object, number, boolean", () => {
  const input: MarkdownInput = {
    instruction: "test",
    pageUrl: "https://example.com",
    pageTitle: "Page",
    frameworkInfo: null,
    elementInfo: baseElementInfo,
    componentInfo: specialPropsComponentInfo,
  }

  const result = generateMarkdown(input)

  expect(result).toContain("null")
  expect(result).toContain("undefined")
  expect(result).toContain("fn")
  expect(result).toContain("[Circular]")
  expect(result).toContain("...")
  expect(result).toContain("<div>")
  expect(result).toContain('[1, "hello"]')
  expect(result).toContain("{ nested: true }")
  expect(result).toContain("42")
  expect(result).toContain("true")
  expect(result).toContain('"normal string"')
  expect(result).toContain("[]")
  expect(result).toContain("{}")
})

it("generateMarkdown: should handle empty props/state objects through formatObject", () => {
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

it("generateMarkdown: should handle formatObject catch branch with non-iterable object", () => {
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

it("generateMarkdown: should format non-standard value types via String() fallback", () => {
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
