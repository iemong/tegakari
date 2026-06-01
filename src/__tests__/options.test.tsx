/**
 * Component tests for the options page, focused on the two behaviours the
 * user asked us to lock down:
 *   1. The regex checkbox flow (add + edit), including placeholder change
 *      and validation of invalid regex.
 *   2. The rule list rendering (empty state, host vs regex display, order).
 */
import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import OptionsPage from "../options"

// ---- chrome.storage mock --------------------------------------------------

type StorageRecord = Record<string, unknown>
const storage: StorageRecord = {}

function installChromeMock() {
  for (const k of Object.keys(storage)) delete storage[k]
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        // Support both callback and Promise forms — useStoredTheme uses the
        // callback form, prefix-rules.ts uses the Promise form.
        get: vi.fn((key: string, cb?: (r: StorageRecord) => void) => {
          const result = { [key]: storage[key] }
          if (cb) cb(result)
          return Promise.resolve(result)
        }),
        set: vi.fn(async (obj: StorageRecord) => {
          Object.assign(storage, obj)
        }),
      },
      // Mock onChanged listener registration so prefix-rules subscribers work.
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  })
}

// ---- helpers --------------------------------------------------------------

/**
 * Wait for OptionsPage's initial `loadPrefixRules()` to resolve so the
 * rule list / "No rules yet" state has settled before the spec runs
 * assertions.
 */
async function renderAndSettle(seedRules: unknown[]) {
  storage["tegakariPrefixRules"] = seedRules
  render(<OptionsPage />)
  if (seedRules.length === 0) {
    await screen.findByText(/No rules yet/i)
  } else {
    // Wait for the first rule's pattern to land.
    const first = seedRules[0] as { pattern: string }
    await screen.findByText(first.pattern)
  }
  return { user: userEvent.setup() }
}

/**
 * Resolve the Add form's pattern input. The host-mode placeholder contains
 * "example.com", the regex-mode placeholder contains "https?:". Pass the
 * mode you expect so the matcher stays stable when the placeholder swaps.
 */
function getAddPatternInput(mode: "host" | "regex"): HTMLInputElement {
  const placeholder = mode === "host" ? /example\.com/i : /https\?:/i
  return screen.getByPlaceholderText(placeholder) as HTMLInputElement
}

/**
 * The Add form's "Regex (match against full URL)" checkbox lives inside a
 * <label>. Pulling by accessible name is the most robust path.
 */
function getAddRegexCheckbox(): HTMLInputElement {
  return screen.getByLabelText(
    /Regex \(match against full URL\)/i
  ) as HTMLInputElement
}

// ---- lifecycle ------------------------------------------------------------

beforeEach(() => installChromeMock())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// ===========================================================================
// Rule list rendering
// ===========================================================================

