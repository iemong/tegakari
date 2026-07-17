import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

/**
 * Fixed set of quick-instruction categories. IDs are the values persisted on
 * `Annotation.tags` and emitted in generator output — keep them lowercase and
 * stable. Labels are UI-only display text (English, matching the rest of the
 * overlay UI).
 */
export const INSTRUCTION_CHIPS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "spacing", label: "Spacing" },
  { id: "color", label: "Color" },
  { id: "text", label: "Text" },
  { id: "size", label: "Size" },
  { id: "align", label: "Align" },
  { id: "remove", label: "Remove" },
]

interface Props {
  theme: Theme
  selected: string[]
  onToggle: (id: string) => void
}

/** Toggle-able category chips shown alongside the pin popover's instruction textarea. */
export default function InstructionChips({ theme, selected, onToggle }: Props) {
  return (
    <div style={chipsContainerStyle}>
      {INSTRUCTION_CHIPS.map((chip) => {
        const isSelected = selected.includes(chip.id)
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={isSelected}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(chip.id)
            }}
            style={chipStyle(theme, isSelected)}>
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

const chipsContainerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
}

function chipStyle(theme: Theme, isSelected: boolean): CSSProperties {
  return {
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    border: `1px solid ${isSelected ? theme.accent : theme.border}`,
    backgroundColor: isSelected ? theme.accent : "transparent",
    color: isSelected ? theme.accentText : theme.textSecondary,
    transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
  }
}
