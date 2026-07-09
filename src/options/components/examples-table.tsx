import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

function buildExamples(): [pattern: string, type: string, matches: string][] {
  return [
    ["localhost:3000", t("options_examples_type_host"), "http://localhost:3000/*"],
    ["example.com", t("options_examples_type_host"), "*.example.com/*"],
    [
      "https?://staging\\.example\\.com/app/.*",
      t("options_examples_type_regex"),
      t("options_examples_match_staging"),
    ],
    [
      "vercel\\.app",
      t("options_examples_type_regex"),
      t("options_examples_match_vercel"),
    ],
  ]
}

export function ExamplesTable({ theme }: { theme: Theme }) {
  const examples = buildExamples()
  return (
    <div
      style={{
        marginTop: 24,
        fontSize: 12,
        color: theme.textMuted,
        lineHeight: 1.8,
      }}
    >
      <div
        style={{ fontWeight: 600, marginBottom: 8, color: theme.textSecondary }}
      >
        {t("options_examples_title")}
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "4px 12px 4px 0",
                color: theme.textSecondary,
              }}
            >
              {t("options_examples_col_pattern")}
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "4px 12px 4px 0",
                color: theme.textSecondary,
              }}
            >
              {t("options_examples_col_type")}
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "4px 0",
                color: theme.textSecondary,
              }}
            >
              {t("options_examples_col_matches")}
            </th>
          </tr>
        </thead>
        <tbody>
          {examples.map(([pattern, type, matches]) => (
            <tr key={pattern}>
              <td style={{ padding: "4px 12px 4px 0" }}>
                <code
                  style={{
                    backgroundColor: theme.codeBg,
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontFamily: theme.fontMono,
                    fontSize: 11,
                  }}
                >
                  {pattern}
                </code>
              </td>
              <td style={{ padding: "4px 12px 4px 0" }}>{type}</td>
              <td style={{ padding: "4px 0" }}>{matches}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