describe("OptionsPage — rule list rendering", () => {
  it("shows the empty-state message when there are no rules", async () => {
    await renderAndSettle([])
    expect(screen.getByText(/No rules yet\. Add one below\./i)).toBeDefined()
  })

  it("renders a host-mode rule WITHOUT a regex badge", async () => {
    await renderAndSettle([{ pattern: "github.com", prefix: "[gh]" }])

    expect(screen.getByText("github.com")).toBeDefined()
    // Prefix is rendered as "→ [gh]" inside the row — match on the substring.
    expect(screen.getByText(/\[gh\]/)).toBeDefined()
    // The "regex" badge should not appear for host rules.
    expect(screen.queryByText("regex")).toBeNull()
  })

  it("renders a regex-mode rule WITH a regex badge", async () => {
    await renderAndSettle([
      {
        pattern: "^https://example\\.com",
        prefix: "[ex]",
        isRegex: true,
      },
    ])

    expect(screen.getByText("^https://example\\.com")).toBeDefined()
    expect(screen.getByText(/\[ex\]/)).toBeDefined()
    expect(screen.getByText("regex")).toBeDefined()
  })

  it("renders multiple rules in the stored order, with badges only on regex entries", async () => {
    await renderAndSettle([
      { pattern: "a.com", prefix: "[a]" },
      { pattern: "^/api/", prefix: "[api]", isRegex: true },
      { pattern: "b.com", prefix: "[b]" },
    ])

    // Pattern <code> elements appear in DOM order; assert the order.
    const patternTexts = screen.getAllByText(/^(a\.com|b\.com|\^\/api\/)$/)
    expect(patternTexts.map((el) => el.textContent)).toEqual([
      "a.com",
      "^/api/",
      "b.com",
    ])

    // Exactly one regex badge across all three rules.
    expect(screen.getAllByText("regex")).toHaveLength(1)
  })

  it("disables the up arrow on the first row and the down arrow on the last row", async () => {
    await renderAndSettle([
      { pattern: "a.com", prefix: "[a]" },
      { pattern: "b.com", prefix: "[b]" },
    ])

    const ups = screen.getAllByRole("button", { name: "▲" })
    const downs = screen.getAllByRole("button", { name: "▼" })
    expect(ups[0]).toBeDisabled()
    expect(ups[1]).toBeEnabled()
    expect(downs[0]).toBeEnabled()
    expect(downs[1]).toBeDisabled()
  })
})

// ===========================================================================
// Regex checkbox — Add form
// ===========================================================================

describe("OptionsPage — regex checkbox on Add form", () => {
  it("switches the pattern placeholder when the Regex box is toggled", async () => {
    const { user } = await renderAndSettle([])

    // Default: host-mode placeholder is shown.
    expect(getAddPatternInput("host")).toBeDefined()
    expect(screen.queryByPlaceholderText(/https\?:/i)).toBeNull()

    await user.click(getAddRegexCheckbox())

    // Now the placeholder switches to the regex hint and the host one is gone.
    expect(getAddPatternInput("regex")).toBeDefined()
    expect(screen.queryByPlaceholderText(/example\.com/i)).toBeNull()
  })

  it("rejects an invalid regex with an inline error and does not persist", async () => {
    const { user } = await renderAndSettle([])

    await user.click(getAddRegexCheckbox())
    // user.type interprets "(" / "[" / "{" loosely; use fireEvent.change to
    // set the raw string verbatim.
    fireEvent.change(getAddPatternInput("regex"), {
      target: { value: "(unclosed" },
    })
    fireEvent.change(screen.getByPlaceholderText("[repo=my-app]"), {
      target: { value: "[bad]" },
    })
    await user.click(screen.getByRole("button", { name: /^Add$/i }))

    // Use findByText so the assertion waits for the state update + re-render.
    expect(await screen.findByText(/Invalid regex/i)).toBeDefined()
    // Rule list is still empty.
    expect(screen.getByText(/No rules yet/i)).toBeDefined()
    // Storage was never written.
    expect(storage["tegakariPrefixRules"]).toEqual([])
    // Inputs keep the user's typed values so they can correct the regex.
    expect(getAddPatternInput("regex").value).toBe("(unclosed")
  })

  it("adds a valid regex rule and shows the regex badge in the list", async () => {
    const { user } = await renderAndSettle([])

    await user.click(getAddRegexCheckbox())
    fireEvent.change(getAddPatternInput("regex"), {
      target: { value: "^https://github\\.com/" },
    })
    fireEvent.change(screen.getByPlaceholderText("[repo=my-app]"), {
      target: { value: "[gh]" },
    })
    await user.click(screen.getByRole("button", { name: /^Add$/i }))

    // Rendered with the regex badge.
    expect(await screen.findByText("^https://github\\.com/")).toBeDefined()
    expect(screen.getByText(/\[gh\]/)).toBeDefined()
    expect(screen.getByText("regex")).toBeDefined()
    // Persisted with isRegex=true.
    expect(storage["tegakariPrefixRules"]).toEqual([
      { pattern: "^https://github\\.com/", prefix: "[gh]", isRegex: true },
    ])
  })

  it("keeps the unchecked add form in host mode and normalizes a pasted URL", async () => {
    const { user } = await renderAndSettle([])

    fireEvent.change(getAddPatternInput("host"), {
      target: { value: "https://github.com/iemong/tegakari" },
    })
    fireEvent.change(screen.getByPlaceholderText("[repo=my-app]"), {
      target: { value: "[gh]" },
    })
    await user.click(screen.getByRole("button", { name: /^Add$/i }))

    // The displayed rule is the normalized host, no regex badge.
    expect(await screen.findByText("github.com")).toBeDefined()
    expect(screen.queryByText("regex")).toBeNull()
    // handleAdd always writes isRegex (even when false). serializeRules
    // omits it on export, but in-memory storage carries the literal value.
    expect(storage["tegakariPrefixRules"]).toEqual([
      { pattern: "github.com", prefix: "[gh]", isRegex: false },
    ])
  })
})

