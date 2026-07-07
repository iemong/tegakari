import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { CopyImageButton } from "~components/copy-image-button"
import InboxPanel from "~components/InboxPanel"
import { CloseIcon, CopyIcon, InboxIcon } from "~components/icons"
import { useClipboard } from "~hooks/use-clipboard"
import { generateBatchJsonl } from "~lib/jsonl-generator"
import { generateBatchMarkdown } from "~lib/markdown-generator"
import { findMatchingPrefix, loadPrefixRules } from "~lib/prefix-rules"
import {
  loadOutputFormat,
  setOutputFormat as persistOutputFormat,
} from "~lib/settings"
import { type Theme, useTheme } from "~lib/theme"
import type { Annotation, OutputFormat, PageMetadata } from "~lib/types"

import {
  btnBase,
  copyButtonStyle,
  dividerStyle,
  formatButtonStyle,
  formatGroupStyle,
  inboxBadgeStyle,
  inboxButtonStyle,
  toolbarBarStyle,
} from "./toolbar-styles"

interface Props {
  annotations: Annotation[]
  activeAnnotationId: number | null
  metadata: PageMetadata | null
  onSelectAnnotation: (id: number) => void
  onDeleteAnnotation: (id: number) => void
  onClearAll: () => void
  onClose: () => void
  onImportAnnotations: (imported: Annotation[]) => void
}

export default function Toolbar(props: Props) {
  const { theme } = useTheme()
  const t = useToolbar(props)

  return (
    <>
      <ToolbarBar
        toolbarRef={t.toolbarRef}
        theme={theme}
        inboxOpen={t.inboxOpen}
        onToggleInbox={() => t.setInboxOpen((open) => !open)}
        annotations={t.annotations}
        count={t.annotations.length}
        copied={t.copied}
        onCopy={t.handleCopy}
        outputFormat={t.outputFormat}
        onFormatChange={t.setOutputFormat}
        onClose={props.onClose}
      />

      {t.inboxOpen && (
        <InboxPanel
          annotations={props.annotations}
          activeAnnotationId={props.activeAnnotationId}
          metadata={props.metadata}
          prefix={t.prefix}
          matchedPrefix={t.matchedPrefix}
          copiedItemId={t.copiedItemId}
          onPrefixChange={t.setPrefix}
          onSelectAnnotation={props.onSelectAnnotation}
          onCopyItem={t.handleCopyItem}
          onDeleteAnnotation={props.onDeleteAnnotation}
          onClearAll={props.onClearAll}
          onImportAnnotations={props.onImportAnnotations}
        />
      )}
    </>
  )
}

function useToolbar(props: Props) {
  const { copy } = useClipboard()
  const [inboxOpen, setInboxOpen] = useState(false)
  const [outputFormat, setOutputFormat] = useStoredOutputFormat()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const { annotations, metadata } = props

  const { prefix, setPrefix, matchedPrefix } = usePrefixSync()
  useTopLayer(toolbarRef)

  const formatOutput = useCallback(
    (items: Annotation[]) => {
      const input = {
        pageUrl: location.href,
        pageTitle: document.title,
        annotations: items,
        prefix: prefix.trim() || undefined,
        metadata: metadata ?? undefined,
      }
      return outputFormat === "jsonl"
        ? generateBatchJsonl(input)
        : generateBatchMarkdown(input)
    },
    [outputFormat, prefix, metadata]
  )

  const actions = useToolbarActions(copy, formatOutput, annotations)

  return {
    inboxOpen,
    setInboxOpen,
    outputFormat,
    setOutputFormat,
    toolbarRef,
    annotations,
    prefix,
    setPrefix,
    matchedPrefix,
    ...actions,
  }
}

// Output format persists across sessions so users who prefer Markdown don't
// have to re-toggle from the JSONL default every time.
function useStoredOutputFormat(): [
  OutputFormat,
  (format: OutputFormat) => void,
] {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jsonl")

  useEffect(() => {
    loadOutputFormat().then(setOutputFormat)
  }, [])

  const update = useCallback((format: OutputFormat) => {
    setOutputFormat(format)
    persistOutputFormat(format)
  }, [])

  return [outputFormat, update]
}

