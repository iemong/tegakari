import { useEffect, useRef, useState } from "react"

import type { Annotation, StyleDelta } from "~lib/types"

/**
 * Local draft state for a pin popover: instruction text, tag selection and
 * style-tweak delta, all reset from the annotation whenever the popover
 * opens/closes (mirroring the pre-existing instruction/tags draft pattern).
 */
export function useAnnotationDraft(annotation: Annotation, isActive: boolean) {
  const [draft, setDraft] = useState(annotation.instruction)
  const [draftTags, setDraftTags] = useState<string[]>(annotation.tags ?? [])
  const [draftStyleDelta, setDraftStyleDelta] = useState<StyleDelta[] | undefined>(
    annotation.styleDelta
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const reset = () => {
    setDraft(annotation.instruction)
    setDraftTags(annotation.tags ?? [])
    setDraftStyleDelta(annotation.styleDelta)
  }

  useEffect(() => {
    if (!isActive) reset()
  }, [annotation.instruction, annotation.tags, annotation.styleDelta, isActive])

  useEffect(() => {
    if (isActive) {
      reset()
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [isActive, annotation.instruction, annotation.tags, annotation.styleDelta])

  const onToggleTag = (id: string) => {
    setDraftTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  return {
    draft,
    setDraft,
    draftTags,
    onToggleTag,
    draftStyleDelta,
    setDraftStyleDelta,
    textareaRef,
  }
}
