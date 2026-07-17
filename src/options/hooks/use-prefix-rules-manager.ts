import { useCallback, useEffect, useState } from "react"

import { t } from "~lib/i18n"
import {
  deletePrefixRule,
  loadPrefixRules,
  mergeRules,
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

  if (!pattern || !prefix) return t("options_error_pattern_prefix_required")

  if (draft.isRegex) {
    const regexErr = validateRegex(pattern)
    if (regexErr) return t("options_error_invalid_regex", regexErr)
  }

  return { pattern, prefix, isRegex: draft.isRegex }
}

type Persist = (next: PrefixRule[]) => Promise<void>

function useRulesState() {
  const [rules, setRules] = useState<PrefixRule[]>([])

  useEffect(() => {
    loadPrefixRules().then(setRules)
  }, [])

  const persist = useCallback<Persist>(async (next) => {
    await savePrefixRules(next)
    setRules(next)
  }, [])

  return { rules, setRules, persist }
}

function useAddRule(rules: PrefixRule[], persist: Persist) {
  const [addDraft, setAddDraft] = useState<RuleDraft>(EMPTY_DRAFT)

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
        error: t("options_error_duplicate_pattern"),
      }))
      return
    }
    await persist([...rules, rule])
    setAddDraft(EMPTY_DRAFT)
  }, [addDraft, rules, persist])

  return { addDraft, updateAddDraft, addRule }
}

function useEditRule(rules: PrefixRule[], persist: Persist) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<RuleDraft>(EMPTY_DRAFT)

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
        error: t("options_error_duplicate_pattern"),
      }))
      return
    }

    const updated = [...rules]
    updated[editingIdx] = rule
    await persist(updated)
    setEditingIdx(null)
    setEditDraft(EMPTY_DRAFT)
  }, [editingIdx, editDraft, rules, persist])

  const cancelEdit = useCallback(() => {
    setEditingIdx(null)
    setEditDraft(EMPTY_DRAFT)
  }, [])

  return {
    editingIdx,
    setEditingIdx,
    editDraft,
    startEdit,
    updateEditDraft,
    saveEdit,
    cancelEdit,
  }
}

export function usePrefixRulesManager() {
  const { rules, setRules, persist } = useRulesState()
  const add = useAddRule(rules, persist)
  const edit = useEditRule(rules, persist)

  const deleteRule = useCallback(
    async (pattern: string) => {
      await deletePrefixRule(pattern)
      setRules((current) => current.filter((rule) => rule.pattern !== pattern))
    },
    [setRules]
  )

  const importRules = useCallback(
    async (imported: PrefixRule[]) => {
      const merged = mergeRules(rules, imported)
      await persist(merged)
      return merged
    },
    [rules, persist]
  )

  const reorderRule = useCallback(
    async (idx: number, direction: "up" | "down") => {
      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= rules.length) return

      const updated = [...rules]
      ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
      await persist(updated)

      if (edit.editingIdx === idx) edit.setEditingIdx(newIdx)
      else if (edit.editingIdx === newIdx) edit.setEditingIdx(idx)
    },
    [rules, persist, edit]
  )

  return {
    rules,
    addDraft: add.addDraft,
    editingIdx: edit.editingIdx,
    editDraft: edit.editDraft,
    updateAddDraft: add.updateAddDraft,
    addRule: add.addRule,
    deleteRule,
    startEdit: edit.startEdit,
    updateEditDraft: edit.updateEditDraft,
    saveEdit: edit.saveEdit,
    cancelEdit: edit.cancelEdit,
    reorderRule,
    importRules,
  }
}
