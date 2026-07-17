import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { OutputTemplate } from "~lib/output-templates"
import type { Theme } from "~lib/theme"

interface TemplateViewProps {
  template: OutputTemplate
  idx: number
  theme: Theme
  onStartEdit: (idx: number) => void
  onDelete: (id: string) => void
}

export function TemplateView({
  template,
  idx,
  theme,
  onStartEdit,
  onDelete,
}: TemplateViewProps) {
  const s = templateViewStyles(theme)
  return (
    <div style={s.row}>
      <div style={s.body}>
        <div style={s.name}>{template.name}</div>
        <TemplatePreviewLine
          label={t("options_templates_label_header")}
          value={template.header}
          theme={theme}
        />
        <TemplatePreviewLine
          label={t("options_templates_label_annotation")}
          value={template.annotation}
          theme={theme}
        />
      </div>

      <div style={s.actions}>
        <button onClick={() => onStartEdit(idx)} style={s.editButton}>
          {t("options_common_edit")}
        </button>
        <button onClick={() => onDelete(template.id)} style={s.deleteButton}>
          {t("options_common_delete")}
        </button>
      </div>
    </div>
  )
}

function TemplatePreviewLine({
  label,
  value,
  theme,
}: {
  label: string
  value: string
  theme: Theme
}) {
  const preview = value.trim().split("\n")[0] || ""
  return (
    <div style={{ fontSize: 12, color: theme.textSecondary, display: "flex", gap: 6 }}>
      <span style={{ color: theme.textMuted, flexShrink: 0 }}>{label}:</span>
      <code
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: theme.fontMono,
        }}>
        {preview}
      </code>
    </div>
  )
}

function templateViewStyles(theme: Theme): Record<string, CSSProperties> {
  const actionButton: CSSProperties = {
    background: "none",
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    padding: "4px 8px",
  }
  return {
    row: { display: "flex", alignItems: "flex-start", gap: 10 },
    body: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 },
    name: { fontSize: 13, fontWeight: 600, color: theme.textPrimary },
    actions: { display: "flex", gap: 4, flexShrink: 0 },
    editButton: { ...actionButton, color: theme.textMuted },
    deleteButton: { ...actionButton, color: theme.danger },
  }
}
