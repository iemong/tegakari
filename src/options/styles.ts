import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

export function createOptionsStyles(theme: Theme) {
  const inputStyle = (extra?: CSSProperties): CSSProperties => ({
    padding: "8px 12px",
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: theme.fontMono,
    outline: "none",
    boxSizing: "border-box",
    ...extra,
  })

  const buttonStyle = (
    bg: string,
    color: string,
    extra?: CSSProperties
  ): CSSProperties => ({
    padding: "8px 16px",
    backgroundColor: bg,
    color,
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    ...extra,
  })

  return { inputStyle, buttonStyle }
}
