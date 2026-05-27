import type { Theme } from "~lib/theme"

export function OptionsHeader({ theme }: { theme: Theme }) {
  return (
    <>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: theme.accent,
          marginBottom: 4,
        }}>
        tegakari
      </h1>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 400,
          color: theme.textMuted,
          marginBottom: 32,
        }}>
        Prefix Rules
      </h2>
      <p
        style={{
          fontSize: 13,
          color: theme.textSecondary,
          lineHeight: 1.6,
          marginBottom: 24,
        }}>
        URL patterns are matched against the hostname (e.g.,{" "}
        <code
          style={{
            backgroundColor: theme.codeBg,
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: theme.fontMono,
          }}>
          localhost:3000
        </code>
        ). Enable regex to match against the full URL. Rules are evaluated
        top-to-bottom; first match wins.
      </p>
    </>
  )
}
