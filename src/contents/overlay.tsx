import { useCallback, useEffect, useRef, useState } from "react"

import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

import AnnotationPanel from "~components/AnnotationPanel"
import AnnotationPin from "~components/AnnotationPin"
import HighlightBox from "~components/HighlightBox"
import { generateSelector } from "~lib/selector"
import { type ThemeMode, ThemeContext, darkTheme, lightTheme } from "~lib/theme"
import type {
  Annotation,
  CollectResult,
  ElementInfo,
  Rect,
} from "~lib/types"

import styleText from "data-text:~style.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

function getAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  const interestingAttrs = [
    "class",
    "id",
    "name",
    "type",
    "href",
    "src",
    "role",
    "aria-label",
    "aria-describedby",
    "data-testid",
  ]

  for (const name of interestingAttrs) {
    const value = element.getAttribute(name)
    if (value !== null) {
      attrs[name] = value
    }
  }

  // Include data-* attributes not already captured
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith("data-") && !(attr.name in attrs)) {
      attrs[attr.name] = attr.value
    }
  }

  return attrs
}

function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.slice(0, maxLength) + "..."
}

function isFromPlasmoUI(e: Event): boolean {
  return e.composedPath().some(
    (node) =>
      node instanceof HTMLElement &&
      (node.id?.startsWith("plasmo-") ||
        node.tagName?.toLowerCase().startsWith("plasmo-"))
  )
}

export default function Overlay() {
  const [isActive, setIsActive] = useState(false)
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null)
  const [scrollTick, setScrollTick] = useState(0)
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")

  // Load saved theme on mount
  useEffect(() => {
    chrome.storage.local.get("tegakariTheme", (result) => {
      if (result.tegakariTheme === "light" || result.tegakariTheme === "dark") {
        setThemeMode(result.tegakariTheme)
      }
    })
  }, [])

  const theme = themeMode === "dark" ? darkTheme : lightTheme
  const toggleMode = useCallback(() => {
    setThemeMode((m) => {
      const next = m === "dark" ? "light" : "dark"
      chrome.storage.local.set({ tegakariTheme: next })
      return next
    })
  }, [])

  const nextIdRef = useRef(1)
  const pendingIdRef = useRef<number | null>(null)
  const cursorStyleRef = useRef<HTMLStyleElement | null>(null)

  // Listen for toggle from background
  useEffect(() => {
    const handler = (message: any) => {
      if (message?.type === "TEGAKARI_TOGGLE") {
        setIsActive((prev) => {
          if (prev) {
            // Deactivating — clear everything
            setAnnotations([])
            setActiveAnnotationId(null)
            setHoveredRect(null)
            nextIdRef.current = 1
            pendingIdRef.current = null
          }
          return !prev
        })
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // Listen for results from main world
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== "TEGAKARI_RESULT") return
      const result = event.data as CollectResult
      const pendingId = pendingIdRef.current
      if (pendingId === null) return
      pendingIdRef.current = null

      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === pendingId
            ? { ...a, frameworkInfo: result.framework, componentInfo: result.component }
            : a
        )
      )
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  // Cursor style when picking
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

  // Scroll listener to keep pins positioned correctly
  useEffect(() => {
    if (!isActive && annotations.length === 0) return
    const onScroll = () => setScrollTick((t) => t + 1)
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
    }
  }, [isActive, annotations.length])

  // Mouse handlers for picking
  useEffect(() => {
    if (!isActive) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isFromPlasmoUI(e)) {
        setHoveredRect(null)
        return
      }
      const target = e.target as Element
      const rect = target.getBoundingClientRect()
      setHoveredRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }

    const handleClick = (e: MouseEvent) => {
      if (isFromPlasmoUI(e)) return
      const target = e.target as Element

      e.preventDefault()
      e.stopImmediatePropagation()

      const info: ElementInfo = {
        selector: generateSelector(target),
        tag: target.tagName.toLowerCase(),
        text: truncateText(
          (target as HTMLElement).innerText || "",
          200
        ),
        attributes: getAttributes(target),
      }

      const id = nextIdRef.current++
      const newAnnotation: Annotation = {
        id,
        elementInfo: info,
        frameworkInfo: null,
        componentInfo: null,
        instruction: "",
        pageX: e.pageX,
        pageY: e.pageY,
      }

      setAnnotations((prev) => [...prev, newAnnotation])
      setActiveAnnotationId(id)

      // Request framework info from main world
      pendingIdRef.current = id
      window.postMessage(
        { type: "TEGAKARI_COLLECT", selector: info.selector },
        "*"
      )
    }

    // Suppress mousedown/mouseup/pointerdown/pointerup to prevent
    // JS-driven navigation and other side effects on page elements
    const suppressEvent = (e: Event) => {
      if (isFromPlasmoUI(e)) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    document.addEventListener("mousemove", handleMouseMove, true)
    document.addEventListener("click", handleClick, true)
    document.addEventListener("mousedown", suppressEvent, true)
    document.addEventListener("mouseup", suppressEvent, true)
    document.addEventListener("pointerdown", suppressEvent, true)
    document.addEventListener("pointerup", suppressEvent, true)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true)
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("mousedown", suppressEvent, true)
      document.removeEventListener("mouseup", suppressEvent, true)
      document.removeEventListener("pointerdown", suppressEvent, true)
      document.removeEventListener("pointerup", suppressEvent, true)
    }
  }, [isActive])

  const handleUpdateInstruction = useCallback(
    (id: number, instruction: string) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, instruction } : a))
      )
    },
    []
  )

  const handleDeleteAnnotation = useCallback((id: number) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    setActiveAnnotationId((prev) => (prev === id ? null : prev))
  }, [])

  const handleClose = useCallback(() => {
    setIsActive(false)
    setAnnotations([])
    setActiveAnnotationId(null)
    setHoveredRect(null)
    nextIdRef.current = 1
    pendingIdRef.current = null
  }, [])

  // Escape key
  useEffect(() => {
    if (!isActive && annotations.length === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isActive, annotations.length, handleClose])

  // Suppress scrollTick unused warning — it's used to trigger re-renders
  void scrollTick

  if (!isActive && annotations.length === 0) return null

  return (
    <ThemeContext.Provider value={{ theme, mode: themeMode, toggleMode }}>
      {isActive && hoveredRect && <HighlightBox rect={hoveredRect} />}

      {annotations.map((annotation) => (
        <AnnotationPin
          key={annotation.id}
          annotation={annotation}
          isActive={activeAnnotationId === annotation.id}
          onClick={() => setActiveAnnotationId(annotation.id)}
          onUpdateInstruction={handleUpdateInstruction}
          onDeselect={() => setActiveAnnotationId(null)}
        />
      ))}

      <AnnotationPanel
        annotations={annotations}
        activeAnnotationId={activeAnnotationId}
        onSelectAnnotation={setActiveAnnotationId}
        onUpdateInstruction={handleUpdateInstruction}
        onDeleteAnnotation={handleDeleteAnnotation}
        onClose={handleClose}
      />
    </ThemeContext.Provider>
  )
}
