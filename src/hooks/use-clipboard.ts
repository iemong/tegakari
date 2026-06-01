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

export function useClipboard() {
  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (await writeViaApi(text)) return true
    return writeViaTextarea(text)
  }, [])

  return { copy }
}
