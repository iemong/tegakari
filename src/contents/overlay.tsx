import { useCallback, useEffect, useRef, useState } from "react"

import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

import AnnotationPin from "~components/AnnotationPin"
import HighlightBox from "~components/HighlightBox"
import Toolbar from "~components/Toolbar"
import {
  clearAllAnnotations,
  clearArchivedAnnotations,
  collectPageMetadata,
  loadAnnotationStore,
  updateAnnotations,
} from "~lib/annotation-store"
import { generateSelector } from "~lib/selector"
import { type ThemeMode, ThemeContext, darkTheme, lightTheme } from "~lib/theme"
import type {
  Annotation,
  CaptureResponse,
  CollectResult,
  ElementInfo,
  PageMetadata,
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

/** Capture visible tab screenshot via background */
async function captureScreenshot(): Promise<string | null> {
  try {
    const response: CaptureResponse = await chrome.runtime.sendMessage({
      type: "TEGAKARI_CAPTURE",
    })
    if (response.success && response.dataUrl) {
      return response.dataUrl
    }
  } catch {
    // silently fail
  }
  return null
}

/** Crop a screenshot to the element's bounding rect */
async function cropToElement(
  fullDataUrl: string,
  rect: DOMRect,
  padding = 20
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1
      const x = Math.max(0, (rect.left - padding) * dpr)
      const y = Math.max(0, (rect.top - padding) * dpr)
      const w = Math.min(img.width - x, (rect.width + padding * 2) * dpr)
      const h = Math.min(img.height - y, (rect.height + padding * 2) * dpr)

      const canvas = document.createElement("canvas")
      // Limit output size for storage
      const maxW = 400
      const scale = w > maxW ? maxW / w : 1
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/jpeg", 0.7))
    }
    img.onerror = () => resolve(fullDataUrl)
    img.src = fullDataUrl
  })
}

