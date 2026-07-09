import { formatSourceLocation } from "./source-location"
import type {
  BatchInput,
  ComponentInfo,
  ElementInfo,
  FrameworkInfo,
  MarkdownInput,
} from "./types"

export function generateJsonl(input: MarkdownInput): string {
  const lines: string[] = []

  // 1. User Instruction
  if (input.instruction.trim()) {
    lines.push(
      JSON.stringify({ type: "instruction", content: input.instruction.trim() })
    )
  }

  // 2. Page Context
  const pageContext: Record<string, unknown> = {
    type: "pageContext",
    url: input.pageUrl,
    pageTitle: input.pageTitle,
  }
  applyFramework(pageContext, input.frameworkInfo)
  lines.push(JSON.stringify(pageContext))

  // 3. Selected Element
  lines.push(
    JSON.stringify({
      type: "selectedElement",
      ...buildElementEntry(input.elementInfo),
    })
  )

  // 4. Component Tree (conditional)
  if (input.componentInfo) {
    lines.push(
      JSON.stringify({
        type: "componentTree",
        ...buildComponentEntry(input.componentInfo),
      })
    )
  }

  return lines.join("\n")
}

export function generateBatchJsonl(input: BatchInput): string {
  const lines: string[] = []

  // Prefix (if set)
  if (input.prefix) {
    lines.push(JSON.stringify({ type: "prefix", content: input.prefix }))
  }

  // Page context (once)
  const pageContext: Record<string, unknown> = {
    type: "pageContext",
    url: input.pageUrl,
    pageTitle: input.pageTitle,
  }
  const firstFramework = input.annotations.find(
    (a) => a.frameworkInfo
  )?.frameworkInfo
  applyFramework(pageContext, firstFramework)
  if (input.metadata) {
    pageContext.viewport = `${input.metadata.viewport.width}x${input.metadata.viewport.height}`
    pageContext.language = input.metadata.language
    pageContext.userAgent = input.metadata.userAgent
  }
  lines.push(JSON.stringify(pageContext))

  // Each annotation
  for (const annotation of input.annotations) {
    lines.push(JSON.stringify(buildAnnotationEntry(annotation)))
  }

  return lines.join("\n")
}

function buildAnnotationEntry(
  annotation: BatchInput["annotations"][number]
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    type: "annotation",
    id: annotation.id,
  }
  if (annotation.instruction.trim()) {
    entry.instruction = annotation.instruction.trim()
  }
  if (annotation.tags && annotation.tags.length > 0) {
    entry.tags = annotation.tags
  }
  if (annotation.styleDelta && annotation.styleDelta.length > 0) {
    entry.styleDelta = annotation.styleDelta
  }
  entry.element = buildElementEntry(annotation.elementInfo)
  if (annotation.componentInfo) {
    entry.component = buildComponentEntry(annotation.componentInfo)
  }
  return entry
}

function buildElementEntry(el: ElementInfo): Record<string, unknown> {
  const element: Record<string, unknown> = {
    selector: el.selector,
    tag: el.tag,
  }
  if (el.text) element.text = el.text
  if (Object.keys(el.attributes).length > 0) element.attributes = el.attributes
  if (el.styles && Object.keys(el.styles).length > 0) {
    element.styles = el.styles
  }
  if (el.cssRules && el.cssRules.length > 0) {
    element.cssRules = el.cssRules
  }
  if (el.customProperties && Object.keys(el.customProperties).length > 0) {
    element.customProperties = el.customProperties
  }
  return element
}

function buildComponentEntry(comp: ComponentInfo): Record<string, unknown> {
  const component: Record<string, unknown> = {
    framework: comp.framework,
    hierarchy: comp.hierarchy,
  }
  if (comp.source) component.source = formatSourceLocation(comp.source)
  if (comp.props) component.props = comp.props
  if (comp.state) {
    component[comp.framework === "vue" ? "data" : "state"] = comp.state
  }
  return component
}

function applyFramework(
  target: Record<string, unknown>,
  framework: FrameworkInfo | null | undefined
): void {
  if (!framework) return
  if (framework.framework) target.framework = framework.framework
  if (framework.metaFramework) target.metaFramework = framework.metaFramework
}
