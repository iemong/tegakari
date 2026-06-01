import { useCallback, useEffect, useRef, useState } from "react"

import { collectPageMetadata } from "~lib/annotation-store"
import { type ThemeMode, darkTheme, lightTheme } from "~lib/theme"
import type { PageMetadata, Rect } from "~lib/types"

import { isFromPlasmoUI } from "./overlay-helpers"
import { useAnnotations } from "./use-annotations"

type AddAnnotation = (target: Element, pageX: number, pageY: number) => void

const SUPPRESSED_EVENTS = [
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
] as const

export function useOverlay() {
  const [isActive, setIsActive] = useState(false)
  const themeState = useOverlayTheme()
  const ann = useAnnotations()
  const picking = usePicking(isActive, ann.addAnnotation)

  useCrosshairCursor(isActive)
  useToggle(setIsActive, ann.loadPersisted, ann.setMetadata)
  useScrollTick(isActive, ann.annotations.length)

  const close = useCallback(() => {
    setIsActive(false)
    picking.clearHover()
    ann.setActiveId(null)
  }, [picking.clearHover, ann.setActiveId])

  useEscape({
    isActive,
    count: ann.annotations.length,
    activeId: ann.activeId,
    setActiveId: ann.setActiveId,
    onClose: close,
  })

  return { isActive, ann, picking, close, ...themeState }
}

function useOverlayTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")

  useEffect(() => {
    chrome.storage.local.get("tegakariTheme", (result) => {
      if (result.tegakariTheme === "light" || result.tegakariTheme === "dark") {
        setThemeMode(result.tegakariTheme)
      }
    })
  }, [])

  const toggleMode = useCallback(() => {
    setThemeMode((m) => {
      const next = m === "dark" ? "light" : "dark"
      chrome.storage.local.set({ tegakariTheme: next })
      return next
    })
  }, [])

  const theme = themeMode === "dark" ? darkTheme : lightTheme
  return { theme, themeMode, toggleMode }
}

function usePicking(isActive: boolean, addAnnotation: AddAnnotation) {
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null)
  const clearHover = useCallback(() => setHoveredRect(null), [])

  useEffect(() => {
    if (!isActive) return

    const onMove = (e: MouseEvent) => {
      if (isFromPlasmoUI(e)) {
        setHoveredRect(null)
        return
      }
      const r = (e.target as Element).getBoundingClientRect()
      setHoveredRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    const onClick = (e: MouseEvent) => {
      if (isFromPlasmoUI(e)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      addAnnotation(e.target as Element, e.pageX, e.pageY)
    }
    // Suppress mousedown/mouseup/pointerdown/pointerup to prevent JS-driven
    // navigation and other side effects on page elements.
    const suppress = (e: Event) => {
      if (isFromPlasmoUI(e)) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("click", onClick, true)
    for (const type of SUPPRESSED_EVENTS) {
      document.addEventListener(type, suppress, true)
    }
    return () => {
      document.removeEventListener("mousemove", onMove, true)
      document.removeEventListener("click", onClick, true)
      for (const type of SUPPRESSED_EVENTS) {
        document.removeEventListener(type, suppress, true)
      }
    }
  }, [isActive, addAnnotation])

  return { hoveredRect, clearHover }
}

function useCrosshairCursor(isActive: boolean) {
  const cursorStyleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    if (isActive) {
      const style = document.createElement("style")
      style.id = "tegakari-cursor"
      style.textContent = "* { cursor: crosshair !important; }"
      document.head.appendChild(style)
      cursorStyleRef.current = style
    } else {
      cursorStyleRef.current?.remove()
      cursorStyleRef.current = null
    }
    return () => {
      cursorStyleRef.current?.remove()
      cursorStyleRef.current = null
    }
  }, [isActive])
}

function useToggle(
  setIsActive: (updater: (prev: boolean) => boolean) => void,
  loadPersisted: () => void,
  setMetadata: (meta: PageMetadata | null) => void
) {
  useEffect(() => {
    const handler = (message: { type?: string }) => {
      if (message?.type !== "TEGAKARI_TOGGLE") return
      setIsActive((prev) => {
        if (!prev) {
          loadPersisted()
          setMetadata(collectPageMetadata(null))
        }
        return !prev
      })
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [setIsActive, loadPersisted, setMetadata])
}

function useScrollTick(isActive: boolean, count: number) {
  const [, setScrollTick] = useState(0)

  useEffect(() => {
    if (!isActive && count === 0) return
    const onScroll = () => setScrollTick((t) => t + 1)
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
    }
  }, [isActive, count])
}

interface EscapeArgs {
  isActive: boolean
  count: number
  activeId: number | null
  setActiveId: (id: number | null) => void
  onClose: () => void
}

function useEscape({
  isActive,
  count,
  activeId,
  setActiveId,
  onClose,
}: EscapeArgs) {
  useEffect(() => {
    if (!isActive && count === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (activeId !== null) setActiveId(null)
      else onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isActive, count, activeId, setActiveId, onClose])
}
