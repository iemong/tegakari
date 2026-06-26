import { type MutableRefObject, useCallback, useEffect, useRef, useState } from "react"

import { climbToAncestor } from "~lib/dom-traverse"
import {
  type FrameOffset,
  TOP_FRAME_OFFSET,
  accessibleDocument,
  getFrameOffset,
  getSameOriginIframes,
  toTopViewportRect,
} from "~lib/iframe"
import type { Rect } from "~lib/types"

import { isFromPlasmoUI } from "./overlay-helpers"

export interface Point {
  pageX: number
  pageY: number
}

export interface AddAnnotationOptions {
  /** Element rect already translated to top-viewport coords (for iframe elements). */
  viewportRect?: Rect
  /** Skip Main-World framework collection (not injected inside iframes). */
  skipFramework?: boolean
}

export type AddAnnotation = (
  target: Element,
  point: Point,
  options?: AddAnnotationOptions
) => void

const SUPPRESSED_EVENTS = [
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
] as const

const PARENT_KEYS = new Set(["\\", "ArrowUp"])
const CHILD_KEYS = new Set(["ArrowDown"])

interface Resolved {
  el: Element
  offset: FrameOffset
}

interface PickingCtx {
  baseRef: MutableRefObject<Resolved | null>
  offsetStepsRef: MutableRefObject<number>
  currentRef: MutableRefObject<Resolved | null>
  mouseRef: MutableRefObject<Point>
  resolveAndShow: () => void
  confirm: (resolved: Resolved, point: Point) => void
  clearHover: () => void
}

// Shared mutable state threaded through the document-binding helpers.
interface Binder {
  ctx: PickingCtx
  onKeyDown: (e: KeyboardEvent) => void
  boundDocs: Set<Document>
  disposers: Array<() => void>
}

/**
 * Element picking: hover highlight, click-to-annotate, the parent-selection
 * shortcut (#30) and same-origin iframe selection (#29).
 *
 * A "base" element (whatever is under the cursor) plus a climb offset resolves
 * to the currently highlighted element. Keyboard (`\`/ArrowUp/ArrowDown) walks
 * the ancestor chain; the mouse resets the base and offset.
 */
export function usePicking(
  isActive: boolean,
  iframeEnabled: boolean,
  addAnnotation: AddAnnotation
) {
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null)
  const baseRef = useRef<Resolved | null>(null)
  const offsetStepsRef = useRef(0)
  const currentRef = useRef<Resolved | null>(null)
  const mouseRef = useRef<Point>({ pageX: 0, pageY: 0 })

  const clearHover = useCallback(() => {
    baseRef.current = null
    currentRef.current = null
    offsetStepsRef.current = 0
    setHoveredRect(null)
  }, [])

  // Recompute the highlighted element from base + climb offset, clamping the
  // offset to the steps actually available so ArrowDown stays in sync.
  const resolveAndShow = useCallback(() => {
    const base = baseRef.current
    if (!base) {
      currentRef.current = null
      setHoveredRect(null)
      return
    }
    const { element, steps } = climbToAncestor(base.el, offsetStepsRef.current)
    offsetStepsRef.current = steps
    currentRef.current = { el: element, offset: base.offset }
    setHoveredRect(toTopViewportRect(element, base.offset))
  }, [])

  const confirm = useCallback(
    (resolved: Resolved, point: Point) => {
      addAnnotation(resolved.el, point, {
        viewportRect: toTopViewportRect(resolved.el, resolved.offset),
        // Iframe elements live in a different document than the top frame's
        // isolated world, where the Main-World collector is not injected.
        skipFramework: resolved.el.ownerDocument !== document,
      })
    },
    [addAnnotation]
  )

  useEffect(() => {
    if (!isActive) return
    const ctx: PickingCtx = {
      baseRef,
      offsetStepsRef,
      currentRef,
      mouseRef,
      resolveAndShow,
      confirm,
      clearHover,
    }
    const binder: Binder = {
      ctx,
      onKeyDown: makeKeyHandler(ctx),
      boundDocs: new Set<Document>(),
      disposers: [],
    }

    bindDoc(binder, document, () => TOP_FRAME_OFFSET)
    if (iframeEnabled) setupIframeBinding(binder)

    return () => {
      for (const dispose of binder.disposers) dispose()
    }
  }, [isActive, iframeEnabled, clearHover, resolveAndShow, confirm])

  return { hoveredRect, clearHover }
}

