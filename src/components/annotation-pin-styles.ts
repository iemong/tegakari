import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

interface Point {
  x: number
  y: number
}

export function popoverStyle({ x, y }: Point): CSSProperties {
  const popoverWidth = 280
  const flipLeft = x + 30 + popoverWidth > window.innerWidth
  const popoverTop = y + 28
  const flipUp = popoverTop + 200 > window.innerHeight
  return {
    position: "fixed",
    width: popoverWidth,
    ...(flipLeft ? { right: window.innerWidth - x + 8 } : { left: x + 28 }),
    ...(flipUp ? { bottom: window.innerHeight - y + 8 } : { top: popoverTop }),
  }
}

export function pinMarkerStyle(
  theme: Theme,
  { x, y }: Point,
  isActive: boolean
): CSSProperties {
  return {
    position: "fixed",
    top: y - 12,
    left: x - 12,
    width: 24,
    height: 24,
    borderRadius: "50%",
    backgroundColor: isActive ? theme.pinActiveBg : theme.pinBg,
    color: isActive ? theme.pinActiveText : theme.pinText,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: theme.fontMono,
    cursor: "pointer",
    zIndex: 2147483646,
    border: isActive
      ? "2px solid rgba(255,255,255,0.25)"
      : "2px solid rgba(0,0,0,0.15)",
    boxShadow: isActive
      ? `0 0 0 4px ${theme.accentMuted}, 0 2px 12px rgba(0,0,0,0.3)`
      : "0 2px 8px rgba(0,0,0,0.25)",
    transition: "background-color 0.15s, box-shadow 0.2s, border-color 0.15s",
    pointerEvents: "auto",
    userSelect: "none",
  }
}

export function popoverContainerStyle(theme: Theme): CSSProperties {
  return {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    boxShadow: theme.shadowStrong,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 2147483647,
    pointerEvents: "auto",
    fontFamily: theme.fontFamily,
  }
}

export function idBadgeStyle(theme: Theme): CSSProperties {
  return {
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: theme.accent,
    color: theme.accentText,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: theme.fontMono,
    flexShrink: 0,
  }
}

export function tagCodeStyle(theme: Theme): CSSProperties {
  return {
    backgroundColor: theme.codeBg,
    color: theme.textSecondary,
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: theme.fontMono,
    border: `1px solid ${theme.border}`,
  }
}

export function headerTextStyle(theme: Theme): CSSProperties {
  return {
    fontSize: 11,
    color: theme.textMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  }
}

export const headerActionsStyle: CSSProperties = {
  display: "flex",
  gap: 2,
  flexShrink: 0,
  marginLeft: "auto",
}

export const iconButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 4,
  display: "flex",
  borderRadius: 4,
}

export function thumbnailStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    maxHeight: 120,
    objectFit: "cover",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
  }
}

export function popoverTextareaStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    resize: "vertical",
    fontFamily: theme.fontFamily,
    fontSize: 12,
    lineHeight: 1.5,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
  }
}

export function saveButtonStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    padding: "7px 0",
    backgroundColor: theme.accent,
    color: theme.accentText,
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 12,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    transition: "background-color 0.15s",
    letterSpacing: "0.02em",
  }
}
