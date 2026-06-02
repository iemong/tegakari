import type { Theme } from "~lib/theme"

import { usePrefixRulesManager } from "../hooks/use-prefix-rules-manager"
import { createOptionsStyles } from "../styles"
import { AddRuleForm } from "./add-rule-form"
import { ExamplesTable } from "./examples-table"
import { ImportExportBar } from "./import-export-bar"
import { RuleList } from "./rule-list"
import { SettingsSection } from "./settings-section"

export function PrefixRulesSection({ theme }: { theme: Theme }) {
  const m = usePrefixRulesManager()
  const { inputStyle, buttonStyle } = createOptionsStyles(theme)

  return (
    <SettingsSection
      title="Prefix Rules"
      theme={theme}
      description={<PrefixRulesDescription theme={theme} />}>
      <ImportExportBar
        rules={m.rules}
        theme={theme}
        onImport={m.importRules}
      />
      <RuleList
        rules={m.rules}
        editingIdx={m.editingIdx}
        editDraft={m.editDraft}
        theme={theme}
        inputStyle={inputStyle}
        buttonStyle={buttonStyle}
        onEditDraftChange={m.updateEditDraft}
        onSaveEdit={m.saveEdit}
        onCancelEdit={m.cancelEdit}
        onStartEdit={m.startEdit}
        onDelete={m.deleteRule}
        onReorder={m.reorderRule}
      />
      <AddRuleForm
        draft={m.addDraft}
        theme={theme}
        inputStyle={inputStyle}
        buttonStyle={buttonStyle}
        onChange={m.updateAddDraft}
        onAdd={m.addRule}
      />
      <ExamplesTable theme={theme} />
    </SettingsSection>
  )
}

function PrefixRulesDescription({ theme }: { theme: Theme }) {
  return (
    <>
      URL patterns are matched against the hostname (e.g.,{" "}
      <code
        style={{
          backgroundColor: theme.codeBg,
          padding: "1px 5px",
          borderRadius: 4,
          fontFamily: theme.fontMono,
        }}>
        localhost:3000
      </code>
      ). Enable regex to match against the full URL. Rules are evaluated
      top-to-bottom; first match wins.
    </>
  )
}
