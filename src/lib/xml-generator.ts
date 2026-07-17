import {
  componentLines,
  elementAttributeLines,
  elementCssProvenanceLines,
  elementStyleLines,
  pageContextLines,
  styleDeltaEntryLines,
} from "./markdown-generator"
import type {
  BatchInput,
  ComponentInfo,
  ElementInfo,
  MarkdownInput,
  Relation,
  StyleDelta,
} from "./types"

/**
 * Marker line that opens every `claude-code` preset payload. This exact
 * string is the tegakari-fix skill's auto-trigger contract — do not change
 * it without updating the skill in lockstep.
 */
export const CLAUDE_CODE_MARKER = '<tegakari-output version="1" preset="claude-code">'
const CLOSE_TAG = "</tegakari-output>"

interface XmlAnnotationInput {
  id: number
  instruction: string
  elementInfo: ElementInfo
  componentInfo: ComponentInfo | null
  tags?: string[]
  styleDelta?: StyleDelta[]
}

/** Single-annotation XML output (claude-code preset). */
export function generateXml(input: MarkdownInput): string {
  const pageContext = pageContextLines(
    {
      pageUrl: input.pageUrl,
      pageTitle: input.pageTitle,
      framework: input.frameworkInfo,
    },
    "full"
  )
  const annotation = annotationXmlLines({
    id: 1,
    instruction: input.instruction,
    elementInfo: input.elementInfo,
    componentInfo: input.componentInfo,
  })
  return assembleXml(pageContext, [annotation])
}

/** Batch XML output (claude-code preset). Also used for single pin copy (one annotation). */
export function generateBatchXml(input: BatchInput): string {
  const firstFramework = input.annotations.find(
    (a) => a.frameworkInfo
  )?.frameworkInfo
  const pageContext = pageContextLines(
    {
      pageUrl: input.pageUrl,
      pageTitle: input.pageTitle,
      framework: firstFramework,
      metadata: input.metadata,
    },
    "full"
  )
  const annotations = input.annotations.map((a) => annotationXmlLines(a))
  // Relations (batch-only concept; omitted entirely when there are none —
  // see docs/output-spec.md#relations)
  const xml = assembleXml(pageContext, annotations, relationXmlLines(input.relations))
  return input.prefix ? `${input.prefix}\n${xml}` : xml
}

function assembleXml(
  pageContextBody: string[],
  annotationBodies: string[][],
  extraLines: string[] = []
): string {
  const lines = [
    CLAUDE_CODE_MARKER,
    "<page-context>",
    ...pageContextBody,
    "</page-context>",
    ...annotationBodies.flat(),
    ...extraLines,
    CLOSE_TAG,
  ]
  return lines.join("\n")
}

function relationXmlLines(relations: Relation[] | undefined): string[] {
  if (!relations || relations.length === 0) return []
  const lines: string[] = []
  for (const r of relations) {
    lines.push(`<relation id="${r.id}" from="${r.fromId}" to="${r.toId}">`, r.instruction, "</relation>")
  }
  return lines
}

function annotationXmlLines(annotation: XmlAnnotationInput): string[] {
  const lines = [`<annotation id="${annotation.id}">`]
  if (annotation.instruction.trim()) {
    lines.push(
      "<instruction>",
      annotation.instruction.trim(),
      "</instruction>"
    )
  }
  if (annotation.tags && annotation.tags.length > 0) {
    lines.push(`<tags>${annotation.tags.join(", ")}</tags>`)
  }
  const styleChanges = styleDeltaEntryLines(annotation.styleDelta)
  if (styleChanges.length > 0) {
    lines.push("<style-changes>", ...styleChanges, "</style-changes>")
  }
  lines.push(
    "<element>",
    ...elementAttributeLines(annotation.elementInfo),
    ...elementCssProvenanceLines(annotation.elementInfo),
    "</element>"
  )
  if (annotation.componentInfo) {
    lines.push(
      "<component>",
      ...componentLines(annotation.componentInfo, "- ", "full"),
      "</component>"
    )
  }
  const styles = elementStyleLines(annotation.elementInfo)
  if (styles.length > 0) {
    lines.push("<style-diff>", ...styles, "</style-diff>")
  }
  lines.push("</annotation>")
  return lines
}
