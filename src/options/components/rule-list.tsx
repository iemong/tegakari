import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"
import type { PrefixRule } from "~lib/types"

import type { RuleDraft } from "../hooks/use-prefix-rules-manager"

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
        <div
          key={rule.pattern}
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 4,
          }}>
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
      No rules yet. Add one below.
    </div>
  )
}

interface RuleEditFormProps {
  draft: RuleDraft
  theme: Theme
  inputStyle: (extra?: CSSProperties) => CSSProperties
  buttonStyle: (
    bg: string,
    color: string,
    extra?: CSSProperties
  ) => CSSProperties
  onChange: (patch: Partial<RuleDraft>) => void
  onSave: () => void
  onCancel: () => void
}

function RuleEditForm({
  draft,
  theme,
  inputStyle,
  buttonStyle,
  onChange,
  onSave,
  onCancel,
}: RuleEditFormProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={draft.pattern}
          onChange={(event) => onChange({ pattern: event.target.value })}
          placeholder="Pattern"
          style={inputStyle({ flex: 1 })}
        />
        <input
          value={draft.prefix}
          onChange={(event) => onChange({ prefix: event.target.value })}
          placeholder="Prefix"
          style={inputStyle({ flex: 1 })}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: theme.textMuted,
            cursor: "pointer",
          }}>
          <input
            type="checkbox"
            checked={draft.isRegex}
            onChange={(event) => onChange({ isRegex: event.target.checked })}
            style={{ accentColor: theme.accent }}
          />
          Regex
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onCancel}
            style={buttonStyle("transparent", theme.textMuted, {
              border: `1px solid ${theme.border}`,
              padding: "6px 12px",
              fontSize: 12,
            })}>
            Cancel
          </button>
          <button
            onClick={onSave}
            style={buttonStyle(theme.accent, theme.accentText, {
              padding: "6px 12px",
              fontSize: 12,
            })}>
            Save
          </button>
        </div>
      </div>
      {draft.error && (
        <div style={{ fontSize: 12, color: theme.danger }}>{draft.error}</div>
      )}
    </div>
  )
}

interface RuleViewProps {
  rule: PrefixRule
  idx: number
  lastIdx: number
  theme: Theme
  onStartEdit: (idx: number) => void
  onDelete: (pattern: string) => void
  onReorder: (idx: number, direction: "up" | "down") => void
}

function RuleView({
  rule,
  idx,
  lastIdx,
  theme,
  onStartEdit,
  onDelete,
  onReorder,
}: RuleViewProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
      <ReorderButtons
        idx={idx}
        lastIdx={lastIdx}
        theme={theme}
        onReorder={onReorder}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
          }}>
          <code
            style={{
              backgroundColor: theme.codeBg,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: theme.fontMono,
              border: `1px solid ${theme.border}`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
            {rule.pattern}
          </code>
          {rule.isRegex && <RegexBadge theme={theme} />}
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.textSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
          → {rule.prefix}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onStartEdit(idx)}
          style={{
            background: "none",
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            color: theme.textMuted,
            cursor: "pointer",
            fontSize: 12,
            padding: "4px 8px",
          }}>
          Edit
        </button>
        <button
          onClick={() => onDelete(rule.pattern)}
          style={{
            background: "none",
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            color: theme.danger,
            cursor: "pointer",
            fontSize: 12,
            padding: "4px 8px",
          }}>
          Delete
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flexShrink: 0,
      }}>
      <button
        onClick={() => onReorder(idx, "up")}
        disabled={idx === 0}
        style={{
          background: "none",
          border: "none",
          color: idx === 0 ? theme.border : theme.textMuted,
          cursor: idx === 0 ? "default" : "pointer",
          fontSize: 10,
          padding: 0,
          lineHeight: 1,
        }}>
        ▲
      </button>
      <button
        onClick={() => onReorder(idx, "down")}
        disabled={idx === lastIdx}
        style={{
          background: "none",
          border: "none",
          color: idx === lastIdx ? theme.border : theme.textMuted,
          cursor: idx === lastIdx ? "default" : "pointer",
          fontSize: 10,
          padding: 0,
          lineHeight: 1,
        }}>
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
      regex
    </span>
  )
}
