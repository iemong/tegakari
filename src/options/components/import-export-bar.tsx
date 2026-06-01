import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from "react"

import { parseRules, serializeRules } from "~lib/prefix-rules"
import type { Theme } from "~lib/theme"
import type { PrefixRule } from "~lib/types"

type Tone = "success" | "warning" | "error"
type Message = { tone: Tone; text: string }

interface Props {
  rules: PrefixRule[]
  theme: Theme
  onImport: (imported: PrefixRule[]) => Promise<unknown>
}

export function ImportExportBar({ rules, theme, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<Message | null>(null)

  const handleExport = useCallback(() => {
    setMessage(downloadRulesFile(rules))
  }, [rules])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Reset so the same file can be re-imported later.
      event.target.value = ""
      if (!file) return
      setMessage(await readRulesFile(file, onImport))
    },
    [onImport]
  )

  const disabled = rules.length === 0

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={barRowStyle(Boolean(message))}>
        <button
          type="button"
          onClick={handleImportClick}
          style={barButtonStyle(theme)}
          title="Import rules from a JSON file (existing rules with the same pattern will be overwritten)">
          Import
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={disabled}
          style={barButtonStyle(theme, disabled)}
          title="Download all rules as JSON">
          Export
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

function downloadRulesFile(rules: PrefixRule[]): Message {
  const text = serializeRules(rules)
  const blob = new Blob([text], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const date = new Date().toISOString().slice(0, 10)
  a.download = `tegakari-prefix-rules-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return { tone: "success", text: `Exported ${rules.length} rule(s).` }
}

async function readRulesFile(
  file: File,
  onImport: (imported: PrefixRule[]) => Promise<unknown>
): Promise<Message> {
  let text: string
  try {
    text = await file.text()
  } catch (e) {
    return { tone: "error", text: `Failed to read file: ${(e as Error).message}` }
  }

  const { rules: imported, errors } = parseRules(text)
  if (imported.length === 0) {
    return {
      tone: "error",
      text: `Import failed. ${errors.join("; ") || "No valid rules found."}`,
    }
  }

  await onImport(imported)
  if (errors.length > 0) {
    return {
      tone: "warning",
      text: `Imported ${imported.length} rule(s); skipped ${errors.length}: ${errors.join("; ")}`,
    }
  }
  return { tone: "success", text: `Imported ${imported.length} rule(s).` }
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
