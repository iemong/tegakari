import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"
import type { PrefixRule } from "~lib/types"

import type { RuleDraft } from "../hooks/use-prefix-rules-manager"
import { RuleEditForm } from "./rule-edit-form"
import { RuleView } from "./rule-view"

interface RuleListProps {
  rules: PrefixRule[]
  editingIdx: number | null
  editDraft: RuleDraft
  theme: Theme
  inputStyle: (extra?: CSSProperties) => CSSProperties
  buttonStyle: (
    bg: string,
    color: string,
    extra?: CSSProperties
  ) => CSSProperties
  onEditDraftChange: (patch: Partial<RuleDraft>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartEdit: (idx: number) => void
  onDelete: (pattern: string) => void
  onReorder: (idx: number, direction: "up" | "down") => void
}

export function RuleList({
  rules,
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
  onReorder,
}: RuleListProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        marginBottom: 24,
      }}>
      {rules.length === 0 && <EmptyRulesState theme={theme} />}

      {rules.map((rule, idx) => (
        <div key={rule.pattern} style={ruleCardStyle(theme)}>
          {editingIdx === idx ? (
            <RuleEditForm
              draft={editDraft}
              theme={theme}
              inputStyle={inputStyle}
              buttonStyle={buttonStyle}
              onChange={onEditDraftChange}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
            />
          ) : (
            <RuleView
              rule={rule}
              idx={idx}
              lastIdx={rules.length - 1}
              theme={theme}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onReorder={onReorder}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function ruleCardStyle(theme: Theme): CSSProperties {
  return {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 4,
  }
}

function EmptyRulesState({ theme }: { theme: Theme }) {
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
      {t("options_rule_list_empty")}
    </div>
  )
}
