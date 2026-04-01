import type { BatchInput, MarkdownInput } from "./types"

export function generateJsonl(input: MarkdownInput): string {
  const lines: string[] = []

  // 1. User Instruction
  if (input.instruction.trim()) {
    lines.push(JSON.stringify({
      type: "instruction",
      content: input.instruction.trim(),
    }))
  }

  // 2. Page Context
  const pageContext: Record<string, unknown> = {
    type: "pageContext",
    url: input.pageUrl,
    pageTitle: input.pageTitle,
  }
  if (input.frameworkInfo) {
    if (input.frameworkInfo.framework) {
      pageContext.framework = input.frameworkInfo.framework
    }
    if (input.frameworkInfo.metaFramework) {
      pageContext.metaFramework = input.frameworkInfo.metaFramework
    }
  }
  lines.push(JSON.stringify(pageContext))

  // 3. Selected Element
  const el = input.elementInfo
  const selectedElement: Record<string, unknown> = {
    type: "selectedElement",
    selector: el.selector,
    tag: el.tag,
  }
  if (el.text) {
    selectedElement.text = el.text
  }
  if (Object.keys(el.attributes).length > 0) {
    selectedElement.attributes = el.attributes
  }
  lines.push(JSON.stringify(selectedElement))

  // 4. Component Tree (conditional)
  if (input.componentInfo) {
    const comp = input.componentInfo
    const componentTree: Record<string, unknown> = {
      type: "componentTree",
      framework: comp.framework,
      hierarchy: comp.hierarchy,
    }
    if (comp.props) {
      componentTree.props = comp.props
    }
    if (comp.state) {
      const stateKey = comp.framework === "vue" ? "data" : "state"
      componentTree[stateKey] = comp.state
    }
    lines.push(JSON.stringify(componentTree))
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
  const firstFramework = input.annotations.find(a => a.frameworkInfo)?.frameworkInfo
  if (firstFramework) {
    if (firstFramework.framework) pageContext.framework = firstFramework.framework
    if (firstFramework.metaFramework) pageContext.metaFramework = firstFramework.metaFramework
  }
  lines.push(JSON.stringify(pageContext))

  // Each annotation
  for (const annotation of input.annotations) {
    const entry: Record<string, unknown> = {
      type: "annotation",
      id: annotation.id,
    }
    if (annotation.instruction.trim()) {
      entry.instruction = annotation.instruction.trim()
    }

    const el = annotation.elementInfo
    const element: Record<string, unknown> = {
      selector: el.selector,
      tag: el.tag,
    }
    if (el.text) element.text = el.text
    if (Object.keys(el.attributes).length > 0) element.attributes = el.attributes
    entry.element = element

    if (annotation.componentInfo) {
      const comp = annotation.componentInfo
      const component: Record<string, unknown> = {
        framework: comp.framework,
        hierarchy: comp.hierarchy,
      }
      if (comp.props) component.props = comp.props
      if (comp.state) {
        component[comp.framework === "vue" ? "data" : "state"] = comp.state
      }
      entry.component = component
    }

    lines.push(JSON.stringify(entry))
  }

  return lines.join("\n")
}