// Load prefix rules on mount + whenever storage changes.
function usePrefixSync() {
  const [prefix, setPrefix] = useState("")
  const [matchedPrefix, setMatchedPrefix] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => {
      loadPrefixRules().then((rules) => {
        const matched = findMatchingPrefix(rules, location.href)
        setMatchedPrefix(matched)
        setPrefix(matched ?? "")
      })
    }
    sync()
    chrome.storage.onChanged.addListener(sync)
    return () => chrome.storage.onChanged.removeListener(sync)
  }, [])

  return { prefix, setPrefix, matchedPrefix }
}

function useToolbarActions(
  copy: (text: string) => Promise<boolean>,
  formatOutput: (items: Annotation[]) => string,
  annotations: Annotation[]
) {
  const [copied, setCopied] = useState(false)
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null)

  const handleCopy = useCallback(async () => {
    if (annotations.length === 0) return
    await copy(formatOutput(annotations))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [annotations, formatOutput, copy])

  const handleCopyItem = useCallback(
    async (annotation: Annotation) => {
      await copy(formatOutput([annotation]))
      setCopiedItemId(annotation.id)
      setTimeout(() => setCopiedItemId(null), 1500)
    },
    [formatOutput, copy]
  )

  return { copied, copiedItemId, handleCopy, handleCopyItem }
}

interface ToolbarBarProps {
  toolbarRef: RefObject<HTMLDivElement>
  theme: Theme
  inboxOpen: boolean
  onToggleInbox: () => void
  annotations: Annotation[]
  count: number
  copied: boolean
  onCopy: () => void
  outputFormat: OutputFormat
  onFormatChange: (format: OutputFormat) => void
  onClose: () => void
}

function ToolbarBar({
  toolbarRef,
  theme,
  inboxOpen,
  onToggleInbox,
  annotations,
  count,
  copied,
  onCopy,
  outputFormat,
  onFormatChange,
  onClose,
}: ToolbarBarProps) {
  return (
    <div
      ref={toolbarRef}
      // @ts-expect-error popover attr is missing from React 18 types
      popover="manual"
      style={toolbarBarStyle(theme)}>
      <InboxButton
        theme={theme}
        open={inboxOpen}
        count={count}
        onToggle={onToggleInbox}
      />
      <button
        onClick={onCopy}
        style={copyButtonStyle(copied)}
        title={copied ? "Copied!" : `Copy All (${count})`}>
        <CopyIcon color={copied ? theme.success : theme.textMuted} />
      </button>
      <CopyImageButton annotations={annotations} />
      <div style={dividerStyle(theme)} />
      <FormatToggle
        theme={theme}
        outputFormat={outputFormat}
        onFormatChange={onFormatChange}
      />
      <div style={dividerStyle(theme)} />
      <button onClick={onClose} style={btnBase} title="Close tegakari">
        <CloseIcon color={theme.textMuted} />
      </button>
    </div>
  )
}

interface InboxButtonProps {
  theme: Theme
  open: boolean
  count: number
  onToggle: () => void
}

function InboxButton({ theme, open, count, onToggle }: InboxButtonProps) {
  return (
    <button onClick={onToggle} style={inboxButtonStyle(theme, open)} title="Inbox">
      <InboxIcon color={open ? theme.accent : theme.textMuted} />
      {count > 0 && <span style={inboxBadgeStyle(theme)}>{count}</span>}
    </button>
  )
}

interface FormatToggleProps {
  theme: Theme
  outputFormat: OutputFormat
  onFormatChange: (format: OutputFormat) => void
}

function FormatToggle({ theme, outputFormat, onFormatChange }: FormatToggleProps) {
  return (
    <div style={formatGroupStyle(theme)}>
      {(["jsonl", "markdown"] as const).map((fmt) => (
        <button
          key={fmt}
          onClick={() => onFormatChange(fmt)}
          style={formatButtonStyle(theme, outputFormat === fmt)}>
          {fmt === "jsonl" ? "JSONL" : "MD"}
        </button>
      ))}
    </div>
  )
}

// Promote the toolbar to the browser's top layer so it cannot be covered by
// page-level overlays. Top layer ignores z-index entirely.
function useTopLayer(ref: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = ref.current as
      | (HTMLElement & { showPopover?: () => void })
      | null
    if (!el || typeof el.showPopover !== "function") return
    try {
      el.showPopover()
    } catch {
      // Already open or not connected — safe to ignore.
    }
  }, [ref])
}
