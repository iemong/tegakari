import { t } from "~lib/i18n"

import { AppearanceSection } from "./options/components/appearance-section"
import { BehaviorSection } from "./options/components/behavior-section"
import { OptionsFooter } from "./options/components/options-footer"
import { OptionsHeader } from "./options/components/options-header"
import { PrefixRulesSection } from "./options/components/prefix-rules-section"
import { SettingsSection } from "./options/components/settings-section"
import { useIframeSelection } from "./options/hooks/use-iframe-selection"
import { useStoredTheme } from "./options/hooks/use-stored-theme"

export default function OptionsPage() {
  const { theme, mode, toggleMode } = useStoredTheme()
  const { enabled: iframeEnabled, toggle: toggleIframe } = useIframeSelection()

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

        <SettingsSection title={t("options_section_appearance")} theme={theme}>
          <AppearanceSection theme={theme} mode={mode} onToggle={toggleMode} />
        </SettingsSection>

        <SettingsSection title={t("options_section_behavior")} theme={theme}>
          <BehaviorSection
            theme={theme}
            iframeEnabled={iframeEnabled}
            onToggleIframe={toggleIframe}
          />
        </SettingsSection>

        <PrefixRulesSection theme={theme} />

        <OptionsFooter theme={theme} />
      </div>
    </div>
  )
}
