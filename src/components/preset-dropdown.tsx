import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"

import { ChevronDownIcon } from "~components/icons"
import { OUTPUT_PRESETS, OUTPUT_PRESET_LABELS } from "~lib/output-presets"
import type { Theme } from "~lib/theme"
import type { OutputPreset } from "~lib/types"

interface Props {
  theme: Theme
  preset: OutputPreset
  onPresetChange: (preset: OutputPreset) => void
}

/** Dropdown selecting one of the 5 output presets (jsonl/markdown/claude-code/cursor/minimal). */
export function PresetDropdown({ theme, preset, onPresetChange }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useCloseOnOutsideClick(containerRef, open, () => setOpen(false))

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      style={containerStyle}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle(theme, open)}
        title="Output preset">
        {OUTPUT_PRESET_LABELS[preset]}
        <ChevronDownIcon color={theme.textMuted} />
      </button>
      {open && (
        <PresetMenu
          theme={theme}
          preset={preset}
          onSelect={(next) => {
            onPresetChange(next)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function PresetMenu({
  theme,
  preset,
  onSelect,
}: {
  theme: Theme
  preset: OutputPreset
  onSelect: (preset: OutputPreset) => void
}) {
  return (
    <div role="listbox" style={menuStyle(theme)}>
      {OUTPUT_PRESETS.map((p) => (
        <button
          key={p}
          role="option"
          aria-selected={p === preset}
          onClick={() => onSelect(p)}
          style={menuItemStyle(theme, p === preset)}>
          {OUTPUT_PRESET_LABELS[p]}
        </button>
      ))}
    </div>
  )
}

// Close the menu on any click outside the trigger/menu, e.g. picking a page
// element while the dropdown was left open.
function useCloseOnOutsideClick(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler, true)
    return () => document.removeEventListener("mousedown", handler, true)
  }, [ref, active, onClose])
}

const containerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
}

function triggerStyle(theme: Theme, open: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    backgroundColor: open ? theme.accentMuted : "transparent",
    color: theme.textPrimary,
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 11,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }
}

function menuStyle(theme: Theme): CSSProperties {
  return {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    minWidth: 130,
    padding: 4,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    boxShadow: theme.shadowStrong,
    zIndex: 1,
  }
}

function menuItemStyle(theme: Theme, selected: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    padding: "6px 10px",
    backgroundColor: selected ? theme.accentMuted : "transparent",
    color: selected ? theme.accent : theme.textPrimary,
    border: "none",
    borderRadius: 6,
    fontWeight: selected ? 700 : 500,
    fontSize: 12,
    fontFamily: theme.fontFamily,
    textAlign: "left",
    cursor: "pointer",
  }
}
