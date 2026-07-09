import iconUrl from "data-base64:../../../assets/icon.png"

import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

export function OptionsHeader({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 36,
      }}>
      <img
        src={iconUrl}
        alt=""
        width={28}
        height={28}
        style={{ borderRadius: 6, flexShrink: 0 }}
      />
      <h1
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
        }}>
        <span style={{ color: theme.accent }}>tegakari</span>
        <span
          style={{ fontSize: 15, fontWeight: 400, color: theme.textMuted }}>
          {t("options_header_settings")}
        </span>
      </h1>
    </div>
  )
}
