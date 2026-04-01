import type { BatchInput, MarkdownInput } from "./types"

export function generateMarkdown(input: MarkdownInput): string {
  const sections: string[] = []

  // 1. User Instruction
  if (input.instruction.trim()) {
    sections.push(`## User Instruction\n${input.instruction.trim()}`)
  }

  // 2. Page Context
  const contextLines: string[] = []
  contextLines.push(`- **URL**: ${input.pageUrl}`)
  if (input.frameworkInfo) {
    const fw = input.frameworkInfo
    if (fw.framework) {
      contextLines.push(`- **Framework**: ${fw.framework}`)
    }
    if (fw.metaFramework) {
      contextLines.push(`- **Meta Framework**: ${fw.metaFramework}`)
    }
  }
  contextLines.push(`- **Page Title**: ${input.pageTitle}`)
  sections.push(`## Page Context\n${contextLines.join("\n")}`)

  // 3. Selected Element
  const el = input.elementInfo
  const elementLines: string[] = []
  elementLines.push(`- **Selector**: \`${el.selector}\``)
  elementLines.push(`- **Tag**: \`<${el.tag}>\``)
  if (el.text) {
    elementLines.push(`- **Text**: "${el.text}"`)
  }
  const attrEntries = Object.entries(el.attributes)
  if (attrEntries.length > 0) {
    elementLines.push(`- **Attributes**:`)
    for (const [key, value] of attrEntries) {
      elementLines.push(`  - ${key}: \`${value}\``)
    }
  }
  sections.push(`## Selected Element\n${elementLines.join("\n")}`)

  // 4. Component Tree (conditional)
  if (input.componentInfo) {
    const comp = input.componentInfo
    const label =
      comp.framework === "react" ? "Component Tree (React)" : "Component Tree (Vue)"
    const treeLines: string[] = []

    if (comp.hierarchy.length > 0) {
      treeLines.push(`- \`${comp.hierarchy.join("` → `")}\``)
    }
    if (comp.props) {
      treeLines.push(`- **Props**: \`${formatObject(comp.props)}\``)
    }
    if (comp.state) {
      const stateLabel = comp.framework === "vue" ? "Data" : "State"
      treeLines.push(`- **${stateLabel}**: \`${formatObject(comp.state)}\``)
    }

    sections.push(`## ${label}\n${treeLines.join("\n")}`)
  }

  return sections.join("\n\n")
}

export function generateBatchMarkdown(input: BatchInput): string {
  const sections: string[] = []

  // Page Context (once)
  const contextLines: string[] = []
  contextLines.push(`- **URL**: ${input.pageUrl}`)
  const firstFramework = input.annotations.find(a => a.frameworkInfo)?.frameworkInfo
  if (firstFramework) {
    if (firstFramework.framework) contextLines.push(`- **Framework**: ${firstFramework.framework}`)
    if (firstFramework.metaFramework) contextLines.push(`- **Meta Framework**: ${firstFramework.metaFramework}`)
  }
  contextLines.push(`- **Page Title**: ${input.pageTitle}`)
  if (input.metadata) {
    const m = input.metadata
    contextLines.push(`- **Viewport**: ${m.viewport.width}x${m.viewport.height}`)
    contextLines.push(`- **Language**: ${m.language}`)
    contextLines.push(`- **User Agent**: ${m.userAgent}`)
  }
  sections.push(`## Page Context\n${contextLines.join("\n")}`)

  // Each annotation
  for (const annotation of input.annotations) {
    const lines: string[] = []

    if (annotation.instruction.trim()) {
      lines.push(`**Instruction**: ${annotation.instruction.trim()}`)
    }

    const el = annotation.elementInfo
    lines.push(`- **Selector**: \`${el.selector}\``)
    lines.push(`- **Tag**: \`<${el.tag}>\``)
    if (el.text) lines.push(`- **Text**: "${el.text}"`)
    const attrEntries = Object.entries(el.attributes)
    if (attrEntries.length > 0) {
      lines.push(`- **Attributes**:`)
      for (const [key, value] of attrEntries) {
        lines.push(`  - ${key}: \`${value}\``)
      }
    }

    if (annotation.componentInfo) {
      const comp = annotation.componentInfo
      if (comp.hierarchy.length > 0) {
        lines.push(`- **Component**: \`${comp.hierarchy.join("` → `")}\``)
      }
      if (comp.props) lines.push(`- **Props**: \`${formatObject(comp.props)}\``)
      if (comp.state) {
        const label = comp.framework === "vue" ? "Data" : "State"
        lines.push(`- **${label}**: \`${formatObject(comp.state)}\``)
      }
    }

    sections.push(`## Annotation #${annotation.id}\n${lines.join("\n")}`)
  }

  const body = sections.join("\n\n")
  return input.prefix ? `${input.prefix}\n\n${body}` : body
}

function formatObject(obj: Record<string, unknown>): string {
  try {
    const entries = Object.entries(obj)
    if (entries.length === 0) return "{}"
    const parts = entries.map(
      ([key, value]) => `${key}: ${formatValue(value)}`
    )
    return `{ ${parts.join(", ")} }`
  } catch {
    return "{...}"
  }
}

function formatValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (value === "fn") return "fn"
  if (value === "[Circular]") return "[Circular]"
  if (value === "...") return "..."
  if (typeof value === "string") {
    if (value.startsWith("<") && value.endsWith(">")) return value
    return `"${value}"`
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    return `[${value.map(formatValue).join(", ")}]`
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return "{}"
    const parts = entries.map(([k, v]) => `${k}: ${formatValue(v)}`)
    return `{ ${parts.join(", ")} }`
  }
  return String(value)
}
