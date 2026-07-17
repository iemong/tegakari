import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { Theme, ThemeMode } from "~lib/theme"

interface Props {
  theme: Theme
  mode: ThemeMode
  onToggle: () => void
}

export function AppearanceSection({ theme, mode, onToggle }: Props) {
  const s = appearanceStyles(theme)

  return (
    <div style={s.card}>
      <div style={s.row}>
        <div>
          <div style={s.label}>{t("options_appearance_theme_label")}</div>
          <div style={s.help}>{t("options_appearance_theme_help")}</div>
        </div>
        <ThemeToggle theme={theme} mode={mode} onToggle={onToggle} />
      </div>
      <div style={s.current}>
        {mode === "dark"
          ? t("options_appearance_current_dark")
          : t("options_appearance_current_light")}
      </div>
    </div>
  )
}

function ThemeToggle({ theme, mode, onToggle }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={t("options_appearance_theme_label")}
      style={toggleGroupStyle(theme)}>
      {(["light", "dark"] as const).map((value) => (
        <ThemeOption
          key={value}
          value={value}
          selected={mode === value}
          theme={theme}
          onSelect={onToggle}
        />
      ))}
    </div>
  )
}

interface ThemeOptionProps {
  value: ThemeMode
  selected: boolean
  theme: Theme
  onSelect: () => void
}

function ThemeOption({ value, selected, theme, onSelect }: ThemeOptionProps) {
  const iconColor = selected ? theme.textPrimary : theme.textMuted
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        if (!selected) onSelect()
      }}
      style={themeOptionStyle(theme, selected)}>
      {value === "light" ? (
        <SunIcon color={iconColor} />
      ) : (
        <MoonIcon color={iconColor} />
      )}
      {value === "light"
        ? t("options_appearance_theme_light")
        : t("options_appearance_theme_dark")}
    </button>
  )
}

function appearanceStyles(theme: Theme): Record<string, CSSProperties> {
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
    help: { fontSize: 12, color: theme.textMuted },
    current: { fontSize: 11, color: theme.textMuted, marginTop: 10 },
  }
}

function toggleGroupStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    backgroundColor: theme.inputBg,
    borderRadius: 8,
    padding: 2,
  }
}

function themeOptionStyle(theme: Theme, selected: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    backgroundColor: selected ? theme.surface : "transparent",
    color: selected ? theme.textPrimary : theme.textMuted,
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: theme.fontFamily,
    cursor: selected ? "default" : "pointer",
    boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
    transition: "background-color 0.15s, color 0.15s",
  }
}

function SunIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
