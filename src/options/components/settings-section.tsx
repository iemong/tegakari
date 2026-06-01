import type { ReactNode } from "react"

import type { Theme } from "~lib/theme"

interface Props {
  title: string
  description?: ReactNode
  theme: Theme
  children: ReactNode
}

/**
 * Shared section primitive for the settings page: a heading, an optional
 * description, then the section content. Every top-level group on the page is
 * rendered through this so headings and spacing stay consistent.
 */
export function SettingsSection({
  title,
  description,
  theme,
  children,
}: Props) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: theme.textPrimary,
          margin: description ? "0 0 6px" : "0 0 14px",
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            fontSize: 13,
            color: theme.textSecondary,
            lineHeight: 1.6,
            margin: "0 0 16px",
          }}
        >
          {description}
        </p>
      )}
      {children}
    </section>
  )
}
