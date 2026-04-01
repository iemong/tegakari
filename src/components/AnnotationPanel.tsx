import { useCallback, useEffect, useRef, useState } from "react"

import { generateBatchJsonl } from "~lib/jsonl-generator"
import { generateBatchMarkdown } from "~lib/markdown-generator"
import {
  extractHost,
  findMatchingPrefix,
  loadPrefixRules,
  upsertPrefixRule,
} from "~lib/prefix-rules"
import { useTheme } from "~lib/theme"
import type { Annotation, OutputFormat } from "~lib/types"

interface Props {
  annotations: Annotation[]
  activeAnnotationId: number | null
  onSelectAnnotation: (id: number) => void
  onUpdateInstruction: (id: number, instruction: string) => void
  onDeleteAnnotation: (id: number) => void
  onClose: () => void
}

// Simple SVG icons for theme toggle
function SunIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function AnnotationPanel({
  annotations,
  activeAnnotationId,
  onSelectAnnotation,
  onUpdateInstruction,
  onDeleteAnnotation,
  onClose,
}: Props) {
  const { theme, mode, toggleMode } = useTheme()
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jsonl")
  const [copied, setCopied] = useState(false)
  const [prefix, setPrefix] = useState("")
  const [rememberPrefix, setRememberPrefix] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const currentHost = extractHost(location.href)

  // Load saved prefix rule for current host on mount
  useEffect(() => {
    loadPrefixRules().then((rules) => {
      const matched = findMatchingPrefix(rules, location.href)
      if (matched) {
        setPrefix(matched)
        setRememberPrefix(true)
      }
    })
  }, [])

  // Save/update prefix rule when rememberPrefix is toggled or prefix changes
  const handlePrefixBlur = useCallback(() => {
    if (rememberPrefix && prefix.trim() && currentHost) {
      upsertPrefixRule({ pattern: currentHost, prefix: prefix.trim() })
    }
  }, [rememberPrefix, prefix, currentHost])

  const handleRememberToggle = useCallback(() => {
    const next = !rememberPrefix
    setRememberPrefix(next)
    if (next && prefix.trim() && currentHost) {
      upsertPrefixRule({ pattern: currentHost, prefix: prefix.trim() })
    }
  }, [rememberPrefix, prefix, currentHost])

  const buildOutput = useCallback(() => {
    const input = {
      pageUrl: location.href,
      pageTitle: document.title,
      annotations,
      prefix: prefix.trim() || undefined,
    }
    return outputFormat === "jsonl"
      ? generateBatchJsonl(input)
      : generateBatchMarkdown(input)
  }, [annotations, outputFormat, prefix])

  const handleCopy = useCallback(async () => {
    const output = buildOutput()
    try {
      await navigator.clipboard.writeText(output)
    } catch {
      try {
        const textarea = document.createElement("textarea")
        textarea.value = output
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      } catch {
        // silently fail
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [buildOutput])

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        width: 360,
        maxHeight: "calc(100vh - 32px)",
        backgroundColor: theme.surface,
        color: theme.textPrimary,
        borderRadius: 14,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: theme.fontFamily,
        fontSize: 13,
        pointerEvents: "auto",
        zIndex: 2147483647,
      }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: theme.accent,
              letterSpacing: "-0.02em",
            }}>
            tegakari
          </span>
          {annotations.length > 0 && (
            <span
              style={{
                width: 20,
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                color: theme.accentText,
                backgroundColor: theme.accent,
                borderRadius: "50%",
                fontFamily: theme.fontMono,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
              {annotations.length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleMode}
            style={{
              background: "none",
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              padding: "4px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 0.15s",
            }}
            title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {mode === "dark" ? (
              <SunIcon color={theme.textMuted} />
            ) : (
              <MoonIcon color={theme.textMuted} />
            )}
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              color: theme.textMuted,
              cursor: "pointer",
              fontSize: 16,
              padding: "2px 7px",
              lineHeight: 1,
              transition: "border-color 0.15s, color 0.15s",
            }}>
            ×
          </button>
        </div>
      </div>

      {/* Annotation list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 0",
        }}>
        {annotations.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: theme.textMuted,
              fontSize: 12,
              lineHeight: 1.6,
            }}>
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>+</div>
            Click elements on the page to annotate
          </div>
        ) : (
          annotations.map((annotation) => {
            const isSelected = activeAnnotationId === annotation.id
            return (
              <div
                key={annotation.id}
                onClick={() => onSelectAnnotation(annotation.id)}
                style={{
                  padding: "10px 16px",
                  margin: "2px 6px",
                  borderRadius: 8,
                  backgroundColor: isSelected ? theme.activeRowBg : "transparent",
                  borderLeft: isSelected
                    ? `3px solid ${theme.activeIndicator}`
                    : "3px solid transparent",
                  cursor: "pointer",
                  transition: "background-color 0.12s",
                }}>
                {/* Annotation header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: isSelected
                        ? theme.pinActiveBg
                        : theme.pinBg,
                      color: isSelected
                        ? theme.pinActiveText
                        : theme.pinText,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: theme.fontMono,
                      flexShrink: 0,
                      transition: "background-color 0.15s",
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
                      {annotation.elementInfo.text.slice(0, 20)}
                      {annotation.elementInfo.text.length > 20 ? "..." : ""}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteAnnotation(annotation.id)
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.textMuted,
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "0 2px",
                      lineHeight: 1,
                      flexShrink: 0,
                      opacity: 0.6,
                      transition: "opacity 0.12s, color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1"
                      e.currentTarget.style.color = theme.danger
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0.6"
                      e.currentTarget.style.color = theme.textMuted
                    }}>
                    ×
                  </button>
                </div>

                {/* Instruction textarea */}
                <textarea
                  value={annotation.instruction}
                  onChange={(e) =>
                    onUpdateInstruction(annotation.id, e.target.value)
                  }
                  onClick={(e) => e.stopPropagation()}
                  placeholder="指示を入力..."
                  rows={2}
                  style={{
                    width: "100%",
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 8,
                    padding: "7px 10px",
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
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {annotations.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${theme.border}`,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
          }}>
          {/* Prefix input */}
          <div>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              onBlur={handlePrefixBlur}
              placeholder="Prefix (e.g., [repo=my-app])"
              style={{
                width: "100%",
                padding: "7px 10px",
                backgroundColor: theme.inputBg,
                color: theme.textPrimary,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                fontSize: 12,
                fontFamily: theme.fontMono,
                boxSizing: "border-box",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.accent
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = theme.border
              }}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
                fontSize: 11,
                color: theme.textMuted,
                cursor: "pointer",
                userSelect: "none",
              }}>
              <input
                type="checkbox"
                checked={rememberPrefix}
                onChange={handleRememberToggle}
                style={{
                  accentColor: theme.accent,
                  margin: 0,
                  cursor: "pointer",
                }}
              />
              Remember for {currentHost}
            </label>
          </div>

          {/* Format toggle */}
          <div
            style={{
              display: "flex",
              gap: 0,
              backgroundColor: theme.inputBg,
              borderRadius: 8,
              padding: 3,
              border: `1px solid ${theme.border}`,
            }}>
            {(["jsonl", "markdown"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setOutputFormat(fmt)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  backgroundColor:
                    outputFormat === fmt ? theme.surface : "transparent",
                  color:
                    outputFormat === fmt ? theme.textPrimary : theme.textMuted,
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 11,
                  fontFamily: theme.fontFamily,
                  cursor: "pointer",
                  transition: "background-color 0.15s, color 0.15s",
                  boxShadow:
                    outputFormat === fmt
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                  letterSpacing: "0.02em",
                }}>
                {fmt === "jsonl" ? "JSONL" : "Markdown"}
              </button>
            ))}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              width: "100%",
              padding: "10px 0",
              backgroundColor: copied ? theme.success : theme.accent,
              color: copied ? theme.successText : theme.accentText,
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              fontFamily: theme.fontFamily,
              cursor: "pointer",
              transition: "background-color 0.2s",
              letterSpacing: "0.01em",
            }}>
            {copied
              ? "Copied!"
              : `Copy All (${annotations.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
