import type { KeyboardEvent as ReactKeyboardEvent } from "react"

/**
 * Stop a keyboard event fired inside tegakari's overlay UI from bubbling any
 * further, unless it's Escape.
 *
 * The overlay is mounted inside the host page's DOM, so a keydown/keyup on
 * one of its own inputs (the annotation textarea, the style-tweak numeric
 * input, the Inbox prefix field, ...) is a `composed` event that keeps
 * bubbling past the overlay root and into the page's own `document`. Sites
 * with single-key hotkeys (YouTube-style: digit keys seek to a timestamp)
 * install a bubble-phase `document` keydown listener that calls
 * `preventDefault()` on those keys — which, without this guard, also eats
 * the same keystrokes typed into tegakari's own inputs (e.g. typing "24px"
 * into a style value field silently becomes "px").
 *
 * Escape is intentionally excluded so it keeps bubbling: `use-overlay.ts`
 * has its own bubble-phase `document` Escape handler that closes an active
 * popover / the whole overlay, and a couple of textareas (see
 * `AnnotationPin.tsx`, `relation-popover.tsx`) already stop propagation
 * themselves after handling Escape locally (save-and-close). Excluding it
 * here preserves both.
 *
 * Safe to use anywhere in the overlay tree: the extension's own
 * document-level keydown listeners (`use-picking.ts`, `use-link-mode.ts`)
 * are all capture-phase, so they run top-down and observe the event before
 * it ever reaches this bubble-phase handler — stopping propagation here
 * cannot hide a keystroke from them.
 */
export function stopOverlayKeyPropagation(e: ReactKeyboardEvent): void {
  if (e.key === "Escape") return
  e.stopPropagation()
}
