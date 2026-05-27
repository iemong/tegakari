import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { usePrefixRulesManager } from "../use-prefix-rules-manager"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
        set: vi.fn(async (value: StorageRecord) => {
          Object.assign(storage, value)
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  })
})

describe("usePrefixRulesManager", () => {
  it("loads stored rules", async () => {
    storage.tegakariPrefixRules = [{ pattern: "a.com", prefix: "[a]" }]

    const { result } = renderHook(() => usePrefixRulesManager())

    await waitFor(() => expect(result.current.rules).toHaveLength(1))
    expect(result.current.rules[0].pattern).toBe("a.com")
  })

  it("adds a normalized host rule and resets the draft", async () => {
    const { result } = renderHook(() => usePrefixRulesManager())
    await waitFor(() => expect(result.current.rules).toEqual([]))

    act(() => {
      result.current.updateAddDraft({
        pattern: "https://example.com/path",
        prefix: "[ex]",
      })
    })
    await act(async () => result.current.addRule())

    expect(result.current.rules).toEqual([
      { pattern: "example.com", prefix: "[ex]", isRegex: false },
    ])
    expect(result.current.addDraft.pattern).toBe("")
    expect(storage.tegakariPrefixRules).toEqual(result.current.rules)
  })

  it("reports add validation errors", async () => {
    const { result } = renderHook(() => usePrefixRulesManager())

    await act(async () => result.current.addRule())
    expect(result.current.addDraft.error).toBe("Pattern and prefix are required")

    act(() => {
      result.current.updateAddDraft({
        pattern: "(broken",
        prefix: "[bad]",
        isRegex: true,
      })
    })
    await act(async () => result.current.addRule())
    expect(result.current.addDraft.error).toMatch(/Invalid regex/)
  })

  it("reports duplicate add errors", async () => {
    storage.tegakariPrefixRules = [{ pattern: "a.com", prefix: "[a]" }]
    const { result } = renderHook(() => usePrefixRulesManager())
    await waitFor(() => expect(result.current.rules).toHaveLength(1))

    act(() => {
      result.current.updateAddDraft({ pattern: "a.com", prefix: "[again]" })
    })
    await act(async () => result.current.addRule())

    expect(result.current.addDraft.error).toBe(
      "A rule with this pattern already exists"
    )
    expect(result.current.rules).toEqual([{ pattern: "a.com", prefix: "[a]" }])
  })

  it("trims regex patterns and prefixes", async () => {
    const { result } = renderHook(() => usePrefixRulesManager())
    await waitFor(() => expect(result.current.rules).toEqual([]))

    act(() => {
      result.current.updateAddDraft({
        pattern: " ^https://example\\.com/ ",
        prefix: " [ex] ",
        isRegex: true,
      })
    })
    await act(async () => result.current.addRule())

    expect(result.current.rules).toEqual([
      { pattern: "^https://example\\.com/", prefix: "[ex]", isRegex: true },
    ])
  })

  it("edits, reorders, deletes, and cancels rules", async () => {
    storage.tegakariPrefixRules = [
      { pattern: "a.com", prefix: "[a]" },
      { pattern: "b.com", prefix: "[b]" },
    ]
    const { result } = renderHook(() => usePrefixRulesManager())
    await waitFor(() => expect(result.current.rules).toHaveLength(2))

    act(() => result.current.startEdit(0))
    act(() => result.current.updateEditDraft({ prefix: "[aa]" }))
    await act(async () => result.current.saveEdit())
    expect(result.current.rules[0].prefix).toBe("[aa]")
    expect(result.current.editingIdx).toBeNull()

    await act(async () => result.current.reorderRule(0, "down"))
    expect(result.current.rules.map((rule) => rule.pattern)).toEqual([
      "b.com",
      "a.com",
    ])

    await act(async () => result.current.reorderRule(1, "up"))
    expect(result.current.rules.map((rule) => rule.pattern)).toEqual([
      "a.com",
      "b.com",
    ])

    await act(async () => result.current.reorderRule(0, "up"))
    expect(result.current.rules.map((rule) => rule.pattern)).toEqual([
      "a.com",
      "b.com",
    ])

    act(() => result.current.startEdit(0))
    act(() => result.current.updateEditDraft({ prefix: "[unused]" }))
    act(() => result.current.cancelEdit())
    expect(result.current.editingIdx).toBeNull()
    expect(result.current.rules[0].prefix).toBe("[aa]")

    await act(async () => result.current.deleteRule("a.com"))
    expect(result.current.rules.map((rule) => rule.pattern)).toEqual(["b.com"])
  })

  it("reports duplicate edit errors", async () => {
    storage.tegakariPrefixRules = [
      { pattern: "a.com", prefix: "[a]" },
      { pattern: "b.com", prefix: "[b]" },
    ]
    const { result } = renderHook(() => usePrefixRulesManager())
    await waitFor(() => expect(result.current.rules).toHaveLength(2))

    act(() => result.current.startEdit(0))
    act(() => result.current.updateEditDraft({ pattern: "b.com" }))
    await act(async () => result.current.saveEdit())

    expect(result.current.editDraft.error).toBe(
      "A rule with this pattern already exists"
    )
  })
})
