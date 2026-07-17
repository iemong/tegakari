import type { CSSProperties, KeyboardEvent } from "react"

import { t } from "~lib/i18n"
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
  const s = formStyles(theme)
  const patternPlaceholder = draft.isRegex
    ? t("options_add_rule_pattern_placeholder_regex")
    : t("options_add_rule_pattern_placeholder_host")

  return (
    <div style={s.card}>
      <div style={s.title}>{t("options_add_rule_title")}</div>
      <div style={s.row}>
        <input
          value={draft.pattern}
          onChange={(event) => onChange({ pattern: event.target.value })}
          placeholder={patternPlaceholder}
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
      <div style={s.footer}>
        <label style={s.label}>
          <input
            type="checkbox"
            checked={draft.isRegex}
            onChange={(event) => onChange({ isRegex: event.target.checked })}
            style={{ accentColor: theme.accent }}
          />
          {t("options_add_rule_regex_label")}
        </label>
        <button
          onClick={onAdd}
          style={buttonStyle(theme.accent, theme.accentText)}>
          {t("options_add_rule_submit")}
        </button>
      </div>
      {draft.error && <div style={s.error}>{draft.error}</div>}
    </div>
  )
}

function formStyles(theme: Theme): Record<string, CSSProperties> {
  return {
    card: {
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      padding: "16px",
    },
    title: {
      fontSize: 13,
      fontWeight: 600,
      color: theme.textPrimary,
      marginBottom: 12,
    },
    row: { display: "flex", gap: 8, marginBottom: 8 },
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      color: theme.textMuted,
      cursor: "pointer",
    },
    error: { fontSize: 12, color: theme.danger, marginTop: 8 },
  }
}