function pointFromEvent(e: MouseEvent, offset: FrameOffset): Point {
  return {
    pageX: e.clientX + offset.x + window.scrollX,
    pageY: e.clientY + offset.y + window.scrollY,
  }
}

function makePointerHandlers(ctx: PickingCtx, getOffset: () => FrameOffset) {
  const onMove = (e: MouseEvent) => {
    if (isFromPlasmoUI(e)) {
      ctx.clearHover()
      return
    }
    const offset = getOffset()
    ctx.baseRef.current = { el: e.target as Element, offset }
    ctx.offsetStepsRef.current = 0
    ctx.mouseRef.current = pointFromEvent(e, offset)
    ctx.resolveAndShow()
  }

  const onClick = (e: MouseEvent) => {
    if (isFromPlasmoUI(e)) return
    e.preventDefault()
    e.stopImmediatePropagation()
    const offset = getOffset()
    const resolved = ctx.currentRef.current ?? {
      el: e.target as Element,
      offset,
    }
    ctx.confirm(resolved, pointFromEvent(e, offset))
  }

  return { onMove, onClick }
}

function makeKeyHandler(ctx: PickingCtx) {
  return (e: KeyboardEvent) => {
    // Never hijack keys typed into the overlay UI (e.g. the instruction
    // textarea): `\`, Enter and the arrow keys must work there normally.
    if (isFromPlasmoUI(e)) return
    if (!ctx.baseRef.current) return
    if (PARENT_KEYS.has(e.key)) {
      e.preventDefault()
      ctx.offsetStepsRef.current += 1
      ctx.resolveAndShow()
    } else if (CHILD_KEYS.has(e.key)) {
      e.preventDefault()
      ctx.offsetStepsRef.current = Math.max(0, ctx.offsetStepsRef.current - 1)
      ctx.resolveAndShow()
    } else if (e.key === "Enter" && ctx.currentRef.current) {
      e.preventDefault()
      ctx.confirm(ctx.currentRef.current, ctx.mouseRef.current)
    }
  }
}

function suppress(e: Event) {
  if (isFromPlasmoUI(e)) return
  e.preventDefault()
  e.stopImmediatePropagation()
}

function bindDoc(
  binder: Binder,
  doc: Document,
  getOffset: () => FrameOffset
) {
  if (binder.boundDocs.has(doc)) return
  binder.boundDocs.add(doc)
  const { onMove, onClick } = makePointerHandlers(binder.ctx, getOffset)
  const { onKeyDown } = binder
  doc.addEventListener("mousemove", onMove, true)
  doc.addEventListener("click", onClick, true)
  doc.addEventListener("keydown", onKeyDown, true)
  for (const type of SUPPRESSED_EVENTS) {
    doc.addEventListener(type, suppress, true)
  }
  binder.disposers.push(() => {
    doc.removeEventListener("mousemove", onMove, true)
    doc.removeEventListener("click", onClick, true)
    doc.removeEventListener("keydown", onKeyDown, true)
    for (const type of SUPPRESSED_EVENTS) {
      doc.removeEventListener(type, suppress, true)
    }
  })
}

// Bind currently-loaded same-origin iframes, and keep picking up iframes added
// or (re)loaded later — e.g. GAS apps that render their iframe asynchronously.
function setupIframeBinding(binder: Binder) {
  // Only the top document is scanned, so iframes nested inside another iframe
  // are not picked up (single-level only — covers the common GAS case).
  const bindIframes = () => {
    for (const iframe of getSameOriginIframes(document)) {
      const doc = accessibleDocument(iframe)
      if (doc) bindDoc(binder, doc, () => getFrameOffset(iframe))
    }
  }
  bindIframes()

  // Opt-in feature: re-scanning on every mutation re-runs querySelectorAll on
  // the top document. Acceptable since the user explicitly enabled iframe mode.
  const observer = new MutationObserver(bindIframes)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  binder.disposers.push(() => observer.disconnect())

  for (const iframe of Array.from(document.querySelectorAll("iframe"))) {
    iframe.addEventListener("load", bindIframes)
    binder.disposers.push(() => iframe.removeEventListener("load", bindIframes))
  }
}
