import { useCallback, useEffect, useRef, useState } from "react"

import { collectPageMetadata } from "~lib/annotation-store"
import { IFRAME_SELECTION_KEY, loadIframeSelection } from "~lib/settings"
import { type ThemeMode, darkTheme, lightTheme } from "~lib/theme"
import type { PageMetadata } from "~lib/types"

import { useAnnotations } from "./use-annotations"
import { usePicking } from "./use-picking"

export function useOverlay() {
  const [isActive, setIsActive] = useState(false)
  const themeState = useOverlayTheme()
  const iframeEnabled = useIframeSelection()
  const ann = useAnnotations()
  const picking = usePicking(isActive, iframeEnabled, ann.addAnnotation)

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

// Reads the persisted "select inside same-origin iframes" flag and keeps it in
// sync with changes made from the options page.
function useIframeSelection(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    loadIframeSelection().then(setEnabled)
    const onChanged = (changes: {
      [key: string]: chrome.storage.StorageChange
    }) => {
      if (IFRAME_SELECTION_KEY in changes) {
        setEnabled(changes[IFRAME_SELECTION_KEY].newValue === true)
      }
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  return enabled
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
