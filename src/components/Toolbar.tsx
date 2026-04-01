import { useCallback, useEffect, useRef, useState } from "react"

import { generateBatchJsonl } from "~lib/jsonl-generator"
import { generateBatchMarkdown } from "~lib/markdown-generator"
import { findMatchingPrefix, loadPrefixRules } from "~lib/prefix-rules"
import { useTheme } from "~lib/theme"
import type { Annotation, AnnotationStatus, OutputFormat, PageMetadata } from "~lib/types"

interface Props {
  annotations: Annotation[]
  activeAnnotationId: number | null
  metadata: PageMetadata | null
  onSelectAnnotation: (id: number) => void
  onUpdateInstruction: (id: number, instruction: string) => void
  onDeleteAnnotation: (id: number) => void
  onArchiveAnnotation: (id: number) => void
  onUnarchiveAnnotation: (id: number) => void
  onClearAll: () => void
  onClearArchived: () => void
  onClose: () => void
}

// Icons
function SearchIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function InboxIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function CopyIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ArchiveIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

function TrashIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function UndoIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

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

type InboxTab = "default" | "archived"

export default function Toolbar({
  annotations,
  activeAnnotationId,
  metadata,
  onSelectAnnotation,
  onUpdateInstruction,
  onDeleteAnnotation,
  onArchiveAnnotation,
  onUnarchiveAnnotation,
  onClearAll,
  onClearArchived,
  onClose,
}: Props) {
  const { theme, mode, toggleMode } = useTheme()
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxTab, setInboxTab] = useState<InboxTab>("default")
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jsonl")
  const [copied, setCopied] = useState(false)
  const [prefix, setPrefix] = useState("")
  const [matchedPrefix, setMatchedPrefix] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const defaultAnnotations = annotations.filter((a) => a.status === "default")
  const archivedAnnotations = annotations.filter((a) => a.status === "archived")
  const visibleAnnotations = inboxTab === "default" ? defaultAnnotations : archivedAnnotations

  // Load prefix rules
  useEffect(() => {
    loadPrefixRules().then((rules) => {
      const matched = findMatchingPrefix(rules, location.href)
      if (matched) {
        setPrefix(matched)
        setMatchedPrefix(matched)
      }
    })
  }, [])

  useEffect(() => {
    const listener = () => {
      loadPrefixRules().then((rules) => {
        const matched = findMatchingPrefix(rules, location.href)
        setMatchedPrefix(matched)
        if (matched) setPrefix(matched)
        else setPrefix("")
      })
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const openOptions = useCallback(() => {
    chrome.runtime.sendMessage({ type: "TEGAKARI_OPEN_OPTIONS" })
  }, [])

  const buildOutput = useCallback(() => {
    const input = {
      pageUrl: location.href,
      pageTitle: document.title,
      annotations: defaultAnnotations,
      prefix: prefix.trim() || undefined,
      metadata: metadata ?? undefined,
    }
    return outputFormat === "jsonl"
      ? generateBatchJsonl(input)
      : generateBatchMarkdown(input)
  }, [defaultAnnotations, outputFormat, prefix, metadata])

  const handleCopy = useCallback(async () => {
    if (defaultAnnotations.length === 0) return
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
  }, [buildOutput, defaultAnnotations.length])

  const handleClearAll = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    onClearAll()
    setConfirmClear(false)
  }, [confirmClear, onClearAll])

  const btnBase: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    borderRadius: 8,
    transition: "background-color 0.12s",
  }

  return (
    <>
      {/* Bottom toolbar */}
      <div
        ref={toolbarRef}
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "4px 6px",
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 50,
          boxShadow: theme.shadowStrong,
          fontFamily: theme.fontFamily,
          fontSize: 13,
          pointerEvents: "auto",
          zIndex: 2147483647,
          userSelect: "none",
        }}>
        {/* Logo */}
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            color: theme.accent,
            padding: "0 8px 0 6px",
            letterSpacing: "-0.02em",
          }}>
          tegakari
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 20, backgroundColor: theme.border }} />

        {/* Inbox button */}
        <button
          onClick={() => setInboxOpen(!inboxOpen)}
          style={{
            ...btnBase,
            backgroundColor: inboxOpen ? theme.accentMuted : "transparent",
            position: "relative",
          }}
          title="Inbox">
          <InboxIcon color={inboxOpen ? theme.accent : theme.textMuted} />
          {defaultAnnotations.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 14,
                height: 14,
                fontSize: 9,
                fontWeight: 700,
                color: theme.accentText,
                backgroundColor: theme.accent,
                borderRadius: "50%",
                fontFamily: theme.fontMono,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              {defaultAnnotations.length}
            </span>
          )}
        </button>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          style={{
            ...btnBase,
            backgroundColor: copied ? "rgba(78, 203, 113, 0.15)" : "transparent",
          }}
          title={copied ? "Copied!" : `Copy All (${defaultAnnotations.length})`}>
          <CopyIcon color={copied ? theme.success : theme.textMuted} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, backgroundColor: theme.border }} />

        {/* Format toggle pill */}
        <div
          style={{
            display: "flex",
            backgroundColor: theme.inputBg,
            borderRadius: 50,
            padding: 2,
          }}>
          {(["jsonl", "markdown"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setOutputFormat(fmt)}
              style={{
                padding: "4px 10px",
                backgroundColor: outputFormat === fmt ? theme.surface : "transparent",
                color: outputFormat === fmt ? theme.textPrimary : theme.textMuted,
                border: "none",
                borderRadius: 50,
                fontWeight: 600,
                fontSize: 10,
                fontFamily: theme.fontFamily,
                cursor: "pointer",
                transition: "background-color 0.15s, color 0.15s",
                boxShadow: outputFormat === fmt ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>
              {fmt === "jsonl" ? "JSONL" : "MD"}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, backgroundColor: theme.border }} />

        {/* Theme toggle */}
        <button onClick={toggleMode} style={btnBase} title="Toggle theme">
          {mode === "dark" ? (
            <SunIcon color={theme.textMuted} />
          ) : (
            <MoonIcon color={theme.textMuted} />
          )}
        </button>

        {/* Settings */}
        <button onClick={openOptions} style={btnBase} title="Prefix rules">
          <SettingsIcon color={theme.textMuted} />
        </button>

        {/* Close */}
        <button onClick={onClose} style={btnBase} title="Close tegakari">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Inbox popover */}
      {inboxOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            bottom: 68,
            left: "50%",
            transform: "translateX(-50%)",
            width: 380,
            maxHeight: "60vh",
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 14,
            boxShadow: theme.shadowStrong,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: theme.fontFamily,
            fontSize: 13,
            pointerEvents: "auto",
            zIndex: 2147483646,
          }}>
          {/* Inbox header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: `1px solid ${theme.border}`,
              flexShrink: 0,
            }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, backgroundColor: theme.inputBg, borderRadius: 8, padding: 2 }}>
              {(["default", "archived"] as const).map((tab) => {
                const count = tab === "default" ? defaultAnnotations.length : archivedAnnotations.length
                return (
                  <button
                    key={tab}
                    onClick={() => setInboxTab(tab)}
                    style={{
                      padding: "4px 12px",
                      backgroundColor: inboxTab === tab ? theme.surface : "transparent",
                      color: inboxTab === tab ? theme.textPrimary : theme.textMuted,
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 11,
                      fontFamily: theme.fontFamily,
                      cursor: "pointer",
                      boxShadow: inboxTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}>
                    {tab === "default" ? "Active" : "Archived"}
                    {count > 0 && (
                      <span style={{ marginLeft: 4, opacity: 0.6 }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 4 }}>
              {inboxTab === "archived" && archivedAnnotations.length > 0 && (
                <button
                  onClick={onClearArchived}
                  style={{
                    ...btnBase,
                    padding: "4px 8px",
                    fontSize: 11,
                    color: theme.textMuted,
                    gap: 4,
                  }}
                  title="Clear archived">
                  <TrashIcon color={theme.textMuted} />
                </button>
              )}
              {inboxTab === "default" && defaultAnnotations.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={{
                    ...btnBase,
                    padding: "4px 8px",
                    fontSize: 11,
                    color: confirmClear ? theme.danger : theme.textMuted,
                    gap: 4,
                  }}
                  title={confirmClear ? "Click again to confirm" : "Clear all"}>
                  <TrashIcon color={confirmClear ? theme.danger : theme.textMuted} />
                  {confirmClear && (
                    <span style={{ fontSize: 10, fontWeight: 600 }}>Confirm?</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Prefix row */}
          <div
            style={{
              padding: "8px 16px",
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Prefix (e.g., [repo=my-app])"
              style={{
                flex: 1,
                padding: "5px 10px",
                backgroundColor: theme.inputBg,
                color: theme.textPrimary,
                border: `1px solid ${matchedPrefix ? theme.accent : theme.border}`,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: theme.fontMono,
                boxSizing: "border-box",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = theme.accent }}
              onBlur={(e) => { e.currentTarget.style.borderColor = matchedPrefix ? theme.accent : theme.border }}
            />
          </div>

          {/* Annotation list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 0",
            }}>
            {visibleAnnotations.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: theme.textMuted,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}>
                {inboxTab === "default"
                  ? "Click elements on the page to annotate"
                  : "No archived annotations"}
              </div>
            ) : (
              visibleAnnotations.map((annotation) => {
                const isSelected = activeAnnotationId === annotation.id
                const isArchived = annotation.status === "archived"
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
                      opacity: isArchived ? 0.6 : 1,
                    }}>
                    {/* Header row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: annotation.instruction ? 4 : 0,
                      }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          backgroundColor: isSelected ? theme.pinActiveBg : theme.pinBg,
                          color: isSelected ? theme.pinActiveText : theme.pinText,
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
                          {annotation.elementInfo.text.slice(0, 20)}
                          {annotation.elementInfo.text.length > 20 ? "..." : ""}
                        </span>
                      )}

                      {/* Screenshot thumbnail */}
                      {annotation.screenshot && (
                        <img
                          src={annotation.screenshot}
                          alt=""
                          style={{
                            width: 32,
                            height: 24,
                            borderRadius: 4,
                            objectFit: "cover",
                            border: `1px solid ${theme.border}`,
                            flexShrink: 0,
                          }}
                        />
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        {isArchived ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onUnarchiveAnnotation(annotation.id)
                            }}
                            style={{ ...btnBase, padding: 4 }}
                            title="Restore">
                            <UndoIcon color={theme.textMuted} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onArchiveAnnotation(annotation.id)
                            }}
                            style={{ ...btnBase, padding: 4 }}
                            title="Archive">
                            <ArchiveIcon color={theme.textMuted} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteAnnotation(annotation.id)
                          }}
                          style={{ ...btnBase, padding: 4 }}
                          title="Delete">
                          <TrashIcon color={theme.danger} />
                        </button>
                      </div>
                    </div>

                    {/* Instruction preview */}
                    {annotation.instruction && (
                      <div
                        style={{
                          fontSize: 11,
                          color: theme.textSecondary,
                          marginLeft: 28,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                        {annotation.instruction}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </>
  )
}
