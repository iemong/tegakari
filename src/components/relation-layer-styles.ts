import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

// Fills the viewport exactly (no viewBox) so SVG user units line up 1:1 with
// the same viewport-relative pixel coordinates AnnotationPin uses
// (`pageX/pageY - scroll`). `<svg>` is a replaced element, so `inset: 0`
// alone isn't enough to stretch it (unlike a plain `<div>`) — without an
// explicit size it can fall back to its 300×150 intrinsic box and clip
// everything outside that corner. `100%` (not `100vw`/`100vh`, which can
// overshoot past a scrollbar) resolves against the fixed element's
// containing block, i.e. the viewport. Sits below the pins' z-index
// (2147483646).
export const svgLayerStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 2147483645,
}

// Only the line + label (via `labelGroupStyle`, applied to their wrapping
// `<g>`) opt back into pointer-events — everything else in the SVG layer
// stays click-through so it never blocks pins or page content underneath.
export const labelGroupStyle: CSSProperties = {
  pointerEvents: "auto",
  cursor: "pointer",
}

export function lineStyle(theme: Theme, isActive: boolean): CSSProperties {
  return {
    stroke: isActive ? theme.accent : theme.textMuted,
    strokeWidth: isActive ? 2 : 1.5,
  }
}

export function pendingLineStyle(theme: Theme): CSSProperties {
  return { stroke: theme.accent, strokeWidth: 1.5, strokeDasharray: "4 4" }
}

export function labelCircleStyle(theme: Theme, isActive: boolean): CSSProperties {
  return {
    fill: isActive ? theme.accent : theme.surface,
    stroke: theme.border,
    strokeWidth: 1,
  }
}

export function labelTextStyle(theme: Theme, isActive: boolean): CSSProperties {
  return {
    fill: isActive ? theme.accentText : theme.textPrimary,
    fontSize: 9,
    fontWeight: 700,
    fontFamily: theme.fontMono,
    userSelect: "none",
  }
}

export function popoverContainerStyle(theme: Theme): CSSProperties {
  return {
    position: "fixed",
    transform: "translate(-50%, -50%)",
    width: 240,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    boxShadow: theme.shadowStrong,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 2147483647,
    pointerEvents: "auto",
    fontFamily: theme.fontFamily,
  }
}

export function popoverHeaderStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 11,
    fontWeight: 600,
    color: theme.textPrimary,
    fontFamily: theme.fontMono,
  }
}

export function popoverTextareaStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "6px 8px",
    resize: "vertical",
    fontFamily: theme.fontFamily,
    fontSize: 11,
    lineHeight: 1.4,
    boxSizing: "border-box",
    outline: "none",
  }
}

export function cancelButtonStyle(theme: Theme): CSSProperties {
  return {
    flex: 1,
    padding: "6px 0",
    backgroundColor: "transparent",
    color: theme.textMuted,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 11,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
  }
}

export function saveButtonStyle(theme: Theme, enabled: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "6px 0",
    backgroundColor: enabled ? theme.accent : theme.border,
    color: enabled ? theme.accentText : theme.textMuted,
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 11,
    fontFamily: theme.fontFamily,
    cursor: enabled ? "pointer" : "not-allowed",
  }
}

export const deleteIconButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 2,
  display: "flex",
}
