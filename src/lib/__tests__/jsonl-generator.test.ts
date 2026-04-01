import { describe, it, expect } from "vitest"
import { generateJsonl, generateBatchJsonl } from "../jsonl-generator"
import type { MarkdownInput, BatchInput } from "../types"

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

describe("generateJsonl", () => {
  it("should generate all lines with full input", () => {
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

  it("should skip instruction when empty", () => {
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

  it("should handle frameworkInfo with only framework", () => {
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

  it("should handle frameworkInfo with only metaFramework", () => {
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

  it("should use 'data' key for vue component state", () => {
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

    const result = generateJsonl(input)
    const lines = result.split("\n")
    const componentTree = JSON.parse(lines[lines.length - 1])

    expect(componentTree.props).toBeUndefined()
    expect(componentTree.state).toBeUndefined()
  })
})

describe("generateBatchJsonl", () => {
  it("should generate page context and annotations", () => {
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

    const result = generateBatchJsonl(input)
    const lines = result.split("\n")

    expect(lines).toHaveLength(3)

    const pageContext = JSON.parse(lines[0])
    expect(pageContext).toEqual({
      type: "pageContext",
      url: "https://example.com",
      pageTitle: "Test Page",
      framework: "React",
      metaFramework: "Next.js (App Router)",
    })

    const annotation1 = JSON.parse(lines[1])
    expect(annotation1.type).toBe("annotation")
    expect(annotation1.id).toBe(1)
    expect(annotation1.instruction).toBe("Fix this")
    expect(annotation1.element).toEqual({
      selector: "#app > div",
      tag: "div",
      text: "Hello",
      attributes: { class: "container" },
    })
    expect(annotation1.component).toEqual({
      framework: "react",
      hierarchy: ["App", "Header"],
      props: { title: "Test" },
      state: { count: 0 },
    })

    const annotation2 = JSON.parse(lines[2])
    expect(annotation2.type).toBe("annotation")
    expect(annotation2.id).toBe(2)
    expect(annotation2.instruction).toBeUndefined()
    expect(annotation2.element).toEqual({ selector: "p", tag: "p" })
    expect(annotation2.component).toBeUndefined()
  })

  it("should handle batch with no framework info", () => {
    const input: BatchInput = {
      pageUrl: "https://example.com",
      pageTitle: "Plain",
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

    const result = generateBatchJsonl(input)
    const lines = result.split("\n")
    const pageContext = JSON.parse(lines[0])

    expect(pageContext.framework).toBeUndefined()
    expect(pageContext.metaFramework).toBeUndefined()
  })

  it("should use 'data' key for vue components in batch", () => {
    const input: BatchInput = {
      pageUrl: "https://example.com",
      pageTitle: "Vue",
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

    const result = generateBatchJsonl(input)
    const lines = result.split("\n")
    const annotation = JSON.parse(lines[1])

    expect(annotation.component.data).toEqual({ count: 1 })
    expect(annotation.component.state).toBeUndefined()
  })

  it("should handle annotation componentInfo without props/state", () => {
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
            hierarchy: ["App"],
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

    const result = generateBatchJsonl(input)
    const lines = result.split("\n")
    const annotation = JSON.parse(lines[1])

    expect(annotation.component.props).toBeUndefined()
    expect(annotation.component.state).toBeUndefined()
  })

  it("should handle batch framework with only metaFramework from annotations", () => {
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

    const result = generateBatchJsonl(input)
    const lines = result.split("\n")
    const pageContext = JSON.parse(lines[0])

    expect(pageContext.framework).toBeUndefined()
    expect(pageContext.metaFramework).toBe("Nuxt")
  })
})