// ===========================================================================
// Regex checkbox — Edit form
// ===========================================================================

describe("OptionsPage — regex checkbox on Edit form", () => {
  it("converts a host rule to a regex rule when Regex is toggled on and Save is clicked", async () => {
    const { user } = await renderAndSettle([
      { pattern: "github.com", prefix: "[gh]" },
    ])

    expect(screen.queryByText("regex")).toBeNull()

    await user.click(screen.getByRole("button", { name: /^Edit$/i }))

    // Now in edit mode: pattern input is pre-filled. Two checkboxes exist
    // (edit row + Add form); the edit one has the short label "Regex".
    const editPattern = screen.getByDisplayValue(
      "github.com"
    ) as HTMLInputElement
    const editCheckbox = screen.getByLabelText(
      /^\s*Regex\s*$/i
    ) as HTMLInputElement
    expect(editCheckbox.checked).toBe(false)

    // Switch to a valid regex and save.
    fireEvent.change(editPattern, {
      target: { value: "^https://github\\.com/" },
    })
    await user.click(editCheckbox)
    await user.click(screen.getByRole("button", { name: /^Save$/i }))

    expect(await screen.findByText("^https://github\\.com/")).toBeDefined()
    expect(screen.getByText("regex")).toBeDefined()
    expect(storage["tegakariPrefixRules"]).toEqual([
      { pattern: "^https://github\\.com/", prefix: "[gh]", isRegex: true },
    ])
  })

  it("blocks Save with an inline error when the edited regex is invalid", async () => {
    const { user } = await renderAndSettle([
      {
        pattern: "^valid\\.com",
        prefix: "[ex]",
        isRegex: true,
      },
    ])

    await user.click(screen.getByRole("button", { name: /^Edit$/i }))

    const editPattern = screen.getByDisplayValue(
      "^valid\\.com"
    ) as HTMLInputElement
    fireEvent.change(editPattern, { target: { value: "(broken" } })
    await user.click(screen.getByRole("button", { name: /^Save$/i }))

    // Stays in edit mode with an inline error.
    expect(await screen.findByText(/Invalid regex/i)).toBeDefined()
    // The original (valid) rule is unchanged in storage.
    expect(storage["tegakariPrefixRules"]).toEqual([
      { pattern: "^valid\\.com", prefix: "[ex]", isRegex: true },
    ])
  })

  it("Cancel restores the row to view mode without persisting changes", async () => {
    const { user } = await renderAndSettle([
      { pattern: "github.com", prefix: "[gh]" },
    ])

    await user.click(screen.getByRole("button", { name: /^Edit$/i }))
    const editPattern = screen.getByDisplayValue(
      "github.com"
    ) as HTMLInputElement
    fireEvent.change(editPattern, { target: { value: "something-else.com" } })
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }))

    // Back to view mode, original pattern still rendered.
    expect(screen.getByText("github.com")).toBeDefined()
    expect(storage["tegakariPrefixRules"]).toEqual([
      { pattern: "github.com", prefix: "[gh]" },
    ])
  })
})
