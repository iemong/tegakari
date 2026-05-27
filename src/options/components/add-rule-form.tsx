import type { CSSProperties, KeyboardEvent } from "react"

import type { Theme } from "~lib/theme"

import type { RuleDraft } from "../hooks/use-prefix-rules-manager"

interface AddRuleFormProps {
  draft: RuleDraft
  theme: Theme
  inputStyle: (extra?: CSSProperties) => CSSProperties
  buttonStyle: (
    bg: string,
    color: string,
    extra?: CSSProperties
  ) => CSSProperties
  onChange: (patch: Partial<RuleDraft>) => void
  onAdd: () => void
}

export function AddRuleForm({
  draft,
  theme,
  inputStyle,
  buttonStyle,
  onChange,
  onAdd,
}: AddRuleFormProps) {
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onAdd()
  }

  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding: "16px",
      }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: theme.textPrimary,
          marginBottom: 12,
        }}>
        Add Rule
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={draft.pattern}
          onChange={(event) => onChange({ pattern: event.target.value })}
          placeholder={
            draft.isRegex
              ? "https?://example\\.com/.*"
              : "example.com  (URLを貼ってもOK)"
          }
          style={inputStyle({ flex: 1 })}
          onKeyDown={handleEnter}
        />
        <input
          value={draft.prefix}
          onChange={(event) => onChange({ prefix: event.target.value })}
          placeholder="[repo=my-app]"
          style={inputStyle({ flex: 1 })}
          onKeyDown={handleEnter}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: theme.textMuted,
            cursor: "pointer",
          }}>
          <input
            type="checkbox"
            checked={draft.isRegex}
            onChange={(event) => onChange({ isRegex: event.target.checked })}
            style={{ accentColor: theme.accent }}
          />
          Regex (match against full URL)
        </label>
        <button onClick={onAdd} style={buttonStyle(theme.accent, theme.accentText)}>
          Add
        </button>
      </div>
      {draft.error && (
        <div style={{ fontSize: 12, color: theme.danger, marginTop: 8 }}>
          {draft.error}
        </div>
      )}
    </div>
  )
}
