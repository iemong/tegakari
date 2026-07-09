import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

import type { TemplateDraft } from "../hooks/use-output-templates-manager"
import { TemplatePlaceholderLegend } from "./template-placeholder-legend"

interface TemplateEditFormProps {
  draft: TemplateDraft
  theme: Theme
  inputStyle: (extra?: CSSProperties) => CSSProperties
  buttonStyle: (
    bg: string,
    color: string,
    extra?: CSSProperties
  ) => CSSProperties
  onChange: (patch: Partial<TemplateDraft>) => void
  onSave: () => void
  onCancel: () => void
}

export function TemplateEditForm({
  draft,
  theme,
  inputStyle,
  buttonStyle,
  onChange,
  onSave,
  onCancel,
}: TemplateEditFormProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
      <TemplatePlaceholderLegend theme={theme} />
      <div style={editFooterStyle}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onCancel}
            style={buttonStyle("transparent", theme.textMuted, {
              border: `1px solid ${theme.border}`,
              padding: "6px 12px",
              fontSize: 12,
            })}>
            {t("options_common_cancel")}
          </button>
          <button
            onClick={onSave}
            style={buttonStyle(theme.accent, theme.accentText, {
              padding: "6px 12px",
              fontSize: 12,
            })}>
            {t("options_common_save")}
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
  justifyContent: "flex-end",
}
