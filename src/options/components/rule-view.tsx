import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"
import type { PrefixRule } from "~lib/types"

interface RuleViewProps {
  rule: PrefixRule
  idx: number
  lastIdx: number
  theme: Theme
  onStartEdit: (idx: number) => void
  onDelete: (pattern: string) => void
  onReorder: (idx: number, direction: "up" | "down") => void
}

export function RuleView({
  rule,
  idx,
  lastIdx,
  theme,
  onStartEdit,
  onDelete,
  onReorder,
}: RuleViewProps) {
  const s = ruleViewStyles(theme)
  return (
    <div style={s.row}>
      <ReorderButtons
        idx={idx}
        lastIdx={lastIdx}
        theme={theme}
        onReorder={onReorder}
      />

      <div style={s.body}>
        <div style={s.patternRow}>
          <code style={s.pattern}>{rule.pattern}</code>
          {rule.isRegex && <RegexBadge theme={theme} />}
        </div>
        <div style={s.prefix}>→ {rule.prefix}</div>
      </div>

      <div style={s.actions}>
        <button onClick={() => onStartEdit(idx)} style={s.editButton}>
          {t("options_common_edit")}
        </button>
        <button onClick={() => onDelete(rule.pattern)} style={s.deleteButton}>
          {t("options_common_delete")}
        </button>
      </div>
    </div>
  )
}

interface ReorderButtonsProps {
  idx: number
  lastIdx: number
  theme: Theme
  onReorder: (idx: number, direction: "up" | "down") => void
}

function ReorderButtons({
  idx,
  lastIdx,
  theme,
  onReorder,
}: ReorderButtonsProps) {
  return (
    <div style={reorderGroupStyle}>
      <button
        onClick={() => onReorder(idx, "up")}
        disabled={idx === 0}
        style={reorderButtonStyle(theme, idx === 0)}>
        ▲
      </button>
      <button
        onClick={() => onReorder(idx, "down")}
        disabled={idx === lastIdx}
        style={reorderButtonStyle(theme, idx === lastIdx)}>
        ▼
      </button>
    </div>
  )
}

function RegexBadge({ theme }: { theme: Theme }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: theme.accent,
        backgroundColor: theme.accentMuted,
        padding: "1px 6px",
        borderRadius: 4,
      }}>
      {t("options_rule_view_regex_badge")}
    </span>
  )
}

function ruleViewStyles(theme: Theme): Record<string, CSSProperties> {
  const actionButton: CSSProperties = {
    background: "none",
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    padding: "4px 8px",
  }
  const ellipsis: CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }
  return {
    row: { display: "flex", alignItems: "center", gap: 10 },
    body: { flex: 1, minWidth: 0 },
    patternRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    pattern: {
      backgroundColor: theme.codeBg,
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 12,
      fontFamily: theme.fontMono,
      border: `1px solid ${theme.border}`,
      ...ellipsis,
    },
    prefix: { fontSize: 12, color: theme.textSecondary, ...ellipsis },
    actions: { display: "flex", gap: 4, flexShrink: 0 },
    editButton: { ...actionButton, color: theme.textMuted },
    deleteButton: { ...actionButton, color: theme.danger },
  }
}

const reorderGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  flexShrink: 0,
}

function reorderButtonStyle(theme: Theme, atEnd: boolean): CSSProperties {
  return {
    background: "none",
    border: "none",
    color: atEnd ? theme.border : theme.textMuted,
    cursor: atEnd ? "default" : "pointer",
    fontSize: 10,
    padding: 0,
    lineHeight: 1,
  }
}
