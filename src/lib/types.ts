// Chrome runtime message (background → content script)
export interface ToggleMessage {
  type: "TEGAKARI_TOGGLE"
}

// PostMessage types (Isolated World ↔ Main World)
export interface CollectRequest {
  type: "TEGAKARI_COLLECT"
  selector: string
}

export interface CollectResult {
  type: "TEGAKARI_RESULT"
  framework: FrameworkInfo | null
  component: ComponentInfo | null
}

export interface FrameworkInfo {
  framework: string | null // "React" | "Vue"
  metaFramework: string | null // "Next.js (App Router)" | "Nuxt"
}

/** Source location of the selected element's JSX/SFC (dev builds only) */
export interface SourceLocation {
  file: string
  line?: number
}

export interface ComponentInfo {
  framework: "react" | "vue"
  hierarchy: string[]
  props?: Record<string, unknown>
  state?: Record<string, unknown>
  source?: SourceLocation
}

export interface ElementInfo {
  selector: string
  tag: string
  text: string
  attributes: Record<string, string>
  /** Effective styles diffed against tag defaults (curated subset) */
  styles?: Record<string, string>
}

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface CaptureRequest {
  type: "TEGAKARI_CAPTURE"
}

export interface CaptureResponse {
  success: boolean
  dataUrl?: string
  error?: string
}

// Page metadata collected automatically
export interface PageMetadata {
  url: string
  title: string
  viewport: { width: number; height: number }
  userAgent: string
  language: string
  timestamp: number
  frameworkInfo: FrameworkInfo | null
}

export interface Annotation {
  id: number
  elementInfo: ElementInfo
  frameworkInfo: FrameworkInfo | null
  componentInfo: ComponentInfo | null
  instruction: string
  /** Click position relative to document (pageX/pageY) */
  pageX: number
  pageY: number
  /** Auto-captured screenshot (data URL) */
  screenshot?: string
  /** Creation timestamp */
  createdAt: number
  /**
   * Selected quick-instruction chip ids, in selection order (e.g.
   * `["spacing", "color"]`). Omitted or empty means "no tags" — both are
   * treated identically by generators/UI.
   */
  tags?: string[]
}

/** Stored per URL */
export interface AnnotationStore {
  url: string
  metadata: PageMetadata
  annotations: Annotation[]
}

export interface MarkdownInput {
  instruction: string
  pageUrl: string
  pageTitle: string
  frameworkInfo: FrameworkInfo | null
  elementInfo: ElementInfo
  componentInfo: ComponentInfo | null
}

/**
 * Output preset id. `jsonl`/`markdown` are the original full-fidelity
 * formats; `claude-code` wraps the same information in an XML contract used
 * to auto-trigger the tegakari-fix skill; `cursor`/`minimal` are trimmed
 * Markdown variants for token-conscious editors.
 */
export type OutputPreset = "jsonl" | "markdown" | "claude-code" | "cursor" | "minimal"

export interface BatchInput {
  pageUrl: string
  pageTitle: string
  annotations: Annotation[]
  prefix?: string
  metadata?: PageMetadata
}

/**
 * Section inclusion/depth knobs used by the Markdown generator to derive the
 * `cursor`/`minimal` presets from the full (`markdown`) output without a
 * second generator. Omitted keys default to the fullest, backward-compatible
 * behavior.
 */
export interface MarkdownSectionOptions {
  /** Page Context fields. "compact" drops batch metadata; "url-only" keeps only the URL. */
  pageContext?: "full" | "compact" | "url-only"
  /** Selected Element fields. "minimal" keeps selector/tag/class/text only. */
  element?: "full" | "minimal"
  /** Component Tree depth. "brief" keeps name (last 3 levels) + source only; "none" omits the section. */
  component?: "full" | "brief" | "none"
}

export interface PrefixRule {
  pattern: string // URL pattern (e.g., "localhost:3000", "example.com") or regex
  prefix: string // Free text prefix (e.g., "[repo=my-app]")
  isRegex?: boolean // If true, pattern is a regex matched against the full URL
}
