import { expect, it, vi } from "vitest"

import {
  extractHost,
  findMatchingPrefix,
  normalizePattern,
  validateRegex,
} from "../prefix-rules"

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
])("normalizePattern: normalizes %j -> %j", (input, expected) => {
  expect(normalizePattern(input)).toBe(expected)
})

it("normalizePattern: normalizes URLs whose host has an explicit port", () => {
  expect(normalizePattern("https://example.com:8443/x")).toBe(
    "example.com:8443"
  )
})

it("findMatchingPrefix: returns null when no rules are provided", () => {
  expect(findMatchingPrefix([], "https://example.com/")).toBeNull()
})

it("findMatchingPrefix: matches exact host", () => {
  expect(
    findMatchingPrefix(
      [{ pattern: "github.com", prefix: "[gh]" }],
      "https://github.com/foo"
    )
  ).toBe("[gh]")
})

it("findMatchingPrefix: matches subdomain via dot-suffix rule", () => {
  expect(
    findMatchingPrefix(
      [{ pattern: "example.com", prefix: "[ex]" }],
      "https://www.example.com/"
    )
  ).toBe("[ex]")
})

it("findMatchingPrefix: requires port match for host:port patterns", () => {
  const rules = [{ pattern: "localhost:3000", prefix: "[local]" }]
  expect(findMatchingPrefix(rules, "http://localhost:3000/x")).toBe("[local]")
  // Different port → miss.
  expect(findMatchingPrefix(rules, "http://localhost:4000/x")).toBeNull()
})

it("findMatchingPrefix: returns null for invalid URLs", () => {
  expect(
    findMatchingPrefix([{ pattern: "example.com", prefix: "[x]" }], "not-a-url")
  ).toBeNull()
})

it("findMatchingPrefix: returns first matching rule (order matters)", () => {
  const rules = [
    { pattern: "example.com", prefix: "[outer]" },
    { pattern: "www.example.com", prefix: "[inner]" },
  ]
  expect(findMatchingPrefix(rules, "https://www.example.com/")).toBe("[outer]")
})

it("findMatchingPrefix: supports regex rules", () => {
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
  expect(
    findMatchingPrefix(rules, "https://github.com/iemong/other")
  ).toBeNull()
})

it("findMatchingPrefix: skips invalid regex without throwing", () => {
  const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  const rules = [
    { pattern: "(unclosed", prefix: "[bad]", isRegex: true },
    { pattern: "example.com", prefix: "[ok]" },
  ]
  // The bad regex is silently skipped, the valid host rule still matches.
  expect(findMatchingPrefix(rules, "https://example.com/")).toBe("[ok]")
  consoleSpy.mockRestore()
})

it("validateRegex: returns null for valid regex", () => {
  expect(validateRegex(".*")).toBeNull()
  expect(validateRegex("^foo$")).toBeNull()
})

it("validateRegex: returns an error message for invalid regex", () => {
  expect(validateRegex("(unclosed")).toMatch(/./)
})

it("extractHost: returns host for valid URLs", () => {
  expect(extractHost("https://www.example.com/path")).toBe("www.example.com")
  expect(extractHost("http://localhost:3000/x")).toBe("localhost:3000")
})

it("extractHost: returns empty string for invalid URLs", () => {
  expect(extractHost("not-a-url")).toBe("")
})
