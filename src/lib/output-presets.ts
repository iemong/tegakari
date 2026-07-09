import { generateBatchJsonl, generateJsonl } from "./jsonl-generator"
import { generateBatchMarkdown, generateMarkdown } from "./markdown-generator"
import type { BatchInput, MarkdownInput, MarkdownSectionOptions, OutputPreset } from "./types"
import { generateBatchXml, generateXml } from "./xml-generator"

/** All selectable presets, in the order they should appear in the UI. */
export const OUTPUT_PRESETS: OutputPreset[] = [
  "jsonl",
  "markdown",
  "claude-code",
  "cursor",
  "minimal",
]

export const OUTPUT_PRESET_LABELS: Record<OutputPreset, string> = {
  jsonl: "JSONL",
  markdown: "Markdown",
  "claude-code": "Claude Code",
  cursor: "Cursor",
  minimal: "Minimal",
}

const CURSOR_OPTIONS: MarkdownSectionOptions = {
  pageContext: "compact",
  component: "brief",
}

const MINIMAL_OPTIONS: MarkdownSectionOptions = {
  pageContext: "url-only",
  element: "minimal",
  component: "none",
}

/** Render a single (non-batch) input for the given preset. */
export function generatePresetOutput(
  preset: OutputPreset,
  input: MarkdownInput
): string {
  switch (preset) {
    case "jsonl":
      return generateJsonl(input)
    case "markdown":
      return generateMarkdown(input)
    case "claude-code":
      return generateXml(input)
    case "cursor":
      return generateMarkdown(input, CURSOR_OPTIONS)
    case "minimal":
      return generateMarkdown(input, MINIMAL_OPTIONS)
  }
}

/** Render a batch input (also used for single pin copy, with one annotation) for the given preset. */
export function generateBatchPresetOutput(
  preset: OutputPreset,
  input: BatchInput
): string {
  switch (preset) {
    case "jsonl":
      return generateBatchJsonl(input)
    case "markdown":
      return generateBatchMarkdown(input)
    case "claude-code":
      return generateBatchXml(input)
    case "cursor":
      return generateBatchMarkdown(input, CURSOR_OPTIONS)
    case "minimal":
      return generateBatchMarkdown(input, MINIMAL_OPTIONS)
  }
}
