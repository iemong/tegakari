import { type Theme, useTheme } from "~lib/theme"
import type { Rect } from "~lib/types"

interface Props {
  rect: Rect
  /** Short element description (e.g. `div.card 320×96`) shown as a badge. */
  label?: string | null
}

const BADGE_HEIGHT = 18

export default function HighlightBox({ rect, label }: Props) {
  const { theme } = useTheme()

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: `2px solid ${theme.accent}`,
          backgroundColor: theme.accentMuted,
          pointerEvents: "none",
          zIndex: 2147483646,
          boxSizing: "border-box",
          borderRadius: 3,
          transition: "all 0.05s ease-out",
        }}
      />
      {label && <Badge rect={rect} label={label} theme={theme} />}
    </>
  )
}

function Badge({
  rect,
  label,
  theme,
}: {
  rect: Rect
  label: string
  theme: Theme
}) {
  // Sit just above the box; if there's no room (near the viewport top), drop
  // the badge just inside the top edge instead of clipping off-screen.
  const above = rect.top >= BADGE_HEIGHT + 2
  const top = above ? rect.top - BADGE_HEIGHT - 2 : rect.top + 2
  const left = Math.max(0, rect.left)

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        height: BADGE_HEIGHT,
        maxWidth: "90vw",
        display: "flex",
        alignItems: "center",
        padding: "0 6px",
        backgroundColor: theme.accent,
        color: "#fff",
        font: "600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
        zIndex: 2147483647,
        borderRadius: 3,
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      {label}
    </div>
  )
}
