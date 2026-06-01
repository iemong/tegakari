import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

export const btnBase: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px",
  borderRadius: 8,
  transition: "background-color 0.12s",
}

export function toolbarBarStyle(theme: Theme): CSSProperties {
  return {
    position: "fixed",
    inset: "auto auto 16px 50%",
    margin: 0,
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "4px 6px",
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 50,
    boxShadow: theme.shadowStrong,
    fontFamily: theme.fontFamily,
    fontSize: 13,
    pointerEvents: "auto",
    zIndex: 2147483647,
    userSelect: "none",
  }
}

export function inboxButtonStyle(theme: Theme, open: boolean): CSSProperties {
  return {
    ...btnBase,
    backgroundColor: open ? theme.accentMuted : "transparent",
    position: "relative",
  }
}

export function inboxBadgeStyle(theme: Theme): CSSProperties {
  return {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    fontSize: 9,
    fontWeight: 700,
    color: theme.accentText,
    backgroundColor: theme.accent,
    borderRadius: "50%",
    fontFamily: theme.fontMono,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
}

export function copyButtonStyle(copied: boolean): CSSProperties {
  return {
    ...btnBase,
    backgroundColor: copied ? "rgba(78, 203, 113, 0.15)" : "transparent",
  }
}

export function dividerStyle(theme: Theme): CSSProperties {
  return { width: 1, height: 20, backgroundColor: theme.border }
}

export function formatGroupStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    backgroundColor: theme.inputBg,
    borderRadius: 50,
    padding: 2,
  }
}

export function formatButtonStyle(theme: Theme, selected: boolean): CSSProperties {
  return {
    padding: "4px 10px",
    backgroundColor: selected ? theme.surface : "transparent",
    color: selected ? theme.textPrimary : theme.textMuted,
    border: "none",
    borderRadius: 50,
    fontWeight: 600,
    fontSize: 10,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    transition: "background-color 0.15s, color 0.15s",
    boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
  }
}
