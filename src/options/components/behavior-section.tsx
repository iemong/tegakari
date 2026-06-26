import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

interface Props {
  theme: Theme
  iframeEnabled: boolean
  onToggleIframe: () => void
}

export function BehaviorSection({
  theme,
  iframeEnabled,
  onToggleIframe,
}: Props) {
  const s = behaviorStyles(theme)

  return (
    <div style={s.card}>
      <div style={s.row}>
        <div>
          <div style={s.label}>Select inside iframes</div>
          <div style={s.help}>
            Also pick elements inside same-origin iframes (e.g. a Google Apps
            Script web app). Cross-origin iframes can't be accessed.
          </div>
        </div>
        <Switch theme={theme} on={iframeEnabled} onToggle={onToggleIframe} />
      </div>
    </div>
  )
}

interface SwitchProps {
  theme: Theme
  on: boolean
  onToggle: () => void
}

function Switch({ theme, on, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Select inside iframes"
      onClick={onToggle}
      style={switchTrackStyle(theme, on)}>
      <span style={switchThumbStyle(on)} />
    </button>
  )
}

function behaviorStyles(theme: Theme): Record<string, CSSProperties> {
  return {
    card: {
      padding: "16px 20px",
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
    },
    row: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    label: { fontSize: 13, color: theme.textPrimary, marginBottom: 2 },
    help: { fontSize: 12, color: theme.textMuted, lineHeight: 1.5 },
  }
}

function switchTrackStyle(theme: Theme, on: boolean): CSSProperties {
  return {
    position: "relative",
    flexShrink: 0,
    width: 40,
    height: 22,
    borderRadius: 999,
    border: "none",
    padding: 0,
    cursor: "pointer",
    backgroundColor: on ? theme.accent : theme.inputBg,
    transition: "background-color 0.15s",
  }
}

function switchThumbStyle(on: boolean): CSSProperties {
  return {
    position: "absolute",
    top: 3,
    left: on ? 21 : 3,
    width: 16,
    height: 16,
    borderRadius: "50%",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    transition: "left 0.15s",
  }
}
