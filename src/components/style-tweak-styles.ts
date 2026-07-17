import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

export function toggleButtonStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 2px",
    background: "none",
    border: "none",
    color: theme.textSecondary,
    fontWeight: 600,
    fontSize: 11,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
  }
}

export function panelBodyStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "8px 2px 2px",
    borderTop: `1px solid ${theme.border}`,
  }
}

export function resetAllButtonStyle(theme: Theme): CSSProperties {
  return {
    alignSelf: "flex-start",
    padding: "4px 8px",
    backgroundColor: "transparent",
    color: theme.textMuted,
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
  }
}

export const rowContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
}

export function rowHeaderStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 6,
  }
}

export function propertyLabelStyle(theme: Theme): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: theme.fontMono,
    color: theme.textPrimary,
  }
}

export function beforeValueStyle(theme: Theme): CSSProperties {
  return {
    fontSize: 10,
    color: theme.textMuted,
    fontFamily: theme.fontMono,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    textAlign: "right",
  }
}

export const rowControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
}

export function textInputStyle(theme: Theme): CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    padding: "5px 8px",
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    fontSize: 11,
    fontFamily: theme.fontMono,
    boxSizing: "border-box",
    outline: "none",
  }
}

export function colorSwatchInputStyle(theme: Theme): CSSProperties {
  return {
    width: 26,
    height: 26,
    padding: 0,
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    backgroundColor: theme.inputBg,
    cursor: "pointer",
    flexShrink: 0,
  }
}

export function stepperButtonStyle(theme: Theme): CSSProperties {
  return {
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    backgroundColor: theme.inputBg,
    color: theme.textSecondary,
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  }
}

export function rowResetButtonStyle(theme: Theme): CSSProperties {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    display: "flex",
    color: theme.textMuted,
    flexShrink: 0,
  }
}
