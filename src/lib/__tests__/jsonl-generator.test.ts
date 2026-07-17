import { expect, it } from "vitest"
import { generateJsonl } from "../jsonl-generator"
import type { MarkdownInput } from "../types"

const baseElementInfo = {
  selector: "#app > div",
  tag: "div",
  text: "Hello",
  attributes: { class: "container" },
}

const baseFrameworkInfo = {
  framework: "React" as const,
  metaFramework: "Next.js (App Router)" as const,
}

const baseComponentInfo = {
  framework: "react" as const,
  hierarchy: ["App", "Header"],
  props: { title: "Test" },
  state: { count: 0 },
}

it("generateJsonl: should generate all lines with full input", () => {
  const input: MarkdownInput = {
    instruction: "Fix style",
    pageUrl: "https://example.com",
    pageTitle: "Example",
    frameworkInfo: baseFrameworkInfo,
    elementInfo: baseElementInfo,
    componentInfo: baseComponentInfo,
  }

  const result = generateJsonl(input)
  const lines = result.split("\n")

  expect(lines).toHaveLength(4)

  const instruction = JSON.parse(lines[0])
  expect(instruction).toEqual({ type: "instruction", content: "Fix style" })

  const pageContext = JSON.parse(lines[1])
  expect(pageContext).toEqual({
    type: "pageContext",
    url: "https://example.com",
    pageTitle: "Example",
    framework: "React",
    metaFramework: "Next.js (App Router)",
  })

  const selectedElement = JSON.parse(lines[2])
  expect(selectedElement).toEqual({
    type: "selectedElement",
    selector: "#app > div",
    tag: "div",
    text: "Hello",
    attributes: { class: "container" },
  })

  const componentTree = JSON.parse(lines[3])
  expect(componentTree).toEqual({
    type: "componentTree",
    framework: "react",
    hierarchy: ["App", "Header"],
    props: { title: "Test" },
    state: { count: 0 },
  })
})

it("generateJsonl: should skip instruction when empty", () => {
  const input: MarkdownInput = {
    instruction: "   ",
    pageUrl: "https://example.com",
    pageTitle: "Example",
    frameworkInfo: null,
    elementInfo: { ...baseElementInfo, text: "", attributes: {} },
    componentInfo: null,
  }

  const result = generateJsonl(input)
  const lines = result.split("\n")

  expect(lines).toHaveLength(2)
  const pageContext = JSON.parse(lines[0])
  expect(pageContext.type).toBe("pageContext")
  expect(pageContext.framework).toBeUndefined()

  const selectedElement = JSON.parse(lines[1])
  expect(selectedElement.text).toBeUndefined()
  expect(selectedElement.attributes).toBeUndefined()
})

it("generateJsonl: should handle frameworkInfo with only framework", () => {
  const input: MarkdownInput = {
    instruction: "test",
    pageUrl: "https://example.com",
    pageTitle: "Page",
    frameworkInfo: { framework: "Vue", metaFramework: null },
    elementInfo: baseElementInfo,
    componentInfo: null,
  }

  const result = generateJsonl(input)
  const lines = result.split("\n")
  const pageContext = JSON.parse(lines[1])

  expect(pageContext.framework).toBe("Vue")
  expect(pageContext.metaFramework).toBeUndefined()
})

it("generateJsonl: should handle frameworkInfo with only metaFramework", () => {
  const input: MarkdownInput = {
    instruction: "test",
    pageUrl: "https://example.com",
    pageTitle: "Page",
    frameworkInfo: { framework: null, metaFramework: "Nuxt" },
    elementInfo: baseElementInfo,
    componentInfo: null,
  }

  const result = generateJsonl(input)
  const lines = result.split("\n")
  const pageContext = JSON.parse(lines[1])

  expect(pageContext.framework).toBeUndefined()
  expect(pageContext.metaFramework).toBe("Nuxt")
})

