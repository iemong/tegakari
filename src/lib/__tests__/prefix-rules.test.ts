import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  extractHost,
  findMatchingPrefix,
  mergeRules,
  normalizePattern,
  parseRules,
  serializeRules,
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

describe("serializeRules", () => {
  it("emits a stable, key-ordered, newline-terminated JSON array", () => {
    const text = serializeRules([
      { pattern: "github.com", prefix: "[gh]" },
      {
        pattern: "^https://example\\.com",
        prefix: "[ex]",
        isRegex: true,
      },
    ])
    expect(text).toBe(
      [
        "[",
        '  {',
        '    "pattern": "github.com",',
        '    "prefix": "[gh]"',
        '  },',
        '  {',
        '    "pattern": "^https://example\\\\.com",',
        '    "prefix": "[ex]",',
        '    "isRegex": true',
        '  }',
        "]",
        "",
      ].join("\n")
    )
  })

  it("omits isRegex when false", () => {
    const text = serializeRules([
      { pattern: "github.com", prefix: "[gh]", isRegex: false },
    ])
    expect(text).not.toContain("isRegex")
  })

  it("round-trips through parseRules", () => {
    const rules = [
      { pattern: "github.com", prefix: "[gh]" },
      { pattern: "^https://example\\.com", prefix: "[ex]", isRegex: true },
    ]
    const text = serializeRules(rules)
    const parsed = parseRules(text)
    expect(parsed.errors).toEqual([])
    expect(parsed.rules).toEqual(rules)
  })
})

describe("parseRules", () => {
  it("rejects non-JSON input with a single error", () => {
    const r = parseRules("not json at all {")
    expect(r.rules).toEqual([])
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toMatch(/Invalid JSON/)
  })

  it("rejects a non-array root", () => {
    const r = parseRules('{"pattern":"x","prefix":"y"}')
    expect(r.rules).toEqual([])
    expect(r.errors).toEqual(["Expected a JSON array of rules"])
  })

  it("normalizes host-mode patterns on import", () => {
    const r = parseRules(
      JSON.stringify([
        { pattern: "https://github.com/iemong/tegakari", prefix: "[gh]" },
      ])
    )
    expect(r.errors).toEqual([])
    expect(r.rules).toEqual([{ pattern: "github.com", prefix: "[gh]" }])
  })

  it("keeps regex patterns verbatim", () => {
    const src = "^https://github\\.com/[^/]+/tegakari"
    const r = parseRules(
      JSON.stringify([{ pattern: src, prefix: "[t]", isRegex: true }])
    )
    expect(r.rules).toEqual([{ pattern: src, prefix: "[t]", isRegex: true }])
  })

  it("skips entries with missing required fields and reports them", () => {
    const r = parseRules(
      JSON.stringify([
        { pattern: "github.com", prefix: "[ok]" },
        { pattern: "", prefix: "[bad]" },
        { prefix: "[no-pattern]" },
        "not-an-object",
      ])
    )
    expect(r.rules).toEqual([{ pattern: "github.com", prefix: "[ok]" }])
    expect(r.errors).toHaveLength(3)
    expect(r.errors.join("|")).toMatch(/entry #2/)
    expect(r.errors.join("|")).toMatch(/entry #3/)
    expect(r.errors.join("|")).toMatch(/entry #4/)
  })

  it("skips entries with invalid regex", () => {
    const r = parseRules(
      JSON.stringify([
        { pattern: "(unclosed", prefix: "[bad]", isRegex: true },
        { pattern: "github.com", prefix: "[ok]" },
      ])
    )
    expect(r.rules).toEqual([{ pattern: "github.com", prefix: "[ok]" }])
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toMatch(/invalid regex/)
  })

  it("trims whitespace around pattern and prefix", () => {
    const r = parseRules(
      JSON.stringify([{ pattern: "  github.com  ", prefix: "  [gh]  " }])
    )
    expect(r.rules).toEqual([{ pattern: "github.com", prefix: "[gh]" }])
  })
})

describe("mergeRules", () => {
  it("overwrites existing rules with the same pattern in place", () => {
    const merged = mergeRules(
      [
        { pattern: "a.com", prefix: "[a-old]" },
        { pattern: "b.com", prefix: "[b]" },
      ],
      [{ pattern: "a.com", prefix: "[a-new]" }]
    )
    expect(merged).toEqual([
      { pattern: "a.com", prefix: "[a-new]" },
      { pattern: "b.com", prefix: "[b]" },
    ])
  })

  it("appends new patterns at the end", () => {
    const merged = mergeRules(
      [{ pattern: "a.com", prefix: "[a]" }],
      [{ pattern: "b.com", prefix: "[b]" }]
    )
    expect(merged).toEqual([
      { pattern: "a.com", prefix: "[a]" },
      { pattern: "b.com", prefix: "[b]" },
    ])
  })

  it("preserves the order of existing rules", () => {
    const merged = mergeRules(
      [
        { pattern: "a.com", prefix: "[a]" },
        { pattern: "b.com", prefix: "[b]" },
        { pattern: "c.com", prefix: "[c]" },
      ],
      [
        { pattern: "b.com", prefix: "[b-new]" },
        { pattern: "d.com", prefix: "[d]" },
      ]
    )
    expect(merged.map((r) => r.pattern)).toEqual([
      "a.com",
      "b.com",
      "c.com",
      "d.com",
    ])
    expect(merged[1].prefix).toBe("[b-new]")
  })

  it("returns existing untouched when imported is empty", () => {
    const existing = [{ pattern: "a.com", prefix: "[a]" }]
    expect(mergeRules(existing, [])).toEqual(existing)
  })

  it("does not mutate the input arrays", () => {
    const existing = [{ pattern: "a.com", prefix: "[a]" }]
    const imported = [{ pattern: "a.com", prefix: "[a-new]" }]
    mergeRules(existing, imported)
    expect(existing).toEqual([{ pattern: "a.com", prefix: "[a]" }])
    expect(imported).toEqual([{ pattern: "a.com", prefix: "[a-new]" }])
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
