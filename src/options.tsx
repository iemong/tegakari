import { AppearanceSection } from "./options/components/appearance-section"
import { OptionsFooter } from "./options/components/options-footer"
import { OptionsHeader } from "./options/components/options-header"
import { PrefixRulesSection } from "./options/components/prefix-rules-section"
import { SettingsSection } from "./options/components/settings-section"
import { useStoredTheme } from "./options/hooks/use-stored-theme"

export default function OptionsPage() {
  const { theme, mode, toggleMode } = useStoredTheme()

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.bg,
        color: theme.textPrimary,
        fontFamily: theme.fontFamily,
        padding: "40px 0",
      }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
        <OptionsHeader theme={theme} />

        <SettingsSection title="Appearance" theme={theme}>
          <AppearanceSection theme={theme} mode={mode} onToggle={toggleMode} />
        </SettingsSection>

        <PrefixRulesSection theme={theme} />

        <OptionsFooter theme={theme} />
      </div>
    </div>
  )
}
