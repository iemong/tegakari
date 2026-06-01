import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

import type { RuleDraft } from "../hooks/use-prefix-rules-manager"

interface RuleEditFormProps {
  draft: RuleDraft
  theme: Theme
  inputStyle: (extra?: CSSProperties) => CSSProperties
  buttonStyle: (
    bg: string,
    color: string,
    extra?: CSSProperties
  ) => CSSProperties
  onChange: (patch: Partial<RuleDraft>) => void
  onSave: () => void
  onCancel: () => void
}

export function RuleEditForm({
  draft,
  theme,
  inputStyle,
  buttonStyle,
  onChange,
  onSave,
  onCancel,
}: RuleEditFormProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={draft.pattern}
          onChange={(event) => onChange({ pattern: event.target.value })}
          placeholder="Pattern"
          style={inputStyle({ flex: 1 })}
        />
        <input
          value={draft.prefix}
          onChange={(event) => onChange({ prefix: event.target.value })}
          placeholder="Prefix"
          style={inputStyle({ flex: 1 })}
        />
      </div>
      <div style={editFooterStyle}>
        <label style={regexLabelStyle(theme)}>
          <input
            type="checkbox"
            checked={draft.isRegex}
            onChange={(event) => onChange({ isRegex: event.target.checked })}
            style={{ accentColor: theme.accent }}
          />
          Regex
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onCancel}
            style={buttonStyle("transparent", theme.textMuted, {
              border: `1px solid ${theme.border}`,
              padding: "6px 12px",
              fontSize: 12,
            })}>
            Cancel
          </button>
          <button
            onClick={onSave}
            style={buttonStyle(theme.accent, theme.accentText, {
              padding: "6px 12px",
              fontSize: 12,
            })}>
            Save
          </button>
        </div>
      </div>
      {draft.error && (
        <div style={{ fontSize: 12, color: theme.danger }}>{draft.error}</div>
      )}
    </div>
  )
}

const editFooterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

function regexLabelStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: theme.textMuted,
    cursor: "pointer",
  }
}
