import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"

import {
  deletePrefixRule,
  loadPrefixRules,
  mergeRules,
  normalizePattern,
  parseRules,
  savePrefixRules,
  serializeRules,
  validateRegex,
} from "~lib/prefix-rules"
import { darkTheme, lightTheme, type Theme, type ThemeMode } from "~lib/theme"
import type { PrefixRule } from "~lib/types"

const THEME_KEY = "tegakariTheme"

function useStoredTheme(): { theme: Theme; mode: ThemeMode; toggleMode: () => void } {
  const [mode, setMode] = useState<ThemeMode>("dark")

  useEffect(() => {
    chrome.storage.local.get(THEME_KEY, (result) => {
      if (result[THEME_KEY] === "light") setMode("light")
    })
  }, [])

  const toggleMode = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark"
    setMode(next)
    chrome.storage.local.set({ [THEME_KEY]: next })
  }, [mode])

  return { theme: mode === "dark" ? darkTheme : lightTheme, mode, toggleMode }
}

export default function OptionsPage() {
  const { theme } = useStoredTheme()
  const [rules, setRules] = useState<PrefixRule[]>([])
  const [newPattern, setNewPattern] = useState("")
  const [newPrefix, setNewPrefix] = useState("")
  const [newIsRegex, setNewIsRegex] = useState(false)
  const [error, setError] = useState("")
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editPattern, setEditPattern] = useState("")
  const [editPrefix, setEditPrefix] = useState("")
  const [editIsRegex, setEditIsRegex] = useState(false)
  const [editError, setEditError] = useState("")
  const [ioMessage, setIoMessage] = useState<
    { tone: "success" | "warning" | "error"; text: string } | null
  >(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPrefixRules().then(setRules)
  }, [])

  const handleExport = useCallback(() => {
    const text = serializeRules(rules)
    const blob = new Blob([text], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    a.download = `tegakari-prefix-rules-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setIoMessage({
      tone: "success",
      text: `Exported ${rules.length} rule(s).`,
    })
  }, [rules])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Reset the input so the user can re-import the same file later.
      event.target.value = ""
      if (!file) return

      let text: string
      try {
        text = await file.text()
      } catch (e) {
        setIoMessage({
          tone: "error",
          text: `Failed to read file: ${(e as Error).message}`,
        })
        return
      }

      const { rules: imported, errors } = parseRules(text)
      if (imported.length === 0) {
        setIoMessage({
          tone: "error",
          text: `Import failed. ${errors.join("; ") || "No valid rules found."}`,
        })
        return
      }

      const merged = mergeRules(rules, imported)
      await savePrefixRules(merged)
      setRules(merged)
      setIoMessage({
        tone: errors.length > 0 ? "warning" : "success",
        text:
          errors.length > 0
            ? `Imported ${imported.length} rule(s); skipped ${errors.length}: ${errors.join("; ")}`
            : `Imported ${imported.length} rule(s).`,
      })
    },
    [rules]
  )

  const handleAdd = useCallback(async () => {
    // Host-mode patterns are normalized so users can paste full URLs and
    // still get a working rule. Regex patterns are taken verbatim.
    const pattern = newIsRegex
      ? newPattern.trim()
      : normalizePattern(newPattern)
    const prefix = newPrefix.trim()
    if (!pattern || !prefix) {
      setError("Pattern and prefix are required")
      return
    }
    if (newIsRegex) {
      const regexErr = validateRegex(pattern)
      if (regexErr) {
        setError(`Invalid regex: ${regexErr}`)
        return
      }
    }
    if (rules.some((r) => r.pattern === pattern)) {
      setError("A rule with this pattern already exists")
      return
    }
    const updated = [...rules, { pattern, prefix, isRegex: newIsRegex }]
    await savePrefixRules(updated)
    setRules(updated)
    setNewPattern("")
    setNewPrefix("")
    setNewIsRegex(false)
    setError("")
  }, [newPattern, newPrefix, newIsRegex, rules])

  const handleDelete = useCallback(
    async (pattern: string) => {
      await deletePrefixRule(pattern)
      setRules(rules.filter((r) => r.pattern !== pattern))
    },
    [rules]
  )

  const startEdit = useCallback(
    (idx: number) => {
      const rule = rules[idx]
      setEditingIdx(idx)
      setEditPattern(rule.pattern)
      setEditPrefix(rule.prefix)
      setEditIsRegex(rule.isRegex ?? false)
      setEditError("")
    },
    [rules]
  )

  const handleSaveEdit = useCallback(async () => {
    if (editingIdx === null) return
    const pattern = editIsRegex
      ? editPattern.trim()
      : normalizePattern(editPattern)
    const prefix = editPrefix.trim()
    if (!pattern || !prefix) {
      setEditError("Pattern and prefix are required")
      return
    }
    if (editIsRegex) {
      const regexErr = validateRegex(pattern)
      if (regexErr) {
        setEditError(`Invalid regex: ${regexErr}`)
        return
      }
    }
    const duplicate = rules.some(
      (r, i) => i !== editingIdx && r.pattern === pattern
    )
    if (duplicate) {
      setEditError("A rule with this pattern already exists")
      return
    }
    const updated = [...rules]
    updated[editingIdx] = { pattern, prefix, isRegex: editIsRegex }
    await savePrefixRules(updated)
    setRules(updated)
    setEditingIdx(null)
    setEditError("")
  }, [editingIdx, editPattern, editPrefix, editIsRegex, rules])

  const handleCancelEdit = useCallback(() => {
    setEditingIdx(null)
    setEditError("")
  }, [])

  const handleReorder = useCallback(
    async (idx: number, direction: "up" | "down") => {
      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= rules.length) return
      const updated = [...rules]
      ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
      await savePrefixRules(updated)
      setRules(updated)
      if (editingIdx === idx) setEditingIdx(newIdx)
      else if (editingIdx === newIdx) setEditingIdx(idx)
    },
    [rules, editingIdx]
  )

  const inputStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: "8px 12px",
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: theme.fontMono,
    outline: "none",
    boxSizing: "border-box",
    ...extra,
  })

  const btnStyle = (
    bg: string,
    color: string,
    extra?: React.CSSProperties
  ): React.CSSProperties => ({
    padding: "8px 16px",
    backgroundColor: bg,
    color,
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    ...extra,
  })

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.textPrimary,
        fontFamily: theme.fontFamily,
        padding: "40px 0",
      }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: theme.accent,
            marginBottom: 4,
          }}>
          tegakari
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 24,
          }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: theme.textMuted,
              margin: 0,
            }}>
            Prefix Rules
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleImportClick}
              style={btnStyle(theme.inputBg, theme.textPrimary, {
                border: `1px solid ${theme.border}`,
                padding: "6px 12px",
                fontSize: 12,
              })}
              title="Import rules from a JSON file (existing rules with the same pattern will be overwritten)">
              Import
            </button>
            <button
              onClick={handleExport}
              disabled={rules.length === 0}
              style={btnStyle(theme.inputBg, theme.textPrimary, {
                border: `1px solid ${theme.border}`,
                padding: "6px 12px",
                fontSize: 12,
                opacity: rules.length === 0 ? 0.5 : 1,
                cursor: rules.length === 0 ? "not-allowed" : "pointer",
              })}
              title="Download all rules as JSON">
              Export
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportFile}
            />
          </div>
        </div>
        {ioMessage && (
          <div
            role="status"
            onClick={() => setIoMessage(null)}
            style={{
              marginBottom: 16,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
              backgroundColor:
                ioMessage.tone === "error"
                  ? "rgba(220,70,70,0.15)"
                  : ioMessage.tone === "warning"
                    ? "rgba(220,170,70,0.15)"
                    : theme.accentMuted,
              color:
                ioMessage.tone === "error" ? "#d44" : theme.textPrimary,
              border: `1px solid ${
                ioMessage.tone === "error"
                  ? "#d44"
                  : ioMessage.tone === "warning"
                    ? "#ca6"
                    : theme.accent
              }`,
              whiteSpace: "pre-wrap",
            }}>
            {ioMessage.text}
          </div>
        )}
        <p
          style={{
            fontSize: 13,
            color: theme.textSecondary,
            lineHeight: 1.6,
            marginBottom: 24,
          }}>
          URL patterns are matched against the hostname (e.g.,{" "}
          <code style={{ backgroundColor: theme.codeBg, padding: "1px 5px", borderRadius: 4, fontFamily: theme.fontMono }}>
            localhost:3000
          </code>
          ). Enable regex to match against the full URL. Rules are evaluated
          top-to-bottom; first match wins.
        </p>

        {/* Rule list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            marginBottom: 24,
          }}>
          {rules.length === 0 && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: theme.textMuted,
                fontSize: 13,
                border: `1px dashed ${theme.border}`,
                borderRadius: 10,
              }}>
              No rules yet. Add one below.
            </div>
          )}

          {rules.map((rule, idx) => (
            <div
              key={rule.pattern}
              style={{
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 4,
              }}>
              {editingIdx === idx ? (
                /* Edit mode */
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={editPattern}
                      onChange={(e) => setEditPattern(e.target.value)}
                      placeholder="Pattern"
                      style={inputStyle({ flex: 1 })}
                    />
                    <input
                      value={editPrefix}
                      onChange={(e) => setEditPrefix(e.target.value)}
                      placeholder="Prefix"
                      style={inputStyle({ flex: 1 })}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: theme.textMuted,
                        cursor: "pointer",
                      }}>
                      <input
                        type="checkbox"
                        checked={editIsRegex}
                        onChange={(e) => setEditIsRegex(e.target.checked)}
                        style={{ accentColor: theme.accent }}
                      />
                      Regex
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={handleCancelEdit}
                        style={btnStyle("transparent", theme.textMuted, {
                          border: `1px solid ${theme.border}`,
                          padding: "6px 12px",
                          fontSize: 12,
                        })}>
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        style={btnStyle(theme.accent, theme.accentText, {
                          padding: "6px 12px",
                          fontSize: 12,
                        })}>
                        Save
                      </button>
                    </div>
                  </div>
                  {editError && (
                    <div style={{ fontSize: 12, color: theme.danger }}>
                      {editError}
                    </div>
                  )}
                </div>
              ) : (
                /* View mode */
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                  {/* Reorder buttons */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      flexShrink: 0,
                    }}>
                    <button
                      onClick={() => handleReorder(idx, "up")}
                      disabled={idx === 0}
                      style={{
                        background: "none",
                        border: "none",
                        color: idx === 0 ? theme.border : theme.textMuted,
                        cursor: idx === 0 ? "default" : "pointer",
                        fontSize: 10,
                        padding: 0,
                        lineHeight: 1,
                      }}>
                      ▲
                    </button>
                    <button
                      onClick={() => handleReorder(idx, "down")}
                      disabled={idx === rules.length - 1}
                      style={{
                        background: "none",
                        border: "none",
                        color:
                          idx === rules.length - 1
                            ? theme.border
                            : theme.textMuted,
                        cursor:
                          idx === rules.length - 1 ? "default" : "pointer",
                        fontSize: 10,
                        padding: 0,
                        lineHeight: 1,
                      }}>
                      ▼
                    </button>
                  </div>

                  {/* Pattern */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 2,
                      }}>
                      <code
                        style={{
                          backgroundColor: theme.codeBg,
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontFamily: theme.fontMono,
                          border: `1px solid ${theme.border}`,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                        {rule.pattern}
                      </code>
                      {rule.isRegex && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: theme.accent,
                            backgroundColor: theme.accentMuted,
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}>
                          regex
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: theme.textSecondary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                      → {rule.prefix}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(idx)}
                      style={{
                        background: "none",
                        border: `1px solid ${theme.border}`,
                        borderRadius: 6,
                        color: theme.textMuted,
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "4px 8px",
                      }}>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rule.pattern)}
                      style={{
                        background: "none",
                        border: `1px solid ${theme.border}`,
                        borderRadius: 6,
                        color: theme.danger,
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "4px 8px",
                      }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new rule */}
        <div
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "16px",
          }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.textPrimary,
              marginBottom: 12,
            }}>
            Add Rule
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={newPattern}
              onChange={(e) => {
                setNewPattern(e.target.value)
                setError("")
              }}
              placeholder={
                newIsRegex
                  ? "https?://example\\.com/.*"
                  : "example.com  (URLを貼ってもOK)"
              }
              style={inputStyle({ flex: 1 })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
            />
            <input
              value={newPrefix}
              onChange={(e) => {
                setNewPrefix(e.target.value)
                setError("")
              }}
              placeholder="[repo=my-app]"
              style={inputStyle({ flex: 1 })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: theme.textMuted,
                cursor: "pointer",
              }}>
              <input
                type="checkbox"
                checked={newIsRegex}
                onChange={(e) => setNewIsRegex(e.target.checked)}
                style={{ accentColor: theme.accent }}
              />
              Regex (match against full URL)
            </label>
            <button
              onClick={handleAdd}
              style={btnStyle(theme.accent, theme.accentText)}>
              Add
            </button>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: theme.danger, marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>

        {/* Examples */}
        <div
          style={{
            marginTop: 32,
            fontSize: 12,
            color: theme.textMuted,
            lineHeight: 1.8,
          }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: theme.textSecondary }}>
            Examples
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 12px 4px 0", color: theme.textSecondary }}>
                  Pattern
                </th>
                <th style={{ textAlign: "left", padding: "4px 12px 4px 0", color: theme.textSecondary }}>
                  Type
                </th>
                <th style={{ textAlign: "left", padding: "4px 0", color: theme.textSecondary }}>
                  Matches
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["localhost:3000", "Host", "http://localhost:3000/*"],
                ["example.com", "Host", "*.example.com/*"],
                ["https?://staging\\.example\\.com/app/.*", "Regex", "Staging app pages"],
                ["vercel\\.app", "Regex", "Any Vercel deployment"],
              ].map(([pattern, type, matches]) => (
                <tr key={pattern}>
                  <td style={{ padding: "4px 12px 4px 0" }}>
                    <code
                      style={{
                        backgroundColor: theme.codeBg,
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontFamily: theme.fontMono,
                        fontSize: 11,
                      }}>
                      {pattern}
                    </code>
                  </td>
                  <td style={{ padding: "4px 12px 4px 0" }}>{type}</td>
                  <td style={{ padding: "4px 0" }}>{matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
