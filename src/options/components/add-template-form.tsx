import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

import type { TemplateDraft } from "../hooks/use-output-templates-manager"
import { TemplatePlaceholderLegend } from "./template-placeholder-legend"

interface AddTemplateFormProps {
  draft: TemplateDraft
  theme: Theme
  inputStyle: (extra?: CSSProperties) => CSSProperties
  buttonStyle: (
    bg: string,
    color: string,
    extra?: CSSProperties
  ) => CSSProperties
  onChange: (patch: Partial<TemplateDraft>) => void
  onAdd: () => void
}

export function AddTemplateForm({
  draft,
  theme,
  inputStyle,
  buttonStyle,
  onChange,
  onAdd,
}: AddTemplateFormProps) {
  const s = formStyles(theme)

  return (
    <div style={s.card}>
      <div style={s.title}>{t("options_templates_add_title")}</div>
      <div style={s.fields}>
        <input
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={t("options_templates_field_name_placeholder")}
          style={inputStyle()}
        />
        <textarea
          value={draft.header}
          onChange={(event) => onChange({ header: event.target.value })}
          placeholder={t("options_templates_field_header_placeholder")}
          rows={3}
          style={inputStyle({ resize: "vertical", fontFamily: theme.fontMono })}
        />
        <textarea
          value={draft.annotation}
          onChange={(event) => onChange({ annotation: event.target.value })}
          placeholder={t("options_templates_field_annotation_placeholder")}
          rows={4}
          style={inputStyle({ resize: "vertical", fontFamily: theme.fontMono })}
        />
      </div>
      <TemplatePlaceholderLegend theme={theme} />
      <div style={s.footer}>
        <button onClick={onAdd} style={buttonStyle(theme.accent, theme.accentText)}>
          {t("options_templates_add_submit")}
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
    fields: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
    footer: { display: "flex", justifyContent: "flex-end" },
    error: { fontSize: 12, color: theme.danger, marginTop: 8 },
  }
}
