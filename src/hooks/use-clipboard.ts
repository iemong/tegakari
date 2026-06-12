import { useCallback } from "react"

async function writeViaApi(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function writeViaTextarea(text: string): boolean {
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
    return true
  } catch {
    return false
  }
}

// Image-only ClipboardItem: intentionally NOT bundled with text — paste
// targets pick one representation, and image-preferring apps would drop the
// text. Text and image are copied via separate buttons instead (#21).
async function writeImageViaApi(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ])
    return true
  } catch {
    return false
  }
}

export function useClipboard() {
  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (await writeViaApi(text)) return true
    return writeViaTextarea(text)
  }, [])

  const copyImage = useCallback(
    (blob: Blob): Promise<boolean> => writeImageViaApi(blob),
    []
  )

  return { copy, copyImage }
}
