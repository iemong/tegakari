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
  framework: string | null   // "React" | "Vue"
  metaFramework: string | null // "Next.js (App Router)" | "Nuxt"
}

export interface ComponentInfo {
  framework: "react" | "vue"
  hierarchy: string[]
  props?: Record<string, unknown>
  state?: Record<string, unknown>
}

export interface ElementInfo {
  selector: string
  tag: string
  text: string
  attributes: Record<string, string>
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

export interface MarkdownInput {
  instruction: string
  pageUrl: string
  pageTitle: string
  frameworkInfo: FrameworkInfo | null
  elementInfo: ElementInfo
  componentInfo: ComponentInfo | null
}

export type OutputFormat = "markdown" | "jsonl"

export interface Annotation {
  id: number
  elementInfo: ElementInfo
  frameworkInfo: FrameworkInfo | null
  componentInfo: ComponentInfo | null
  instruction: string
  /** Click position relative to document (pageX/pageY) */
  pageX: number
  pageY: number
}

export interface BatchInput {
  pageUrl: string
  pageTitle: string
  annotations: Annotation[]
  prefix?: string
}

export interface PrefixRule {
  pattern: string // URL pattern (e.g., "localhost:3000", "example.com")
  prefix: string  // Free text prefix (e.g., "[repo=my-app]")
}
