import { useEffect, useState } from "react"

import type { Theme } from "~lib/theme"
import type { Annotation, StyleDelta } from "~lib/types"

import StyleTweakRow from "./style-tweak-row"
import { panelBodyStyle, resetAllButtonStyle, toggleButtonStyle } from "./style-tweak-styles"
import { useStyleTweakRows } from "./use-style-tweak-rows"

interface Props {
  theme: Theme
  annotation: Annotation
  isActive: boolean
  onChange: (styleDelta: StyleDelta[] | undefined) => void
}

/** Collapsible "Adjust styles" panel: toggles open a per-property row list that previews inline-style edits live on the target element. */
export default function StyleTweakPanel({ theme, annotation, isActive, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { rows, updateValue, resetRow, resetAll } = useStyleTweakRows({
    annotation,
    isActive,
    onChange,
  })

  // Collapse again whenever the popover itself closes, so reopening a
  // (possibly different) pin doesn't leave a stale panel expanded.
  useEffect(() => {
    if (!isActive) setOpen(false)
  }, [isActive])

  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        style={toggleButtonStyle(theme)}>
        Adjust styles
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={panelBodyStyle(theme)}>
          {rows.map((row) => (
            <StyleTweakRow
              key={row.property}
              theme={theme}
              row={row}
              onChange={(value) => updateValue(row.property, value)}
              onReset={() => resetRow(row.property)}
            />
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              resetAll()
            }}
            style={resetAllButtonStyle(theme)}>
            Reset all
          </button>
        </div>
      )}
    </div>
  )
}
