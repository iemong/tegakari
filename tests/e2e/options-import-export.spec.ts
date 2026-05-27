import { test, expect } from "./fixtures"

/**
 * E2E for the prefix-rules JSON Import/Export feature on the options page.
 *
 * Strategy:
 * - Seed the persisted rules via chrome.storage.local (fast, deterministic).
 * - Open chrome-extension://<id>/options.html directly.
 * - Drive the Export / Import UI through Playwright.
 * - Verify both the downloaded file content (export) and the persisted
 *   storage state (import) so we catch regressions on either side.
 */

const optionsUrl = (extensionId: string) =>
  `chrome-extension://${extensionId}/options.html`

test.describe("Options page: prefix rules import / export", () => {
  test.beforeEach(async ({ seedPrefixRules }) => {
    // Always start each spec with a known-clean store.
    await seedPrefixRules([])
  })

  test("Export button is disabled when there are no rules", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage()
    await page.goto(optionsUrl(extensionId))

    const exportBtn = page.getByRole("button", { name: "Export", exact: true })
    await expect(exportBtn).toBeVisible()
    await expect(exportBtn).toBeDisabled()
  })

  test("Export downloads a JSON file containing the current rules", async ({
    context,
    extensionId,
    seedPrefixRules,
  }) => {
    await seedPrefixRules([
      { pattern: "github.com", prefix: "[gh]" },
      {
        pattern: "^https://example\\.com",
        prefix: "[ex]",
        isRegex: true,
      },
    ])

    const page = await context.newPage()
    await page.goto(optionsUrl(extensionId))

    const exportBtn = page.getByRole("button", { name: "Export", exact: true })
    await expect(exportBtn).toBeEnabled()

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportBtn.click(),
    ])

    // Filename convention: tegakari-prefix-rules-YYYY-MM-DD.json
    expect(download.suggestedFilename()).toMatch(
      /^tegakari-prefix-rules-\d{4}-\d{2}-\d{2}\.json$/
    )

    const path = await download.path()
    expect(path).toBeTruthy()
    const fs = await import("node:fs/promises")
    const text = await fs.readFile(path!, "utf-8")
    const parsed = JSON.parse(text)

    expect(parsed).toEqual([
      { pattern: "github.com", prefix: "[gh]" },
      {
        pattern: "^https://example\\.com",
        prefix: "[ex]",
        isRegex: true,
      },
    ])
  })

  test("Import merges JSON rules into existing storage (upsert + append)", async ({
    context,
    extensionId,
    seedPrefixRules,
    readPrefixRules,
  }) => {
    await seedPrefixRules([
      { pattern: "github.com", prefix: "[old]" },
      { pattern: "keep.example.com", prefix: "[keep]" },
    ])

    const page = await context.newPage()
    await page.goto(optionsUrl(extensionId))

    // Pre-import sanity: the existing rule should render.
    await expect(page.getByText("github.com")).toBeVisible()
    await expect(page.getByText("[old]")).toBeVisible()

    const importPayload = [
      { pattern: "github.com", prefix: "[new]" }, // overwrite
      { pattern: "added.example.com", prefix: "[added]" }, // append
    ]

    // The file input is hidden — Playwright's setInputFiles works regardless.
    await page.locator('input[type="file"]').setInputFiles({
      name: "rules.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importPayload)),
    })

    // Result banner appears.
    await expect(page.getByRole("status")).toContainText(/Imported 2 rule/)

    // Storage now has the merged state — existing untouched rule kept,
    // matching pattern overwritten in place, new pattern appended.
    const persisted = await readPrefixRules()
    expect(persisted).toEqual([
      { pattern: "github.com", prefix: "[new]" },
      { pattern: "keep.example.com", prefix: "[keep]" },
      { pattern: "added.example.com", prefix: "[added]" },
    ])

    // UI reflects the new values.
    await expect(page.getByText("[new]")).toBeVisible()
    await expect(page.getByText("[added]")).toBeVisible()
    await expect(page.getByText("[old]")).toHaveCount(0)
  })

  test("Import surfaces an error banner for invalid JSON", async ({
    context,
    extensionId,
    readPrefixRules,
  }) => {
    const page = await context.newPage()
    await page.goto(optionsUrl(extensionId))

    await page.locator('input[type="file"]').setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("this is not valid json {"),
    })

    await expect(page.getByRole("status")).toContainText(/Import failed/i)
    // Storage stays empty.
    expect(await readPrefixRules()).toEqual([])
  })

  test("Import normalizes full-URL patterns on the way in", async ({
    context,
    extensionId,
    readPrefixRules,
  }) => {
    const page = await context.newPage()
    await page.goto(optionsUrl(extensionId))

    await page.locator('input[type="file"]').setInputFiles({
      name: "with-urls.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify([
          { pattern: "https://github.com/iemong/tegakari", prefix: "[gh]" },
        ])
      ),
    })

    await expect(page.getByRole("status")).toContainText(/Imported 1 rule/)
    expect(await readPrefixRules()).toEqual([
      { pattern: "github.com", prefix: "[gh]" },
    ])
  })

  test("Round trip: export → wipe → import restores the same rules", async ({
    context,
    extensionId,
    seedPrefixRules,
    readPrefixRules,
  }) => {
    const initial = [
      { pattern: "github.com", prefix: "[gh]" },
      {
        pattern: "^https://example\\.com",
        prefix: "[ex]",
        isRegex: true,
      },
    ]
    await seedPrefixRules(initial)

    const page = await context.newPage()
    await page.goto(optionsUrl(extensionId))

    // 1) Export
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export", exact: true }).click(),
    ])
    const fs = await import("node:fs/promises")
    const exported = await fs.readFile((await download.path())!, "utf-8")

    // 2) Wipe storage and reload so the page sees an empty state.
    await seedPrefixRules([])
    await page.reload()
    await expect(page.getByText("No rules yet. Add one below.")).toBeVisible()

    // 3) Import the file we just exported.
    await page.locator('input[type="file"]').setInputFiles({
      name: "roundtrip.json",
      mimeType: "application/json",
      buffer: Buffer.from(exported),
    })
    await expect(page.getByRole("status")).toContainText(/Imported 2 rule/)

    // 4) Persisted state matches the original.
    expect(await readPrefixRules()).toEqual(initial)
  })
})
