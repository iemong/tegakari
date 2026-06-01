import type { Theme } from "~lib/theme"

const REPO_URL = "https://github.com/iemong/tegakari"
const SPONSOR_URL = "https://github.com/sponsors/iemong"

export function OptionsFooter({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        paddingTop: 24,
        borderTop: `1px solid ${theme.border}`,
        fontSize: 13,
        color: theme.textSecondary,
        lineHeight: 1.7,
      }}
    >
      <p style={{ margin: "0 0 12px" }}>
        tegakari is free and open source. If you find it useful, please consider
        supporting continued development.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a
          href={SPONSOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            backgroundColor: theme.accentMuted,
            color: theme.accent,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ♥ Sponsor on GitHub
        </a>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            color: theme.textSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ★ GitHub Repository
        </a>
      </div>
    </div>
  )
}
