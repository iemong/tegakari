import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from "react"

import { DownloadIcon, UploadIcon } from "~components/icons"
import {
  exportFileName,
  isSamePage,
  parseAnnotationExport,
  serializeAnnotationStore,
} from "~lib/annotation-share"
import { collectPageMetadata } from "~lib/annotation-store"
import type { Theme } from "~lib/theme"
import type { Annotation, PageMetadata } from "~lib/types"

import { btnBase } from "./inbox-styles"

type Tone = "success" | "warning" | "error"
type Message = { tone: Tone; text: string }

interface Props {
  theme: Theme
  annotations: Annotation[]
  metadata: PageMetadata | null
  onImportAnnotations: (imported: Annotation[]) => void
}

/** Export / import the current annotation set as a tegakari-annotations JSON file */
export function ShareBar({
  theme,
  annotations,
  metadata,
  onImportAnnotations,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<Message | null>(null)

  const handleExport = useCallback(() => {
    // The download anchor must live inside the overlay's shadow DOM: while
    // picking is active, a capture-phase suppressor on the page document
    // preventDefaults any click outside the Plasmo UI, which cancels the
    // download when the anchor sits in document.body.
    const container = fileInputRef.current?.parentElement ?? document.body
    downloadAnnotationsFile(annotations, metadata, container)
    setMessage({
      tone: "success",
      text: `Exported ${annotations.length} annotation(s).`,
    })
  }, [annotations, metadata])

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Reset so the same file can be re-imported later.
      event.target.value = ""
      if (!file) return
      setMessage(await importAnnotationsFile(file, onImportAnnotations))
    },
    [onImportAnnotations]
  )

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={shareButtonStyle(theme)}
        title="Import annotations from a tegakari annotations JSON file">
        <UploadIcon color={theme.textMuted} />
      </button>
      <button
        onClick={handleExport}
        disabled={annotations.length === 0}
        style={shareButtonStyle(theme, annotations.length === 0)}
        title="Export annotations as a tegakari annotations JSON file">
        <DownloadIcon color={theme.textMuted} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImportFile}
      />
      {message && (
        <ShareMessage
          theme={theme}
          message={message}
          onDismiss={() => setMessage(null)}
        />
      )}
    </>
  )
}

function downloadAnnotationsFile(
  annotations: Annotation[],
  metadata: PageMetadata | null,
  container: HTMLElement
) {
  const store = {
    url: location.href,
    metadata: metadata ?? collectPageMetadata(null),
    annotations,
  }
  const blob = new Blob([serializeAnnotationStore(store)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = exportFileName(location.href, new Date())
  container.appendChild(a)
  a.click()
  container.removeChild(a)
  URL.revokeObjectURL(url)
}

async function importAnnotationsFile(
  file: File,
  onImportAnnotations: (imported: Annotation[]) => void
): Promise<Message> {
  let text: string
  try {
    text = await file.text()
  } catch (e) {
    return {
      tone: "error",
      text: `Failed to read file: ${(e as Error).message}`,
    }
  }

  const { store, errors } = parseAnnotationExport(text)
  if (!store) {
    return { tone: "error", text: errors.join(" ") || "Import failed." }
  }

  onImportAnnotations(store.annotations)

  if (!isSamePage(store.url, location.href)) {
    return {
      tone: "warning",
      text: `Imported ${store.annotations.length} annotation(s) exported from a different page (${store.url}). Pins may not match elements here.`,
    }
  }
  if (errors.length > 0) {
    return {
      tone: "warning",
      text: `Imported ${store.annotations.length} annotation(s); ${errors.join(" ")}`,
    }
  }
  return {
    tone: "success",
    text: `Imported ${store.annotations.length} annotation(s).`,
  }
}

function ShareMessage({
  theme,
  message,
  onDismiss,
}: {
  theme: Theme
  message: Message
  onDismiss: () => void
}) {
  return (
    <div role="status" onClick={onDismiss} style={messageStyle(theme, message.tone)}>
      {message.text}
    </div>
  )
}

function shareButtonStyle(theme: Theme, disabled = false): CSSProperties {
  return {
    ...btnBase,
    padding: "4px 8px",
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    color: theme.textMuted,
  }
}

function messageStyle(theme: Theme, tone: Tone): CSSProperties {
  // The panel is position:fixed, so this floats just above its top edge
  return {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: 4,
    maxWidth: 340,
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 11,
    lineHeight: 1.5,
    cursor: "pointer",
    zIndex: 1,
    backgroundColor: theme.surface,
    color: tone === "error" ? theme.danger : theme.textPrimary,
    border: `1px solid ${tone === "success" ? theme.accent : theme.danger}`,
    boxShadow: theme.shadowStrong,
  }
}
