import { useCallback, useEffect, useState } from "react"

import {
  IFRAME_SELECTION_KEY,
  loadIframeSelection,
  setIframeSelection,
} from "~lib/settings"

/** Options-page hook for the "select inside same-origin iframes" toggle. */
export function useIframeSelection(): {
  enabled: boolean
  toggle: () => void
} {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    loadIframeSelection().then(setEnabled)
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      setIframeSelection(next)
      return next
    })
  }, [])

  return { enabled, toggle }
}

export { IFRAME_SELECTION_KEY }