export default function Overlay() {
  const [isActive, setIsActive] = useState(false)
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null)
  const [scrollTick, setScrollTick] = useState(0)
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")
  const [metadata, setMetadata] = useState<PageMetadata | null>(null)

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

  // Load persisted annotations on activate
  const loadPersistedAnnotations = useCallback(async () => {
    const store = await loadAnnotationStore(location.href)
    if (store && store.annotations.length > 0) {
      setAnnotations(store.annotations)
      const maxId = Math.max(...store.annotations.map((a) => a.id))
      nextIdRef.current = maxId + 1
      setMetadata(store.metadata)
    }
  }, [])

  // Persist annotations whenever they change
  const persistAnnotations = useCallback(
    async (anns: Annotation[]) => {
      const meta = metadata ?? collectPageMetadata(null)
      await updateAnnotations(location.href, meta, anns)
    },
    [metadata]
  )

  // Listen for toggle from background
  useEffect(() => {
    const handler = (message: any) => {
      if (message?.type === "TEGAKARI_TOGGLE") {
        setIsActive((prev) => {
          if (!prev) {
            // Activating — load persisted & collect metadata
            loadPersistedAnnotations()
            const meta = collectPageMetadata(null)
            setMetadata(meta)
          }
          return !prev
        })
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [loadPersistedAnnotations])

  // Listen for results from main world
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== "TEGAKARI_RESULT") return
      const result = event.data as CollectResult
      const pendingId = pendingIdRef.current
      if (pendingId === null) return
      pendingIdRef.current = null

      setAnnotations((prev) => {
        const updated = prev.map((a) =>
          a.id === pendingId
            ? { ...a, frameworkInfo: result.framework, componentInfo: result.component }
            : a
        )
        persistAnnotations(updated)
        // Update metadata with framework info
        if (result.framework) {
          setMetadata((m) => m ? { ...m, frameworkInfo: result.framework } : m)
        }
        return updated
      })
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [persistAnnotations])

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
      const boundingRect = target.getBoundingClientRect()
      const newAnnotation: Annotation = {
        id,
        elementInfo: info,
        frameworkInfo: null,
        componentInfo: null,
        instruction: "",
        pageX: e.pageX,
        pageY: e.pageY,
        status: "default",
        createdAt: Date.now(),
      }

      setAnnotations((prev) => {
        const updated = [...prev, newAnnotation]
        persistAnnotations(updated)
        return updated
      })
      setActiveAnnotationId(id)

      // Auto-capture screenshot of the element
      captureScreenshot().then(async (fullScreenshot) => {
        if (fullScreenshot) {
          const cropped = await cropToElement(fullScreenshot, boundingRect)
          setAnnotations((prev) => {
            const updated = prev.map((a) =>
              a.id === id ? { ...a, screenshot: cropped } : a
            )
            persistAnnotations(updated)
            return updated
          })
        }
      })

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
  }, [isActive, persistAnnotations])

  const handleUpdateInstruction = useCallback(
    (id: number, instruction: string) => {
      setAnnotations((prev) => {
        const updated = prev.map((a) => (a.id === id ? { ...a, instruction } : a))
        persistAnnotations(updated)
        return updated
      })
    },
    [persistAnnotations]
  )

  const handleDeleteAnnotation = useCallback(
    (id: number) => {
      setAnnotations((prev) => {
        const updated = prev.filter((a) => a.id !== id)
        persistAnnotations(updated)
        return updated
      })
      setActiveAnnotationId((prev) => (prev === id ? null : prev))
    },
    [persistAnnotations]
  )

  const handleArchiveAnnotation = useCallback(
    (id: number) => {
      setAnnotations((prev) => {
        const updated = prev.map((a) =>
          a.id === id ? { ...a, status: "archived" as const } : a
        )
        persistAnnotations(updated)
        return updated
      })
      setActiveAnnotationId((prev) => (prev === id ? null : prev))
    },
    [persistAnnotations]
  )

  const handleUnarchiveAnnotation = useCallback(
    (id: number) => {
      setAnnotations((prev) => {
        const updated = prev.map((a) =>
          a.id === id ? { ...a, status: "default" as const } : a
        )
        persistAnnotations(updated)
        return updated
      })
    },
    [persistAnnotations]
  )

  const handleClearAll = useCallback(async () => {
    setAnnotations([])
    setActiveAnnotationId(null)
    nextIdRef.current = 1
    await clearAllAnnotations(location.href)
  }, [])

  const handleClearArchived = useCallback(async () => {
    setAnnotations((prev) => {
      const updated = prev.filter((a) => a.status !== "archived")
      persistAnnotations(updated)
      return updated
    })
    await clearArchivedAnnotations(location.href)
  }, [persistAnnotations])

  const handleClose = useCallback(() => {
    setIsActive(false)
    setHoveredRect(null)
    setActiveAnnotationId(null)
    // Don't clear annotations — they're persisted
  }, [])

  // Escape key
  useEffect(() => {
    if (!isActive && annotations.length === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeAnnotationId !== null) {
          setActiveAnnotationId(null)
        } else {
          handleClose()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isActive, annotations.length, handleClose, activeAnnotationId])

  // Suppress scrollTick unused warning — it's used to trigger re-renders
  void scrollTick

  if (!isActive && annotations.length === 0) return null

  const defaultAnnotations = annotations.filter((a) => a.status === "default")

  return (
    <ThemeContext.Provider value={{ theme, mode: themeMode, toggleMode }}>
      {isActive && hoveredRect && <HighlightBox rect={hoveredRect} />}

      {defaultAnnotations.map((annotation) => (
        <AnnotationPin
          key={annotation.id}
          annotation={annotation}
          isActive={activeAnnotationId === annotation.id}
          onClick={() => setActiveAnnotationId(annotation.id)}
          onUpdateInstruction={handleUpdateInstruction}
          onArchive={handleArchiveAnnotation}
          onDelete={handleDeleteAnnotation}
          onDeselect={() => setActiveAnnotationId(null)}
        />
      ))}

      <Toolbar
        annotations={annotations}
        activeAnnotationId={activeAnnotationId}
        metadata={metadata}
        onSelectAnnotation={setActiveAnnotationId}
        onUpdateInstruction={handleUpdateInstruction}
        onDeleteAnnotation={handleDeleteAnnotation}
        onArchiveAnnotation={handleArchiveAnnotation}
        onUnarchiveAnnotation={handleUnarchiveAnnotation}
        onClearAll={handleClearAll}
        onClearArchived={handleClearArchived}
        onClose={handleClose}
      />
    </ThemeContext.Provider>
  )
}
