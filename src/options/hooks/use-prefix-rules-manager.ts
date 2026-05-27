import { useCallback, useEffect, useState } from "react"

import {
  deletePrefixRule,
  loadPrefixRules,
  normalizePattern,
  savePrefixRules,
  validateRegex,
} from "~lib/prefix-rules"
import type { PrefixRule } from "~lib/types"

export interface RuleDraft {
  pattern: string
  prefix: string
  isRegex: boolean
  error: string
}

const EMPTY_DRAFT: RuleDraft = {
  pattern: "",
  prefix: "",
  isRegex: false,
  error: "",
}

function buildRule(
  draft: Pick<RuleDraft, "pattern" | "prefix" | "isRegex">
): PrefixRule | string {
  const pattern = draft.isRegex
    ? draft.pattern.trim()
    : normalizePattern(draft.pattern)
  const prefix = draft.prefix.trim()

  if (!pattern || !prefix) return "Pattern and prefix are required"

  if (draft.isRegex) {
    const regexErr = validateRegex(pattern)
    if (regexErr) return `Invalid regex: ${regexErr}`
  }

  return { pattern, prefix, isRegex: draft.isRegex }
}

export function usePrefixRulesManager() {
  const [rules, setRules] = useState<PrefixRule[]>([])
  const [addDraft, setAddDraft] = useState<RuleDraft>(EMPTY_DRAFT)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<RuleDraft>(EMPTY_DRAFT)

  useEffect(() => {
    loadPrefixRules().then(setRules)
  }, [])

  const updateAddDraft = useCallback((patch: Partial<RuleDraft>) => {
    setAddDraft((draft) => ({ ...draft, ...patch, error: "" }))
  }, [])

  const addRule = useCallback(async () => {
    const rule = buildRule(addDraft)
    if (typeof rule === "string") {
      setAddDraft((draft) => ({ ...draft, error: rule }))
      return
    }

    if (rules.some((current) => current.pattern === rule.pattern)) {
      setAddDraft((draft) => ({
        ...draft,
        error: "A rule with this pattern already exists",
      }))
      return
    }

    const updated = [...rules, rule]
    await savePrefixRules(updated)
    setRules(updated)
    setAddDraft(EMPTY_DRAFT)
  }, [addDraft, rules])

  const deleteRule = useCallback(
    async (pattern: string) => {
      await deletePrefixRule(pattern)
      setRules(rules.filter((rule) => rule.pattern !== pattern))
    },
    [rules]
  )

  const startEdit = useCallback(
    (idx: number) => {
      const rule = rules[idx]
      setEditingIdx(idx)
      setEditDraft({
        pattern: rule.pattern,
        prefix: rule.prefix,
        isRegex: rule.isRegex ?? false,
        error: "",
      })
    },
    [rules]
  )

  const updateEditDraft = useCallback((patch: Partial<RuleDraft>) => {
    setEditDraft((draft) => ({ ...draft, ...patch }))
  }, [])

  const saveEdit = useCallback(async () => {
    if (editingIdx === null) return

    const rule = buildRule(editDraft)
    if (typeof rule === "string") {
      setEditDraft((draft) => ({ ...draft, error: rule }))
      return
    }

    const duplicate = rules.some(
      (current, idx) => idx !== editingIdx && current.pattern === rule.pattern
    )
    if (duplicate) {
      setEditDraft((draft) => ({
        ...draft,
        error: "A rule with this pattern already exists",
      }))
      return
    }

    const updated = [...rules]
    updated[editingIdx] = rule
    await savePrefixRules(updated)
    setRules(updated)
    setEditingIdx(null)
    setEditDraft(EMPTY_DRAFT)
  }, [editingIdx, editDraft, rules])

  const cancelEdit = useCallback(() => {
    setEditingIdx(null)
    setEditDraft(EMPTY_DRAFT)
  }, [])

  const reorderRule = useCallback(
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

  return {
    rules,
    addDraft,
    editingIdx,
    editDraft,
    updateAddDraft,
    addRule,
    deleteRule,
    startEdit,
    updateEditDraft,
    saveEdit,
    cancelEdit,
    reorderRule,
  }
}
