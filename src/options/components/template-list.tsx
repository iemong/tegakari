import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { OutputTemplate } from "~lib/output-templates"
import type { Theme } from "~lib/theme"

import type { TemplateDraft } from "../hooks/use-output-templates-manager"
import { TemplateEditForm } from "./template-edit-form"
import { TemplateView } from "./template-view"

interface TemplateListProps {
  templates: OutputTemplate[]
  editingIdx: number | null
  editDraft: TemplateDraft
  theme: Theme
  inputStyle: (extra?: CSSProperties) => CSSProperties
  buttonStyle: (
    bg: string,
    color: string,
    extra?: CSSProperties
  ) => CSSProperties
  onEditDraftChange: (patch: Partial<TemplateDraft>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartEdit: (idx: number) => void
  onDelete: (id: string) => void
}

export function TemplateList({
  templates,
  editingIdx,
  editDraft,
  theme,
  inputStyle,
  buttonStyle,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
}: TemplateListProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        marginBottom: 16,
      }}>
      {templates.length === 0 && <EmptyTemplatesState theme={theme} />}

      {templates.map((template, idx) => (
        <div key={template.id} style={templateCardStyle(theme)}>
          {editingIdx === idx ? (
            <TemplateEditForm
              draft={editDraft}
              theme={theme}
              inputStyle={inputStyle}
              buttonStyle={buttonStyle}
              onChange={onEditDraftChange}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
            />
          ) : (
            <TemplateView
              template={template}
              idx={idx}
              theme={theme}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function templateCardStyle(theme: Theme): CSSProperties {
  return {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 4,
  }
}

function EmptyTemplatesState({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        color: theme.textMuted,
        fontSize: 13,
        border: `1px dashed ${theme.border}`,
        borderRadius: 10,
      }}>
      {t("options_templates_empty")}
    </div>
  )
}
