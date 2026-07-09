import { useCallback, useEffect, useState } from "react"

import { isFromPlasmoUI } from "./overlay-helpers"

export interface PendingRelation {
  fromId: number
  toId: number
}

const PIN_TESTID_RE = /^tegakari-pin-(\d+)$/

/** Reads the pin id off a click's composed path, if it hit a pin marker (see `AnnotationPin.tsx`'s `data-testid`). */
function pinIdFromEvent(e: Event): number | null {
  for (const node of e.composedPath()) {
    if (!(node instanceof HTMLElement)) continue
    const match = node.dataset.testid?.match(PIN_TESTID_RE)
    if (match) return Number(match[1])
  }
  return null
}

/**
 * "Link" mode (#RelationAnnotation): after starting from one pin, the next
 * pin click creates a `pendingRelation` (fromId/toId) that the caller turns
 * into a saved `Relation` once its instruction form is confirmed — see
 * `RelationLayer.tsx`.
 *
 * A `window`-level capture-phase click listener intercepts the target click
 * before it reaches the pin's own click handler or the page's
 * element-picking listener (`use-picking.ts`'s listener is bound on
 * `document`; a capture listener on `window` always runs first, since
 * capture-phase dispatch walks top-down from `window`).
 */
export function useLinkMode() {
  const [linkFromId, setLinkFromId] = useState<number | null>(null)
  const [pendingRelation, setPendingRelation] = useState<PendingRelation | null>(null)

  const startLink = useCallback((id: number) => {
    setLinkFromId(id)
    setPendingRelation(null)
  }, [])

  const cancelLink = useCallback(() => setLinkFromId(null), [])
  const cancelPending = useCallback(() => setPendingRelation(null), [])

  useLinkClickCapture({ linkFromId, setLinkFromId, setPendingRelation })
  useLinkEscape({ linkFromId, pendingRelation, cancelLink, cancelPending })

  return { linkFromId, pendingRelation, startLink, cancelLink, cancelPending }
}

interface ClickCaptureArgs {
  linkFromId: number | null
  setLinkFromId: (id: number | null) => void
  setPendingRelation: (rel: PendingRelation | null) => void
}

function useLinkClickCapture({
  linkFromId,
  setLinkFromId,
  setPendingRelation,
}: ClickCaptureArgs) {
  useEffect(() => {
    if (linkFromId === null) return
    const onClick = (e: MouseEvent) => {
      const targetId = pinIdFromEvent(e)
      if (targetId === null) {
        // Not a pin: cancel link mode. For real page content (not Plasmo UI)
        // also swallow the click so it doesn't fall through to element
        // picking and create a stray annotation.
        setLinkFromId(null)
        if (!isFromPlasmoUI(e)) {
          e.preventDefault()
          e.stopPropagation()
        }
        return
      }
      e.preventDefault()
      e.stopPropagation()
      if (targetId === linkFromId) {
        setLinkFromId(null) // self-click cancels
        return
      }
      setPendingRelation({ fromId: linkFromId, toId: targetId })
      setLinkFromId(null)
    }
    window.addEventListener("click", onClick, true)
    return () => window.removeEventListener("click", onClick, true)
  }, [linkFromId, setLinkFromId, setPendingRelation])
}

interface EscapeArgs {
  linkFromId: number | null
  pendingRelation: PendingRelation | null
  cancelLink: () => void
  cancelPending: () => void
}

function useLinkEscape({
  linkFromId,
  pendingRelation,
  cancelLink,
  cancelPending,
}: EscapeArgs) {
  useEffect(() => {
    if (linkFromId === null && pendingRelation === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      // Capture-phase + stopPropagation so this preempts use-overlay.ts's
      // own (bubble-phase) Escape handler for the pin popover / whole overlay.
      e.stopPropagation()
      if (pendingRelation) cancelPending()
      else cancelLink()
    }
    document.addEventListener("keydown", onKeyDown, true)
    return () => document.removeEventListener("keydown", onKeyDown, true)
  }, [linkFromId, pendingRelation, cancelLink, cancelPending])
}
