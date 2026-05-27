import type { Theme } from "~lib/theme"

const EXAMPLES = [
  ["localhost:3000", "Host", "http://localhost:3000/*"],
  ["example.com", "Host", "*.example.com/*"],
  ["https?://staging\\.example\\.com/app/.*", "Regex", "Staging app pages"],
  ["vercel\\.app", "Regex", "Any Vercel deployment"],
]

export function ExamplesTable({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        marginTop: 32,
        fontSize: 12,
        color: theme.textMuted,
        lineHeight: 1.8,
      }}>
      <div
        style={{ fontWeight: 600, marginBottom: 8, color: theme.textSecondary }}>
        Examples
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "4px 12px 4px 0",
                color: theme.textSecondary,
              }}>
              Pattern
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "4px 12px 4px 0",
                color: theme.textSecondary,
              }}>
              Type
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "4px 0",
                color: theme.textSecondary,
              }}>
              Matches
            </th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map(([pattern, type, matches]) => (
            <tr key={pattern}>
              <td style={{ padding: "4px 12px 4px 0" }}>
                <code
                  style={{
                    backgroundColor: theme.codeBg,
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontFamily: theme.fontMono,
                    fontSize: 11,
                  }}>
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