it("generateJsonl: should use 'data' key for vue component state", () => {
  const input: MarkdownInput = {
    instruction: "test",
    pageUrl: "https://example.com",
    pageTitle: "Page",
    frameworkInfo: null,
    elementInfo: baseElementInfo,
    componentInfo: {
      framework: "vue",
      hierarchy: ["App"],
      props: undefined,
      state: { visible: true },
    },
  }

  const result = generateJsonl(input)
  const lines = result.split("\n")
  const componentTree = JSON.parse(lines[lines.length - 1])

  expect(componentTree.data).toEqual({ visible: true })
  expect(componentTree.state).toBeUndefined()
  expect(componentTree.props).toBeUndefined()
})

it("generateJsonl: should handle Svelte pageContext and componentTree (no props/state)", () => {
  const input: MarkdownInput = {
    instruction: "test",
    pageUrl: "https://example.com",
    pageTitle: "Page",
    frameworkInfo: { framework: "Svelte 5", metaFramework: "SvelteKit" },
    elementInfo: baseElementInfo,
    componentInfo: {
      framework: "svelte",
      hierarchy: ["+page", "Widget"],
      source: { file: "src/lib/Widget.svelte", line: 3 },
    },
  }

  const lines = generateJsonl(input).split("\n")
  const pageContext = JSON.parse(lines[1])
  const componentTree = JSON.parse(lines[lines.length - 1])

  expect(pageContext.framework).toBe("Svelte 5")
  expect(pageContext.metaFramework).toBe("SvelteKit")
  expect(componentTree.framework).toBe("svelte")
  expect(componentTree.hierarchy).toEqual(["+page", "Widget"])
  expect(componentTree.source).toBe("src/lib/Widget.svelte:3")
  expect(componentTree.props).toBeUndefined()
  expect(componentTree.state).toBeUndefined()
  expect(componentTree.data).toBeUndefined()
})

it("generateJsonl: should handle componentInfo without props and state", () => {
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

  const result = generateJsonl(input)
  const lines = result.split("\n")
  const componentTree = JSON.parse(lines[lines.length - 1])

  expect(componentTree.props).toBeUndefined()
  expect(componentTree.state).toBeUndefined()
})

it("generateJsonl: should include component source as file:line string", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example",
    frameworkInfo: baseFrameworkInfo,
    elementInfo: baseElementInfo,
    componentInfo: {
      ...baseComponentInfo,
      source: { file: "src/components/Header.tsx", line: 42 },
    },
  }

  const lines = generateJsonl(input).split("\n")
  const componentTree = JSON.parse(lines[lines.length - 1])

  expect(componentTree.source).toBe("src/components/Header.tsx:42")
})

it("generateJsonl: should omit source key when component has none", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example",
    frameworkInfo: baseFrameworkInfo,
    elementInfo: baseElementInfo,
    componentInfo: baseComponentInfo,
  }

  const lines = generateJsonl(input).split("\n")
  const componentTree = JSON.parse(lines[lines.length - 1])

  expect("source" in componentTree).toBe(false)
})

it("generateJsonl: should include element styles when present", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example",
    frameworkInfo: null,
    elementInfo: {
      ...baseElementInfo,
      styles: { display: "flex", padding: "8px 16px" },
    },
    componentInfo: null,
  }

  const lines = generateJsonl(input).split("\n")
  const selectedElement = JSON.parse(lines[lines.length - 1])

  expect(selectedElement.styles).toEqual({
    display: "flex",
    padding: "8px 16px",
  })
})

it("generateJsonl: should omit styles key when absent or empty", () => {
  const input: MarkdownInput = {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example",
    frameworkInfo: null,
    elementInfo: { ...baseElementInfo, styles: {} },
    componentInfo: null,
  }

  const lines = generateJsonl(input).split("\n")
  const selectedElement = JSON.parse(lines[lines.length - 1])

  expect("styles" in selectedElement).toBe(false)
})
