import { useCallback, useEffect, useState } from "react"

import { darkTheme, lightTheme, type Theme, type ThemeMode } from "~lib/theme"

const THEME_KEY = "tegakariTheme"

export function useStoredTheme(): {
  theme: Theme
  mode: ThemeMode
  toggleMode: () => void
} {
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
