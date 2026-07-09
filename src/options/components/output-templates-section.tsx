import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

import { useOutputTemplatesManager } from "../hooks/use-output-templates-manager"
import { createOptionsStyles } from "../styles"
import { AddTemplateForm } from "./add-template-form"
import { SettingsSection } from "./settings-section"
import { TemplateImportExportBar } from "./template-import-export-bar"
import { TemplateList } from "./template-list"

export function OutputTemplatesSection({ theme }: { theme: Theme }) {
  const m = useOutputTemplatesManager()
  const { inputStyle, buttonStyle } = createOptionsStyles(theme)

  return (
    <SettingsSection
      title={t("options_templates_section_title")}
      theme={theme}
      description={t("options_templates_section_desc")}>
      <TemplateImportExportBar
        templates={m.templates}
        theme={theme}
        onImport={m.importTemplates}
      />
      <TemplateList
        templates={m.templates}
        editingIdx={m.editingIdx}
        editDraft={m.editDraft}
        theme={theme}
        inputStyle={inputStyle}
        buttonStyle={buttonStyle}
        onEditDraftChange={m.updateEditDraft}
        onSaveEdit={m.saveEdit}
        onCancelEdit={m.cancelEdit}
        onStartEdit={m.startEdit}
        onDelete={m.removeTemplate}
      />
      <AddTemplateForm
        draft={m.addDraft}
        theme={theme}
        inputStyle={inputStyle}
        buttonStyle={buttonStyle}
        onChange={m.updateAddDraft}
        onAdd={m.addTemplate}
      />
    </SettingsSection>
  )
}
