import { useCallback, useState } from "react"

import { useClipboard } from "~hooks/use-clipboard"
import { renderContactSheet } from "~lib/contact-sheet"
import { useTheme } from "~lib/theme"
import type { Annotation } from "~lib/types"

import { ImageIcon } from "./icons"
import { copyButtonStyle } from "./toolbar-styles"

interface Props {
  annotations: Annotation[]
}

/**
 * Copies a contact-sheet image of all annotation screenshots. A separate
 * button from the text copy on purpose: bundling text and image into one
 * ClipboardItem lets image-preferring paste targets drop the text (#21).
 */
export function CopyImageButton({ annotations }: Props) {
  const { theme } = useTheme()
  const { copyImage } = useClipboard()
  const [copied, setCopied] = useState(false)

  const shotCount = annotations.filter((a) => a.screenshot).length

  const handleCopy = useCallback(async () => {
    const blob = await renderContactSheet(annotations)
    if (!blob) return
    if (await copyImage(blob)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [annotations, copyImage])

  return (
    <button
      onClick={handleCopy}
      disabled={shotCount === 0}
      style={{
        ...copyButtonStyle(copied),
        opacity: shotCount === 0 ? 0.4 : 1,
        cursor: shotCount === 0 ? "not-allowed" : "pointer",
      }}
      title={copied ? "Image copied!" : `Copy Image (${shotCount})`}>
      <ImageIcon color={copied ? theme.success : theme.textMuted} />
    </button>
  )
}
