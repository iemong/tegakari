import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  extractHost,
  findMatchingPrefix,
  normalizePattern,
  validateRegex,
} from "../prefix-rules"

describe("normalizePattern", () => {
  it.each([
    // Bare hostname stays as-is.
    ["example.com", "example.com"],
    ["www.example.com", "www.example.com"],
    // Full URL → host part only.
    ["https://github.com/iemong/tegakari", "github.com"],
    ["http://localhost:3000/foo", "localhost:3000"],
    // Scheme-less prefix with path.
    ["example.com/path", "example.com"],
    ["example.com/path?query=1", "example.com"],
    // Whitespace is trimmed.
    [" example.com ", "example.com"],
    // host:port stays intact.
    ["localhost:3000", "localhost:3000"],
    // Empty / whitespace-only.
    ["", ""],
    ["   ", ""],
    // Garbage falls through unchanged so the matcher can simply miss.
    ["not a host name", "not a host name"],
  ])("normalizes %j -> %j", (input, expected) => {
    expect(normalizePattern(input)).toBe(expected)
  })

  it("normalizes URLs whose host has an explicit port", () => {
    expect(normalizePattern("https://example.com:8443/x")).toBe(
      "example.com:8443"
    )
  })
})

describe("findMatchingPrefix", () => {
  it("returns null when no rules are provided", () => {
    expect(findMatchingPrefix([], "https://example.com/")).toBeNull()
  })

  it("matches exact host", () => {
    expect(
      findMatchingPrefix(
        [{ pattern: "github.com", prefix: "[gh]" }],
        "https://github.com/foo"
      )
    ).toBe("[gh]")
  })

  it("matches subdomain via dot-suffix rule", () => {
    expect(
      findMatchingPrefix(
        [{ pattern: "example.com", prefix: "[ex]" }],
        "https://www.example.com/"
      )
    ).toBe("[ex]")
  })

  it("requires port match for host:port patterns", () => {
    const rules = [{ pattern: "localhost:3000", prefix: "[local]" }]
    expect(findMatchingPrefix(rules, "http://localhost:3000/x")).toBe("[local]")
    // Different port → miss.
    expect(findMatchingPrefix(rules, "http://localhost:4000/x")).toBeNull()
  })

  it("returns null for invalid URLs", () => {
    expect(
      findMatchingPrefix(
        [{ pattern: "example.com", prefix: "[x]" }],
        "not-a-url"
      )
    ).toBeNull()
  })

  it("returns first matching rule (order matters)", () => {
    const rules = [
      { pattern: "example.com", prefix: "[outer]" },
      { pattern: "www.example.com", prefix: "[inner]" },
    ]
    expect(findMatchingPrefix(rules, "https://www.example.com/")).toBe(
      "[outer]"
    )
  })

  it("supports regex rules", () => {
    const rules = [
      {
        pattern: "^https://github\\.com/[^/]+/tegakari",
        prefix: "[tegakari]",
        isRegex: true,
      },
    ]
    expect(
      findMatchingPrefix(rules, "https://github.com/iemong/tegakari/pull/1")
    ).toBe("[tegakari]")
    expect(findMatchingPrefix(rules, "https://github.com/iemong/other")).toBeNull()
  })

  it("skips invalid regex without throwing", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const rules = [
      { pattern: "(unclosed", prefix: "[bad]", isRegex: true },
      { pattern: "example.com", prefix: "[ok]" },
    ]
    // The bad regex is silently skipped, the valid host rule still matches.
    expect(findMatchingPrefix(rules, "https://example.com/")).toBe("[ok]")
    consoleSpy.mockRestore()
  })
})

describe("validateRegex", () => {
  it("returns null for valid regex", () => {
    expect(validateRegex(".*")).toBeNull()
    expect(validateRegex("^foo$")).toBeNull()
  })

  it("returns an error message for invalid regex", () => {
    expect(validateRegex("(unclosed")).toMatch(/./)
  })
})

describe("extractHost", () => {
  it("returns host for valid URLs", () => {
    expect(extractHost("https://www.example.com/path")).toBe("www.example.com")
    expect(extractHost("http://localhost:3000/x")).toBe("localhost:3000")
  })

  it("returns empty string for invalid URLs", () => {
    expect(extractHost("not-a-url")).toBe("")
  })
})

describe("prefix-rules storage (loadPrefixRules / savePrefixRules)", () => {
  const stored: Record<string, unknown> = {}

  beforeEach(() => {
    for (const key of Object.keys(stored)) delete stored[key]
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: stored[key] })),
          set: vi.fn(async (obj: Record<string, unknown>) => {
            Object.assign(stored, obj)
          }),
        },
      },
    })
  })

  it("round-trips rules through storage", async () => {
    const mod = await import("../prefix-rules")
    await mod.savePrefixRules([{ pattern: "example.com", prefix: "[ex]" }])
    expect(await mod.loadPrefixRules()).toEqual([
      { pattern: "example.com", prefix: "[ex]" },
    ])
  })

  it("returns an empty array when nothing is stored", async () => {
    const mod = await import("../prefix-rules")
    expect(await mod.loadPrefixRules()).toEqual([])
  })

  it("upserts: existing pattern is replaced, new pattern is appended", async () => {
    const mod = await import("../prefix-rules")
    await mod.savePrefixRules([{ pattern: "example.com", prefix: "[old]" }])
    await mod.upsertPrefixRule({ pattern: "example.com", prefix: "[new]" })
    await mod.upsertPrefixRule({ pattern: "other.com", prefix: "[other]" })
    expect(await mod.loadPrefixRules()).toEqual([
      { pattern: "example.com", prefix: "[new]" },
      { pattern: "other.com", prefix: "[other]" },
    ])
  })

  it("deletePrefixRule removes the matching pattern", async () => {
    const mod = await import("../prefix-rules")
    await mod.savePrefixRules([
      { pattern: "a.com", prefix: "[a]" },
      { pattern: "b.com", prefix: "[b]" },
    ])
    await mod.deletePrefixRule("a.com")
    expect(await mod.loadPrefixRules()).toEqual([
      { pattern: "b.com", prefix: "[b]" },
    ])
  })

  it("loadPrefixRules survives a thrown storage call", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async () => {
            throw new Error("simulated storage failure")
          }),
        },
      },
    })
    const mod = await import("../prefix-rules")
    expect(await mod.loadPrefixRules()).toEqual([])
  })
})
