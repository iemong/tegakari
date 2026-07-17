import { expect, it } from "vitest"
import { generateBatchJsonl } from "../jsonl-generator"
import type { BatchInput } from "../types"

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

const expectedFullPageContext = {
  type: "pageContext",
  url: "https://example.com",
  pageTitle: "Test Page",
  framework: "React",
  metaFramework: "Next.js (App Router)",
}

const expectedAnnotation1Element = {
  selector: "#app > div",
  tag: "div",
  text: "Hello",
  attributes: { class: "container" },
}

const expectedAnnotation1Component = {
  framework: "react",
  hierarchy: ["App", "Header"],
  props: { title: "Test" },
  state: { count: 0 },
}

it("generateBatchJsonl: should generate page context and annotations", () => {
  const result = generateBatchJsonl(fullBatchInput)
  const lines = result.split("\n")

  expect(lines).toHaveLength(3)

  const pageContext = JSON.parse(lines[0])
  expect(pageContext).toEqual(expectedFullPageContext)

  const annotation1 = JSON.parse(lines[1])
  expect(annotation1.type).toBe("annotation")
  expect(annotation1.id).toBe(1)
  expect(annotation1.instruction).toBe("Fix this")
  expect(annotation1.element).toEqual(expectedAnnotation1Element)
  expect(annotation1.component).toEqual(expectedAnnotation1Component)

  const annotation2 = JSON.parse(lines[2])
  expect(annotation2.type).toBe("annotation")
  expect(annotation2.id).toBe(2)
  expect(annotation2.instruction).toBeUndefined()
  expect(annotation2.element).toEqual({ selector: "p", tag: "p" })
  expect(annotation2.component).toBeUndefined()
})

it("generateBatchJsonl: should handle batch with no framework info", () => {
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

it("generateBatchJsonl: should use 'data' key for vue components in batch", () => {
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

it("generateBatchJsonl: should handle annotation componentInfo without props/state", () => {
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

it("generateBatchJsonl: should handle batch framework with only metaFramework from annotations", () => {
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

  const result = generateBatchJsonl(input)
  const lines = result.split("\n")
  const pageContext = JSON.parse(lines[0])

  expect(pageContext.framework).toBeUndefined()
  expect(pageContext.metaFramework).toBe("Nuxt")
})

it("generateBatchJsonl: includes tags on the annotation entry when set", () => {
  const input: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Page",
    annotations: [{ ...fullBatchInput.annotations[0], tags: ["spacing", "color"] }],
  }

  const result = generateBatchJsonl(input)
  const annotation = JSON.parse(result.split("\n")[1])

  expect(annotation.tags).toEqual(["spacing", "color"])
})

it("generateBatchJsonl: omits tags on the annotation entry when undefined or empty", () => {
  const undefinedTags = JSON.parse(
    generateBatchJsonl({
      pageUrl: "https://example.com",
      pageTitle: "Page",
      annotations: [{ ...fullBatchInput.annotations[0], tags: undefined }],
    }).split("\n")[1]
  )
  const emptyTags = JSON.parse(
    generateBatchJsonl({
      pageUrl: "https://example.com",
      pageTitle: "Page",
      annotations: [{ ...fullBatchInput.annotations[0], tags: [] }],
    }).split("\n")[1]
  )

  expect(undefinedTags.tags).toBeUndefined()
  expect(emptyTags.tags).toBeUndefined()
})

it("generateBatchJsonl: includes styleDelta on the annotation entry when set", () => {
  const input: BatchInput = {
    pageUrl: "https://example.com",
    pageTitle: "Page",
    annotations: [
      {
        ...fullBatchInput.annotations[0],
        styleDelta: [{ property: "margin", before: "16px", after: "8px" }],
      },
    ],
  }

  const result = generateBatchJsonl(input)
  const annotation = JSON.parse(result.split("\n")[1])

  expect(annotation.styleDelta).toEqual([
    { property: "margin", before: "16px", after: "8px" },
  ])
})

it("generateBatchJsonl: omits styleDelta on the annotation entry when undefined or empty", () => {
  const undefinedDelta = JSON.parse(
    generateBatchJsonl({
      pageUrl: "https://example.com",
      pageTitle: "Page",
      annotations: [{ ...fullBatchInput.annotations[0], styleDelta: undefined }],
    }).split("\n")[1]
  )
  const emptyDelta = JSON.parse(
    generateBatchJsonl({
      pageUrl: "https://example.com",
      pageTitle: "Page",
      annotations: [{ ...fullBatchInput.annotations[0], styleDelta: [] }],
    }).split("\n")[1]
  )

  expect(undefinedDelta.styleDelta).toBeUndefined()
  expect(emptyDelta.styleDelta).toBeUndefined()
})
