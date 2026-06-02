import { beforeEach, expect, it, vi } from "vitest"

import { mergeRules, parseRules, serializeRules } from "../prefix-rules"

it("serializeRules: emits a stable, key-ordered, newline-terminated JSON array", () => {
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
      "  {",
      '    "pattern": "github.com",',
      '    "prefix": "[gh]"',
      "  },",
      "  {",
      '    "pattern": "^https://example\\\\.com",',
      '    "prefix": "[ex]",',
      '    "isRegex": true',
      "  }",
      "]",
      "",
    ].join("\n")
  )
})

it("serializeRules: omits isRegex when false", () => {
  const text = serializeRules([
    { pattern: "github.com", prefix: "[gh]", isRegex: false },
  ])
  expect(text).not.toContain("isRegex")
})

it("serializeRules: round-trips through parseRules", () => {
  const rules = [
    { pattern: "github.com", prefix: "[gh]" },
    { pattern: "^https://example\\.com", prefix: "[ex]", isRegex: true },
  ]
  const text = serializeRules(rules)
  const parsed = parseRules(text)
  expect(parsed.errors).toEqual([])
  expect(parsed.rules).toEqual(rules)
})

it("parseRules: rejects non-JSON input with a single error", () => {
  const r = parseRules("not json at all {")
  expect(r.rules).toEqual([])
  expect(r.errors).toHaveLength(1)
  expect(r.errors[0]).toMatch(/Invalid JSON/)
})

it("parseRules: rejects a non-array root", () => {
  const r = parseRules('{"pattern":"x","prefix":"y"}')
  expect(r.rules).toEqual([])
  expect(r.errors).toEqual(["Expected a JSON array of rules"])
})

it("parseRules: normalizes host-mode patterns on import", () => {
  const r = parseRules(
    JSON.stringify([
      { pattern: "https://github.com/iemong/tegakari", prefix: "[gh]" },
    ])
  )
  expect(r.errors).toEqual([])
  expect(r.rules).toEqual([{ pattern: "github.com", prefix: "[gh]" }])
})

it("parseRules: keeps regex patterns verbatim", () => {
  const src = "^https://github\\.com/[^/]+/tegakari"
  const r = parseRules(
    JSON.stringify([{ pattern: src, prefix: "[t]", isRegex: true }])
  )
  expect(r.rules).toEqual([{ pattern: src, prefix: "[t]", isRegex: true }])
})

it("parseRules: skips entries with missing required fields and reports them", () => {
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

it("parseRules: skips entries with invalid regex", () => {
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

it("parseRules: trims whitespace around pattern and prefix", () => {
  const r = parseRules(
    JSON.stringify([{ pattern: "  github.com  ", prefix: "  [gh]  " }])
  )
  expect(r.rules).toEqual([{ pattern: "github.com", prefix: "[gh]" }])
})

it("mergeRules: overwrites existing rules with the same pattern in place", () => {
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

it("mergeRules: appends new patterns at the end", () => {
  const merged = mergeRules(
    [{ pattern: "a.com", prefix: "[a]" }],
    [{ pattern: "b.com", prefix: "[b]" }]
  )
  expect(merged).toEqual([
    { pattern: "a.com", prefix: "[a]" },
    { pattern: "b.com", prefix: "[b]" },
  ])
})

it("mergeRules: preserves the order of existing rules", () => {
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

it("mergeRules: returns existing untouched when imported is empty", () => {
  const existing = [{ pattern: "a.com", prefix: "[a]" }]
  expect(mergeRules(existing, [])).toEqual(existing)
})

it("mergeRules: does not mutate the input arrays", () => {
  const existing = [{ pattern: "a.com", prefix: "[a]" }]
  const imported = [{ pattern: "a.com", prefix: "[a-new]" }]
  mergeRules(existing, imported)
  expect(existing).toEqual([{ pattern: "a.com", prefix: "[a]" }])
  expect(imported).toEqual([{ pattern: "a.com", prefix: "[a-new]" }])
})

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

it("prefix-rules storage: round-trips rules through storage", async () => {
  const mod = await import("../prefix-rules")
  await mod.savePrefixRules([{ pattern: "example.com", prefix: "[ex]" }])
  expect(await mod.loadPrefixRules()).toEqual([
    { pattern: "example.com", prefix: "[ex]" },
  ])
})

it("prefix-rules storage: returns an empty array when nothing is stored", async () => {
  const mod = await import("../prefix-rules")
  expect(await mod.loadPrefixRules()).toEqual([])
})

it("prefix-rules storage: upserts: existing pattern is replaced, new pattern is appended", async () => {
  const mod = await import("../prefix-rules")
  await mod.savePrefixRules([{ pattern: "example.com", prefix: "[old]" }])
  await mod.upsertPrefixRule({ pattern: "example.com", prefix: "[new]" })
  await mod.upsertPrefixRule({ pattern: "other.com", prefix: "[other]" })
  expect(await mod.loadPrefixRules()).toEqual([
    { pattern: "example.com", prefix: "[new]" },
    { pattern: "other.com", prefix: "[other]" },
  ])
})

it("prefix-rules storage: deletePrefixRule removes the matching pattern", async () => {
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

it("prefix-rules storage: loadPrefixRules survives a thrown storage call", async () => {
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
