import { useCallback, useEffect, useState } from "react"

import { t } from "~lib/i18n"
import {
  createTemplateId,
  deleteOutputTemplate,
  loadOutputTemplates,
  MAX_OUTPUT_TEMPLATES,
  mergeOutputTemplates,
  type OutputTemplate,
  saveOutputTemplates,
} from "~lib/output-templates"

export interface TemplateDraft {
  name: string
  header: string
  annotation: string
  error: string
}

const EMPTY_DRAFT: TemplateDraft = {
  name: "",
  header: "",
  annotation: "",
  error: "",
}

function buildTemplate(
  id: string,
  draft: Pick<TemplateDraft, "name" | "header" | "annotation">
): OutputTemplate | string {
  const name = draft.name.trim()
  if (!name) return t("options_templates_error_name_required")
  return { id, name, header: draft.header, annotation: draft.annotation }
}

type Persist = (next: OutputTemplate[]) => Promise<void>

function useTemplatesState() {
  const [templates, setTemplates] = useState<OutputTemplate[]>([])

  useEffect(() => {
    loadOutputTemplates().then(setTemplates)
  }, [])

  const persist = useCallback<Persist>(async (next) => {
    await saveOutputTemplates(next)
    setTemplates(next)
  }, [])

  return { templates, setTemplates, persist }
}

function useAddTemplate(templates: OutputTemplate[], persist: Persist) {
  const [addDraft, setAddDraft] = useState<TemplateDraft>(EMPTY_DRAFT)

  const updateAddDraft = useCallback((patch: Partial<TemplateDraft>) => {
    setAddDraft((draft) => ({ ...draft, ...patch, error: "" }))
  }, [])

  const addTemplate = useCallback(async () => {
    if (templates.length >= MAX_OUTPUT_TEMPLATES) {
      setAddDraft((draft) => ({
        ...draft,
        error: t("options_templates_error_limit_reached", String(MAX_OUTPUT_TEMPLATES)),
      }))
      return
    }

    const template = buildTemplate(createTemplateId(), addDraft)
    if (typeof template === "string") {
      setAddDraft((draft) => ({ ...draft, error: template }))
      return
    }
    await persist([...templates, template])
    setAddDraft(EMPTY_DRAFT)
  }, [addDraft, templates, persist])

  return { addDraft, updateAddDraft, addTemplate }
}

function useEditTemplate(templates: OutputTemplate[], persist: Persist) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<TemplateDraft>(EMPTY_DRAFT)

  const startEdit = useCallback(
    (idx: number) => {
      const template = templates[idx]
      setEditingIdx(idx)
      setEditDraft({
        name: template.name,
        header: template.header,
        annotation: template.annotation,
        error: "",
      })
    },
    [templates]
  )

  const updateEditDraft = useCallback((patch: Partial<TemplateDraft>) => {
    setEditDraft((draft) => ({ ...draft, ...patch, error: "" }))
  }, [])

  const saveEdit = useCallback(async () => {
    if (editingIdx === null) return

    const existing = templates[editingIdx]
    const template = buildTemplate(existing.id, editDraft)
    if (typeof template === "string") {
      setEditDraft((draft) => ({ ...draft, error: template }))
      return
    }

    const updated = [...templates]
    updated[editingIdx] = template
    await persist(updated)
    setEditingIdx(null)
    setEditDraft(EMPTY_DRAFT)
  }, [editingIdx, editDraft, templates, persist])

  const cancelEdit = useCallback(() => {
    setEditingIdx(null)
    setEditDraft(EMPTY_DRAFT)
  }, [])

  return {
    editingIdx,
    editDraft,
    startEdit,
    updateEditDraft,
    saveEdit,
    cancelEdit,
  }
}

export function useOutputTemplatesManager() {
  const { templates, setTemplates, persist } = useTemplatesState()
  const add = useAddTemplate(templates, persist)
  const edit = useEditTemplate(templates, persist)

  const removeTemplate = useCallback(
    async (id: string) => {
      await deleteOutputTemplate(id)
      setTemplates((current) => current.filter((template) => template.id !== id))
    },
    [setTemplates]
  )

  const importTemplates = useCallback(
    async (imported: OutputTemplate[]) => {
      const merged = mergeOutputTemplates(templates, imported)
      // Cap here (not just inside saveOutputTemplates) so the in-memory
      // state handed back to the caller — and used for the "Imported N"
      // message — matches exactly what was actually persisted. Relying on
      // saveOutputTemplates' own cap alone would leave `templates` (React
      // state) holding more entries than storage, silently losing the tail
      // on the next reload.
      const capped = merged.slice(0, MAX_OUTPUT_TEMPLATES)
      const overflowCount = merged.length - capped.length
      await persist(capped)
      return { templates: capped, overflowCount }
    },
    [templates, persist]
  )

  return {
    templates,
    addDraft: add.addDraft,
    editingIdx: edit.editingIdx,
    editDraft: edit.editDraft,
    updateAddDraft: add.updateAddDraft,
    addTemplate: add.addTemplate,
    removeTemplate,
    startEdit: edit.startEdit,
    updateEditDraft: edit.updateEditDraft,
    saveEdit: edit.saveEdit,
    cancelEdit: edit.cancelEdit,
    importTemplates,
  }
}
