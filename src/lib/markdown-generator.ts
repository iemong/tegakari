import type {
  BatchInput,
  ComponentInfo,
  ElementInfo,
  FrameworkInfo,
  MarkdownInput,
} from "./types"

export function generateMarkdown(input: MarkdownInput): string {
  const sections: string[] = []

  // 1. User Instruction
  if (input.instruction.trim()) {
    sections.push(`## User Instruction\n${input.instruction.trim()}`)
  }

  // 2. Page Context
  const contextLines = [
    `- **URL**: ${input.pageUrl}`,
    ...frameworkContextLines(input.frameworkInfo),
    `- **Page Title**: ${input.pageTitle}`,
  ]
  sections.push(`## Page Context\n${contextLines.join("\n")}`)

  // 3. Selected Element
  sections.push(
    `## Selected Element\n${elementLines(input.elementInfo).join("\n")}`
  )

  // 4. Component Tree (conditional)
  if (input.componentInfo) {
    const comp = input.componentInfo
    const label =
      comp.framework === "react"
        ? "Component Tree (React)"
        : "Component Tree (Vue)"
    sections.push(`## ${label}\n${componentLines(comp, "- ").join("\n")}`)
  }

  return sections.join("\n\n")
}

export function generateBatchMarkdown(input: BatchInput): string {
  const sections: string[] = []

  // Page Context (once)
  const firstFramework = input.annotations.find(
    (a) => a.frameworkInfo
  )?.frameworkInfo
  const contextLines = [
    `- **URL**: ${input.pageUrl}`,
    ...frameworkContextLines(firstFramework),
    `- **Page Title**: ${input.pageTitle}`,
    ...metadataLines(input.metadata),
  ]
  sections.push(`## Page Context\n${contextLines.join("\n")}`)

  // Each annotation
  for (const annotation of input.annotations) {
    sections.push(
      `## Annotation #${annotation.id}\n${annotationLines(annotation).join("\n")}`
    )
  }

  const body = sections.join("\n\n")
  return input.prefix ? `${input.prefix}\n\n${body}` : body
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

function elementLines(el: ElementInfo): string[] {
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

function componentLines(comp: ComponentInfo, hierarchyLabel: string): string[] {
  const lines: string[] = []
  if (comp.hierarchy.length > 0) {
    lines.push(`${hierarchyLabel}\`${comp.hierarchy.join("` → `")}\``)
  }
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
  annotation: BatchInput["annotations"][number]
): string[] {
  const lines: string[] = []
  if (annotation.instruction.trim()) {
    lines.push(`**Instruction**: ${annotation.instruction.trim()}`)
  }
  lines.push(...elementLines(annotation.elementInfo))
  if (annotation.componentInfo) {
    lines.push(...componentLines(annotation.componentInfo, "- **Component**: "))
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
