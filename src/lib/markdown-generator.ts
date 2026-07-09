import { formatSourceLocation } from "./source-location"
import type {
  BatchInput,
  ComponentInfo,
  CssRuleInfo,
  ElementInfo,
  FrameworkInfo,
  MarkdownInput,
  MarkdownSectionOptions,
} from "./types"

export function generateMarkdown(
  input: MarkdownInput,
  options?: MarkdownSectionOptions
): string {
  const sections: string[] = []

  // 1. User Instruction
  if (input.instruction.trim()) {
    sections.push(`## User Instruction\n${input.instruction.trim()}`)
  }

  // 2. Page Context
  const contextLines = pageContextLines(
    { pageUrl: input.pageUrl, pageTitle: input.pageTitle, framework: input.frameworkInfo },
    options?.pageContext
  )
  sections.push(`## Page Context\n${contextLines.join("\n")}`)

  // 3. Selected Element
  sections.push(
    `## Selected Element\n${elementLines(input.elementInfo, options?.element).join("\n")}`
  )

  // 4. Component Tree (conditional)
  if (input.componentInfo && options?.component !== "none") {
    const comp = input.componentInfo
    const label = `Component Tree (${componentFrameworkLabel(comp.framework)})`
    sections.push(
      `## ${label}\n${componentLines(comp, "- ", options?.component).join("\n")}`
    )
  }

  return sections.join("\n\n")
}

export function generateBatchMarkdown(
  input: BatchInput,
  options?: MarkdownSectionOptions
): string {
  const sections: string[] = []

  // Page Context (once)
  const firstFramework = input.annotations.find(
    (a) => a.frameworkInfo
  )?.frameworkInfo
  const contextLines = pageContextLines(
    {
      pageUrl: input.pageUrl,
      pageTitle: input.pageTitle,
      framework: firstFramework,
      metadata: input.metadata,
    },
    options?.pageContext
  )
  sections.push(`## Page Context\n${contextLines.join("\n")}`)

  // Each annotation
  for (const annotation of input.annotations) {
    sections.push(
      `## Annotation #${annotation.id}\n${annotationLines(annotation, options).join("\n")}`
    )
  }

  const body = sections.join("\n\n")
  return input.prefix ? `${input.prefix}\n\n${body}` : body
}

interface PageContextInput {
  pageUrl: string
  pageTitle: string
  framework?: FrameworkInfo | null
  metadata?: BatchInput["metadata"]
}

/** Build the Page Context content lines, shared by single/batch Markdown and the XML preset. */
export function pageContextLines(
  input: PageContextInput,
  option: MarkdownSectionOptions["pageContext"] = "full"
): string[] {
  const lines = [`- **URL**: ${input.pageUrl}`]
  if (option === "url-only") return lines
  lines.push(...frameworkContextLines(input.framework), `- **Page Title**: ${input.pageTitle}`)
  if (option === "full") lines.push(...metadataLines(input.metadata))
  return lines
}

function frameworkContextLines(
  framework: FrameworkInfo | null | undefined
): string[] {
  const lines: string[] = []
  if (framework?.framework) {
    lines.push(`- **Framework**: ${framework.framework}`)
  }
  if (framework?.metaFramework) {
    lines.push(`- **Meta Framework**: ${framework.metaFramework}`)
  }
  return lines
}

function metadataLines(metadata: BatchInput["metadata"]): string[] {
  if (!metadata) return []
  return [
    `- **Viewport**: ${metadata.viewport.width}x${metadata.viewport.height}`,
    `- **Language**: ${metadata.language}`,
    `- **User Agent**: ${metadata.userAgent}`,
  ]
}

/** Selector/tag/text/attributes lines, without Styles. Reused by the XML `<element>` tag. */
export function elementAttributeLines(el: ElementInfo): string[] {
  const lines = [
    `- **Selector**: \`${el.selector}\``,
    `- **Tag**: \`<${el.tag}>\``,
  ]
  if (el.text) {
    lines.push(`- **Text**: "${el.text}"`)
  }
  const attrEntries = Object.entries(el.attributes)
  if (attrEntries.length > 0) {
    lines.push(`- **Attributes**:`)
    for (const [key, value] of attrEntries) {
      lines.push(`  - ${key}: \`${value}\``)
    }
  }
  return lines
}

/** Styles-only lines (empty when there's no diff). Reused by the XML `<style-diff>` tag. */
export function elementStyleLines(el: ElementInfo): string[] {
  const styleEntries = Object.entries(el.styles ?? {})
  if (styleEntries.length === 0) return []
  const lines = [`- **Styles**:`]
  for (const [prop, value] of styleEntries) {
    lines.push(`  - ${prop}: \`${value}\``)
  }
  return lines
}

/**
 * CSS provenance lines: which same-origin stylesheet rule(s) matched the
 * element, and any CSS custom properties their declarations reference.
 * Reused by the XML `<element>` tag. Empty when nothing was collected
 * (cross-origin-only stylesheets, no CSSOM match, etc.).
 */
