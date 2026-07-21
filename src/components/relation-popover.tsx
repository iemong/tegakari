import { type KeyboardEvent, useState } from "react"

import { TrashIcon } from "~components/icons"
import { stopOverlayKeyPropagation } from "~lib/overlay-keys"
import type { Theme } from "~lib/theme"

import {
  cancelButtonStyle,
  deleteIconButtonStyle,
  popoverContainerStyle,
  popoverHeaderStyle,
  popoverTextareaStyle,
  saveButtonStyle,
} from "./relation-layer-styles"

interface Props {
  theme: Theme
  x: number
  y: number
  fromId: number
  toId: number
  instruction: string
  onSave: (instruction: string) => void
  onCancel: () => void
  /** Omitted for a not-yet-saved (pending) relation — there's nothing to delete yet. */
  onDelete?: () => void
}

/**
 * The relation instruction form: shared by an existing relation's
 * edit/delete popover (opened by clicking its line label) and the pending
 * (not-yet-saved) relation created by link mode — see `RelationLayer.tsx`.
 */
export function RelationPopover({
  theme,
  x,
  y,
  fromId,
  toId,
  instruction,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState(instruction)
  const trimmed = draft.trim()

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && trimmed) onSave(trimmed)
    if (e.key === "Escape") {
      // For a pending relation, use-link-mode.ts's capture-phase handler
      // already consumes Escape before it reaches this textarea, so this
      // branch only runs for an existing relation's edit popover — close it
      // (stopPropagation still guards against the bubble-phase overlay
      // Escape handler doing something else first).
      e.stopPropagation()
      onCancel()
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={stopOverlayKeyPropagation}
      onKeyUp={stopOverlayKeyPropagation}
      style={{ ...popoverContainerStyle(theme), left: x, top: y }}>
      <div style={popoverHeaderStyle(theme)}>
        <span>
          #{fromId} ↔ #{toId}
        </span>
        {onDelete && (
          <button
            onClick={onDelete}
            title="Delete relation"
            style={deleteIconButtonStyle}>
            <TrashIcon color={theme.danger} />
          </button>
        )}
      </div>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="この2要素への指示を入力... (Cmd+Enter で保存)"
        rows={2}
        style={popoverTextareaStyle(theme)}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onCancel} style={cancelButtonStyle(theme)}>
          Cancel
        </button>
        <button
          onClick={() => trimmed && onSave(trimmed)}
          disabled={!trimmed}
          style={saveButtonStyle(theme, Boolean(trimmed))}>
          Save
        </button>
      </div>
    </div>
  )
}
