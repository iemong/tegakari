import { useEffect, useRef, useState } from "react"

import { useTheme } from "~lib/theme"
import type { Annotation } from "~lib/types"

interface Props {
  annotation: Annotation
  isActive: boolean
  onClick: () => void
  onUpdateInstruction: (id: number, instruction: string) => void
  onArchive: (id: number) => void
  onDelete: (id: number) => void
  onDeselect: () => void
}

export default function AnnotationPin({
  annotation,
  isActive,
  onClick,
  onUpdateInstruction,
  onArchive,
  onDelete,
  onDeselect,
}: Props) {
  const { theme } = useTheme()
  const [draft, setDraft] = useState(annotation.instruction)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isActive) {
      setDraft(annotation.instruction)
    }
  }, [annotation.instruction, isActive])

  useEffect(() => {
    if (isActive) {
      setDraft(annotation.instruction)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [isActive, annotation.instruction])

  const handleSave = () => {
    onUpdateInstruction(annotation.id, draft)
    onDeselect()
  }

  // Don't show pins for archived annotations
  if (annotation.status === "archived") return null

  // Convert document-relative position to viewport-relative
  const pinX = annotation.pageX - window.scrollX
  const pinY = annotation.pageY - window.scrollY

  // Popover positioning with edge detection
  const popoverWidth = 280
  const flipLeft = pinX + 30 + popoverWidth > window.innerWidth
  const popoverTop = pinY + 28
  const flipUp = popoverTop + 200 > window.innerHeight

  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    width: popoverWidth,
    ...(flipLeft
      ? { right: window.innerWidth - pinX + 8 }
      : { left: pinX + 28 }),
    ...(flipUp
      ? { bottom: window.innerHeight - pinY + 8 }
      : { top: popoverTop }),
  }

  return (
    <>
      {/* Pin marker */}
      <div
        onClick={(e) => {
          e.stopPropagation()
          if (isActive) {
            handleSave()
          } else {
            onClick()
          }
        }}
        style={{
          position: "fixed",
          top: pinY - 12,
          left: pinX - 12,
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: isActive ? theme.pinActiveBg : theme.pinBg,
          color: isActive ? theme.pinActiveText : theme.pinText,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: theme.fontMono,
          cursor: "pointer",
          zIndex: 2147483646,
          border: isActive ? "2px solid rgba(255,255,255,0.25)" : "2px solid rgba(0,0,0,0.15)",
          boxShadow: isActive
            ? `0 0 0 4px ${theme.accentMuted}, 0 2px 12px rgba(0,0,0,0.3)`
            : "0 2px 8px rgba(0,0,0,0.25)",
          transition: "background-color 0.15s, box-shadow 0.2s, border-color 0.15s",
          pointerEvents: "auto",
          userSelect: "none",
        }}>
        {annotation.id}
      </div>

      {/* Popover form — primary input */}
      {isActive && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            ...popoverStyle,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            boxShadow: theme.shadowStrong,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 2147483647,
            pointerEvents: "auto",
            fontFamily: theme.fontFamily,
          }}>
          {/* Element label + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: theme.accent,
                color: theme.accentText,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: theme.fontMono,
                flexShrink: 0,
              }}>
              {annotation.id}
            </span>
            <code
              style={{
                backgroundColor: theme.codeBg,
                color: theme.textSecondary,
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: theme.fontMono,
                border: `1px solid ${theme.border}`,
              }}>
              {`<${annotation.elementInfo.tag}>`}
            </code>
            {annotation.elementInfo.text && (
              <span
                style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}>
                {annotation.elementInfo.text.slice(0, 15)}
                {annotation.elementInfo.text.length > 15 ? "..." : ""}
              </span>
            )}
            {/* Archive & Delete */}
            <div style={{ display: "flex", gap: 2, flexShrink: 0, marginLeft: "auto" }}>
              <button
                onClick={() => { onArchive(annotation.id); onDeselect() }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  borderRadius: 4,
                }}
                title="Archive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
              </button>
              <button
                onClick={() => { onDelete(annotation.id); onDeselect() }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  borderRadius: 4,
                }}
                title="Delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Screenshot thumbnail */}
          {annotation.screenshot && (
            <img
              src={annotation.screenshot}
              alt="Element screenshot"
              style={{
                width: "100%",
                maxHeight: 120,
                objectFit: "cover",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
              }}
            />
          )}

          {/* Instruction textarea */}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSave()
              }
              if (e.key === "Escape") {
                e.stopPropagation()
                handleSave()
              }
            }}
            placeholder="指示を入力... (Cmd+Enter で保存)"
            rows={3}
            style={{
              width: "100%",
              backgroundColor: theme.inputBg,
              color: theme.textPrimary,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: "8px 10px",
              resize: "vertical",
              fontFamily: theme.fontFamily,
              fontSize: 12,
              lineHeight: 1.5,
              boxSizing: "border-box",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.accent
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.border
            }}
          />

          {/* Save button */}
          <button
            onClick={handleSave}
            style={{
              width: "100%",
              padding: "7px 0",
              backgroundColor: theme.accent,
              color: theme.accentText,
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              fontFamily: theme.fontFamily,
              cursor: "pointer",
              transition: "background-color 0.15s",
              letterSpacing: "0.02em",
            }}>
            Save
          </button>
        </div>
      )}
    </>
  )
}