export function elementCssProvenanceLines(el: ElementInfo): string[] {
  return [...cssRuleLines(el.cssRules ?? []), ...cssVariableLines(el.customProperties ?? {})]
}

function cssRuleLines(rules: CssRuleInfo[]): string[] {
  if (rules.length === 0) return []
  const lines = [`- **CSS Rules**:`]
  for (const rule of rules) {
    const location = rule.media ? `${rule.source}, ${rule.media}` : rule.source
    lines.push(`  - \`${rule.selector}\` (${location})`)
    for (const decl of rule.declarations) {
      lines.push(`    - ${formatDeclaration(decl)}`)
    }
  }
  return lines
}

function cssVariableLines(customProperties: Record<string, string>): string[] {
  const entries = Object.entries(customProperties)
  if (entries.length === 0) return []
  const lines = [`- **CSS Variables**:`]
  for (const [name, value] of entries) {
    lines.push(`  - ${name}: \`${value}\``)
  }
  return lines
}

/** "prop: value" -> "prop: `value`" (declarations are pre-formatted strings, see css-provenance.ts) */
function formatDeclaration(decl: string): string {
  const idx = decl.indexOf(": ")
  if (idx === -1) return decl
  return `${decl.slice(0, idx)}: \`${decl.slice(idx + 2)}\``
}

/** Minimal element line set: selector, tag, class (if any), text. */
function elementMinimalLines(el: ElementInfo): string[] {
  const lines = [
    `- **Selector**: \`${el.selector}\``,
    `- **Tag**: \`<${el.tag}>\``,
  ]
  if (el.attributes.class) {
    lines.push(`- **Class**: \`${el.attributes.class}\``)
  }
  if (el.text) {
    lines.push(`- **Text**: "${el.text}"`)
  }
  return lines
}

function elementLines(
  el: ElementInfo,
  option: MarkdownSectionOptions["element"] = "full"
): string[] {
  if (option === "minimal") return elementMinimalLines(el)
  return [
    ...elementAttributeLines(el),
    ...elementStyleLines(el),
    ...elementCssProvenanceLines(el),
  ]
}

const COMPONENT_FRAMEWORK_LABELS: Record<ComponentInfo["framework"], string> = {
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
}

function componentFrameworkLabel(framework: ComponentInfo["framework"]): string {
  return COMPONENT_FRAMEWORK_LABELS[framework]
}

/** Component Tree content lines, shared by single/batch Markdown and the XML `<component>` tag. */
export function componentLines(
  comp: ComponentInfo,
  hierarchyLabel: string,
  option: MarkdownSectionOptions["component"] = "full"
): string[] {
  const lines: string[] = []
  const hierarchy = option === "brief" ? comp.hierarchy.slice(-3) : comp.hierarchy
  if (hierarchy.length > 0) {
    lines.push(`${hierarchyLabel}\`${hierarchy.join("` → `")}\``)
  }
  if (comp.source) {
    lines.push(`- **Source**: \`${formatSourceLocation(comp.source)}\``)
  }
  if (option === "brief") return lines
  if (comp.props) {
    lines.push(`- **Props**: \`${formatObject(comp.props)}\``)
  }
  if (comp.state) {
    const label = comp.framework === "vue" ? "Data" : "State"
    lines.push(`- **${label}**: \`${formatObject(comp.state)}\``)
  }
  return lines
}

function annotationLines(
  annotation: BatchInput["annotations"][number],
  options?: MarkdownSectionOptions
): string[] {
  const lines: string[] = []
  if (annotation.instruction.trim()) {
    lines.push(`**Instruction**: ${annotation.instruction.trim()}`)
  }
  if (annotation.tags && annotation.tags.length > 0) {
    lines.push(`**Tags**: ${annotation.tags.join(", ")}`)
  }
  lines.push(...elementLines(annotation.elementInfo, options?.element))
  if (annotation.componentInfo && options?.component !== "none") {
    lines.push(
      ...componentLines(annotation.componentInfo, "- **Component**: ", options?.component)
    )
  }
  return lines
}

const SENTINEL_STRINGS = new Set(["fn", "[Circular]", "..."])

function formatObject(obj: Record<string, unknown>): string {
  try {
    return formatObjectInline(obj)
  } catch {
    return "{...}"
  }
}

function formatObjectInline(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj)
  if (entries.length === 0) return "{}"
  const parts = entries.map(([key, value]) => `${key}: ${formatValue(value)}`)
  return `{ ${parts.join(", ")} }`
}

function formatValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") return formatString(value)
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) return formatArray(value)
  if (typeof value === "object") {
    return formatObjectInline(value as Record<string, unknown>)
  }
  return String(value)
}

function formatString(value: string): string {
  if (SENTINEL_STRINGS.has(value)) return value
  if (value.startsWith("<") && value.endsWith(">")) return value
  return `"${value}"`
}

function formatArray(value: unknown[]): string {
  if (value.length === 0) return "[]"
  return `[${value.map(formatValue).join(", ")}]`
}
