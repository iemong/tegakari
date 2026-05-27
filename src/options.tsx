import { AddRuleForm } from "./options/components/add-rule-form"
import { ExamplesTable } from "./options/components/examples-table"
import { OptionsHeader } from "./options/components/options-header"
import { RuleList } from "./options/components/rule-list"
import { usePrefixRulesManager } from "./options/hooks/use-prefix-rules-manager"
import { useStoredTheme } from "./options/hooks/use-stored-theme"
import { createOptionsStyles } from "./options/styles"

export default function OptionsPage() {
  const { theme } = useStoredTheme()
  const {
    rules,
    addDraft,
    editingIdx,
    editDraft,
    updateAddDraft,
    addRule,
    deleteRule,
    startEdit,
    updateEditDraft,
    saveEdit,
    cancelEdit,
    reorderRule,
  } = usePrefixRulesManager()
  const { inputStyle, buttonStyle } = createOptionsStyles(theme)

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.textPrimary,
        fontFamily: theme.fontFamily,
        padding: "40px 0",
      }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
        <OptionsHeader theme={theme} />
        <RuleList
          rules={rules}
          editingIdx={editingIdx}
          editDraft={editDraft}
          theme={theme}
          inputStyle={inputStyle}
          buttonStyle={buttonStyle}
          onEditDraftChange={updateEditDraft}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onStartEdit={startEdit}
          onDelete={deleteRule}
          onReorder={reorderRule}
        />
        <AddRuleForm
          draft={addDraft}
          theme={theme}
          inputStyle={inputStyle}
          buttonStyle={buttonStyle}
          onChange={updateAddDraft}
          onAdd={addRule}
        />
        <ExamplesTable theme={theme} />
      </div>
    </div>
  )
}
