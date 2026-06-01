import { createContext, useContext } from "react"

export interface Theme {
  // Surfaces
  bg: string
  surface: string
  surfaceHover: string
  // Borders
  border: string
  borderFocus: string
  // Text
  textPrimary: string
  textSecondary: string
  textMuted: string
  // Accent (cool blue)
  accent: string
  accentHover: string
  accentMuted: string
  accentText: string
  // Semantic
  success: string
  successText: string
  danger: string
  // Inputs
  inputBg: string
  // Shadows
  shadow: string
  shadowStrong: string
  // Pin
  pinBg: string
  pinActiveBg: string
  pinText: string
  pinActiveText: string
  // Misc
  codeBg: string
  activeIndicator: string
  activeRowBg: string
  // Font
  fontFamily: string
  fontMono: string
}

export const darkTheme: Theme = {
  bg: "#0b0e14",
  surface: "#111620",
  surfaceHover: "#181d2a",
  border: "#1f2736",
  borderFocus: "#2d3a4f",
  textPrimary: "#d4dae5",
  textSecondary: "#7d8799",
  textMuted: "#4b5468",
  accent: "#2563eb",
  accentHover: "#3b82f6",
  accentMuted: "rgba(37, 99, 235, 0.12)",
  accentText: "#ffffff",
  success: "#4ecb71",
  successText: "#0b0e14",
  danger: "#ef5f6b",
  inputBg: "#151a26",
  shadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  shadowStrong: "0 12px 48px rgba(0, 0, 0, 0.65)",
  pinBg: "#2d3a4f",
  pinActiveBg: "#2563eb",
  pinText: "#7d8799",
  pinActiveText: "#ffffff",
  codeBg: "#151a26",
  activeIndicator: "#2563eb",
  activeRowBg: "rgba(37, 99, 235, 0.06)",
  fontFamily:
    '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  fontMono: '"SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
}

export const lightTheme: Theme = {
  bg: "#f0f3f8",
  surface: "#ffffff",
  surfaceHover: "#e9edf4",
  border: "#d0d7e2",
  borderFocus: "#a8b4c6",
  textPrimary: "#1a2030",
  textSecondary: "#546178",
  textMuted: "#8d99ab",
  accent: "#1d4ed8",
  accentHover: "#1e40af",
  accentMuted: "rgba(29, 78, 216, 0.08)",
  accentText: "#ffffff",
  success: "#178a4a",
  successText: "#ffffff",
  danger: "#d03040",
  inputBg: "#e9edf4",
  shadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
  shadowStrong: "0 12px 48px rgba(0, 0, 0, 0.12)",
  pinBg: "#a8b4c6",
  pinActiveBg: "#1d4ed8",
  pinText: "#546178",
  pinActiveText: "#ffffff",
  codeBg: "#e9edf4",
  activeIndicator: "#1d4ed8",
  activeRowBg: "rgba(29, 78, 216, 0.05)",
  fontFamily:
    '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  fontMono: '"SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
}

export type ThemeMode = "dark" | "light"

export interface ThemeContextValue {
  theme: Theme
  mode: ThemeMode
  toggleMode: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  mode: "dark",
  toggleMode: () => {},
})

export const useTheme = () => useContext(ThemeContext)
