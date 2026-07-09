import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from "react"

import { t } from "~lib/i18n"
import {
  MAX_OUTPUT_TEMPLATES,
  type OutputTemplate,
  parseOutputTemplates,
  serializeOutputTemplates,
} from "~lib/output-templates"
import type { Theme } from "~lib/theme"

type Tone = "success" | "warning" | "error"
type Message = { tone: Tone; text: string }
type ImportResult = { templates: OutputTemplate[]; overflowCount: number }

interface Props {
  templates: OutputTemplate[]
  theme: Theme
  onImport: (imported: OutputTemplate[]) => Promise<ImportResult>
}

export function TemplateImportExportBar({ templates, theme, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<Message | null>(null)

  const handleExport = useCallback(() => {
    setMessage(downloadTemplatesFile(templates))
  }, [templates])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Reset so the same file can be re-imported later.
      event.target.value = ""
      if (!file) return
      setMessage(await readTemplatesFile(file, onImport))
    },
    [onImport]
  )

  const disabled = templates.length === 0

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={barRowStyle(Boolean(message))}>
        <button
          type="button"
          onClick={handleImportClick}
          style={barButtonStyle(theme)}
          title={t("options_templates_import_title")}>
          {t("options_templates_import_button")}
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={disabled}
          style={barButtonStyle(theme, disabled)}
          title={t("options_templates_export_title")}>
          {t("options_templates_export_button")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImportFile}
        />
      </div>
      {message && (
        <StatusMessage
          message={message}
          theme={theme}
          onDismiss={() => setMessage(null)}
        />
      )}
    </div>
  )
}

function StatusMessage({
  message,
  theme,
  onDismiss,
}: {
  message: Message
  theme: Theme
  onDismiss: () => void
}) {
  return (
    <div role="status" onClick={onDismiss} style={statusStyle(message.tone, theme)}>
      {message.text}
    </div>
  )
}

function downloadTemplatesFile(templates: OutputTemplate[]): Message {
  const text = serializeOutputTemplates(templates)
  const blob = new Blob([text], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const date = new Date().toISOString().slice(0, 10)
  a.download = `tegakari-output-templates-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return {
    tone: "success",
    text: t("options_templates_export_success", String(templates.length)),
  }
}

async function readTemplatesFile(
  file: File,
  onImport: (imported: OutputTemplate[]) => Promise<ImportResult>
): Promise<Message> {
  let text: string
  try {
    text = await file.text()
  } catch (e) {
    return {
      tone: "error",
      text: t("options_templates_import_read_error", (e as Error).message),
    }
  }

  const { templates: imported, errors: parseErrors } = parseOutputTemplates(text)
  if (imported.length === 0) {
    const detail = parseErrors.join("; ") || t("options_templates_import_no_valid")
    return {
      tone: "error",
      text: `${t("options_templates_import_failed_prefix")} ${detail}`,
    }
  }

  const { overflowCount } = await onImport(imported)
  return buildImportMessage(imported.length, parseErrors, overflowCount)
}

/**
 * Combine parse-time skips (invalid entries) with the storage-cap overflow
 * (valid entries that didn't fit within MAX_OUTPUT_TEMPLATES) into a single
 * "Imported N; skipped M" message that matches what was actually persisted.
 */
function buildImportMessage(
  parsedCount: number,
  parseErrors: string[],
  overflowCount: number
): Message {
  const keptCount = parsedCount - overflowCount
  const details = [...parseErrors]
  if (overflowCount > 0) {
    details.push(
      t("options_templates_import_overflow_detail", [
        String(overflowCount),
        String(MAX_OUTPUT_TEMPLATES),
      ])
    )
  }

  const skippedCount = parseErrors.length + overflowCount
  if (skippedCount > 0) {
    return {
      tone: "warning",
      text: t("options_templates_import_partial", [
        String(keptCount),
        String(skippedCount),
        details.join("; "),
      ]),
    }
  }
  return {
    tone: "success",
    text: t("options_templates_import_success", String(keptCount)),
  }
}

function barRowStyle(hasMessage: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: hasMessage ? 12 : 0,
  }
}

function barButtonStyle(theme: Theme, disabled = false): CSSProperties {
  return {
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: theme.fontFamily,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  }
}

function statusStyle(tone: Tone, theme: Theme): CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    backgroundColor: toneBackground(tone, theme),
    color: tone === "error" ? "#d44" : theme.textPrimary,
    border: `1px solid ${toneBorder(tone, theme)}`,
    whiteSpace: "pre-wrap",
  }
}

function toneBackground(tone: Tone, theme: Theme): string {
  if (tone === "error") return "rgba(220,70,70,0.15)"
  if (tone === "warning") return "rgba(220,170,70,0.15)"
  return theme.accentMuted
}

function toneBorder(tone: Tone, theme: Theme): string {
  if (tone === "error") return "#d44"
  if (tone === "warning") return "#ca6"
  return theme.accent
}
