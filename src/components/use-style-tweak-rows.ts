import { useCallback, useEffect, useRef, useState } from "react"

import {
  STYLE_TWEAK_PROPERTIES,
  applyStylePreview,
  buildStyleDelta,
  getComputedStyleValue,
  nextEditOrder,
  resolveStyleTweakTarget,
  revertAllStylePreviews,
  revertStylePreview,
  type StyleTweakInputKind,
} from "~lib/style-preview"
import type { Annotation, StyleDelta } from "~lib/types"

export interface StyleTweakRowState {
  property: string
  kind: StyleTweakInputKind
  before: string
  value: string
}

interface Args {
  annotation: Annotation
  isActive: boolean
  onChange: (styleDelta: StyleDelta[] | undefined) => void
}

/** Seed one row per `STYLE_TWEAK_PROPERTIES` entry: `before` comes from a saved delta when present, else a fresh computed read. */
export function seedRows(annotation: Annotation, element: Element | null): StyleTweakRowState[] {
  const saved = annotation.styleDelta ?? []
  return STYLE_TWEAK_PROPERTIES.map(({ property, kind }) => {
    const savedDelta = saved.find((d) => d.property === property)
    const before =
      savedDelta?.before ?? (element ? getComputedStyleValue(element, property) : "")
    return { property, kind, before, value: savedDelta?.after ?? before }
  })
}

/**
 * Row state + DOM wiring for the "Adjust styles" panel: seeds rows (from a
 * saved `styleDelta` or a fresh computed read) whenever a popover opens,
 * applies/reverts a live inline-style preview as the user edits, and reports
 * the resulting `styleDelta` back up via `onChange` on every change so the
 * popover's Save button always has the latest draft ready.
 */
export function useStyleTweakRows({ annotation, isActive, onChange }: Args) {
  const [rows, setRows] = useState<StyleTweakRowState[]>([])
  const editOrderRef = useRef<string[]>([])
  const elementRef = useRef<Element | null>(null)

  // Re-seed only when a different annotation opens — not on every prop
  // update, since async framework/screenshot results replace the annotation
  // object identity while a popover is open and must not clobber in-progress edits.
  useEffect(() => {
    if (!isActive) return
    elementRef.current = resolveStyleTweakTarget(annotation.elementInfo.selector)
    editOrderRef.current = (annotation.styleDelta ?? []).map((d) => d.property)
    setRows(seedRows(annotation, elementRef.current))
  }, [annotation.id, isActive])

  // `commit` runs from DOM event handlers only (never from inside a setState
  // updater), so calling `onChange` — another hook's setState — alongside
  // `setRows` here is a plain, safe sibling call, not a render-phase update.
  const commit = useCallback(
    (next: StyleTweakRowState[]) => {
      setRows(next)
      onChange(buildStyleDelta(next, editOrderRef.current))
    },
    [onChange]
  )

  const updateValue = useCallback(
    (property: string, value: string) => {
      const element = elementRef.current
      if (element) applyStylePreview(element, property, value)
      commit(
        rows.map((row) => {
          if (row.property !== property) return row
          editOrderRef.current = nextEditOrder(editOrderRef.current, property, value !== row.before)
          return { ...row, value }
        })
      )
    },
    [commit, rows]
  )

  const resetRow = useCallback(
    (property: string) => {
      const element = elementRef.current
      if (element) revertStylePreview(element, property)
      editOrderRef.current = nextEditOrder(editOrderRef.current, property, false)
      commit(
        rows.map((row) => (row.property === property ? { ...row, value: row.before } : row))
      )
    },
    [commit, rows]
  )

  const resetAll = useCallback(() => {
    const element = elementRef.current
    if (element) revertAllStylePreviews(element)
    editOrderRef.current = []
    commit(rows.map((row) => ({ ...row, value: row.before })))
  }, [commit, rows])

  return { rows, updateValue, resetRow, resetAll }
}
