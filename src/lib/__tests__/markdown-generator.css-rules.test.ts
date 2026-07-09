import { expect, it } from "vitest"
import { generateMarkdown } from "../markdown-generator"
import type { ElementInfo, MarkdownInput } from "../types"

const baseElementInfo: ElementInfo = {
  selector: "#app > div.container",
  tag: "div",
  text: "Hello World",
  attributes: { class: "container" },
}

function buildInput(elementInfo: ElementInfo): MarkdownInput {
  return {
    instruction: "",
    pageUrl: "https://example.com",
    pageTitle: "Example Page",
    frameworkInfo: null,
    elementInfo,
    componentInfo: null,
  }
}

it("generateMarkdown: renders a CSS Rules section after Styles when cssRules is present", () => {
  const result = generateMarkdown(
    buildInput({
      ...baseElementInfo,
      styles: { color: "red" },
      cssRules: [
        {
          selector: ".container",
          source: "app.css",
          declarations: ["color: red", "padding: 8px !important"],
          media: "@media (min-width: 768px)",
        },
      ],
    })
  )

  expect(result).toContain("- **Styles**:\n  - color: `red`\n- **CSS Rules**:")
  expect(result).toContain(
    "  - `.container` (app.css, @media (min-width: 768px))"
  )
  expect(result).toContain("    - color: `red`")
  expect(result).toContain("    - padding: `8px !important`")
})

it("generateMarkdown: reports 'inline' sources without a media suffix", () => {
  const result = generateMarkdown(
    buildInput({
      ...baseElementInfo,
      cssRules: [{ selector: ".container", source: "inline", declarations: ["color: red"] }],
    })
  )

  expect(result).toContain("  - `.container` (inline)")
})

it("generateMarkdown: renders a CSS Variables section when customProperties is present", () => {
  const result = generateMarkdown(
    buildInput({
      ...baseElementInfo,
      cssRules: [
        {
          selector: ".container",
          source: "inline",
          declarations: ["background-color: var(--brand-color)"],
        },
      ],
      customProperties: { "--brand-color": "rgb(37, 99, 235)" },
    })
  )

  expect(result).toContain("- **CSS Variables**:\n  - --brand-color: `rgb(37, 99, 235)`")
})

it("generateMarkdown: omits CSS Rules/CSS Variables when absent", () => {
  const result = generateMarkdown(buildInput(baseElementInfo))

  expect(result).not.toContain("**CSS Rules**")
  expect(result).not.toContain("**CSS Variables**")
})

it("generateMarkdown: minimal element option omits CSS Rules even when present", () => {
  const result = generateMarkdown(
    buildInput({
      ...baseElementInfo,
      cssRules: [{ selector: ".container", source: "inline", declarations: ["color: red"] }],
    }),
    { element: "minimal" }
  )

  expect(result).not.toContain("**CSS Rules**")
})
