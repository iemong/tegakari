import type { PrefixRule } from "./types"

const STORAGE_KEY = "tegakariPrefixRules"

export async function loadPrefixRules(): Promise<PrefixRule[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return result[STORAGE_KEY] ?? []
  } catch {
    return []
  }
}

export async function savePrefixRules(rules: PrefixRule[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: rules })
  } catch {
    // silently fail
  }
}

export async function upsertPrefixRule(rule: PrefixRule): Promise<void> {
  const rules = await loadPrefixRules()
  const idx = rules.findIndex((r) => r.pattern === rule.pattern)
  if (idx >= 0) {
    rules[idx] = rule
  } else {
    rules.push(rule)
  }
  await savePrefixRules(rules)
}

export async function deletePrefixRule(pattern: string): Promise<void> {
  const rules = await loadPrefixRules()
  await savePrefixRules(rules.filter((r) => r.pattern !== pattern))
}

/** Find a matching prefix for the given URL. First match wins. */
export function findMatchingPrefix(
  rules: PrefixRule[],
  url: string
): string | null {
  let host: string
  try {
    host = new URL(url).host
  } catch {
    return null
  }

  for (const rule of rules) {
    if (ruleMatches(rule, url, host)) {
      return rule.prefix
    }
  }
  return null
}

function ruleMatches(rule: PrefixRule, url: string, host: string): boolean {
  if (rule.isRegex) {
    try {
      return new RegExp(rule.pattern).test(url)
    } catch {
      // invalid regex, skip
      return false
    }
  }
  return host === rule.pattern || host.endsWith(`.${rule.pattern}`)
}

/**
 * Normalize a user-entered pattern into a hostname (with optional port) so
 * host-mode rules match regardless of whether the user pasted a full URL,
 * a scheme-less prefix, or a bare hostname.
 *
 * Examples:
 *   "https://github.com/foo/bar"  -> "github.com"
 *   "http://localhost:3000/x"     -> "localhost:3000"
 *   "example.com/path"            -> "example.com"
 *   " www.example.com "           -> "www.example.com"
 *   "localhost:3000"              -> "localhost:3000"
 *   ""                            -> ""
 *   "not a host"                  -> "not a host" (left untouched as a last
 *                                    resort; the matcher will just never hit)
 */
export function normalizePattern(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ""

  // 1) Full URL with a scheme — let URL extract the authority for us.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).host
    } catch {
      // fall through
    }
  }

  // 2) Strip anything after the first '/' so "example.com/path" becomes
  //    "example.com" before we try to parse it.
  const beforeSlash = trimmed.split("/")[0]

  // 3) Parse as host[:port] by prepending an http:// scheme. This handles
  //    bare "example.com" and "localhost:3000".
  try {
    return new URL(`http://${beforeSlash}`).host
  } catch {
    return trimmed
  }
}

/**
 * Serialize rules to a stable, human-editable JSON string. Keys are emitted
 * in a fixed order (pattern, prefix, isRegex) so diffs across exports stay
 * readable and the file can be hand-edited.
 */
export function serializeRules(rules: PrefixRule[]): string {
  const ordered = rules.map((r) => {
    const out: PrefixRule = { pattern: r.pattern, prefix: r.prefix }
    if (r.isRegex) out.isRegex = true
    return out
  })
  return JSON.stringify(ordered, null, 2) + "\n"
}

export type ParsedRulesResult = {
  rules: PrefixRule[]
  errors: string[]
}

/**
 * Parse rules from a JSON string. Invalid individual entries are skipped and
 * collected into `errors` so the UI can surface a partial success. Returns
 * `{ rules: [], errors: [...] }` when the input is not even a JSON array.
 */
export function parseRules(text: string): ParsedRulesResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { rules: [], errors: [`Invalid JSON: ${(e as Error).message}`] }
  }
  if (!Array.isArray(raw)) {
    return { rules: [], errors: ["Expected a JSON array of rules"] }
  }

  const rules: PrefixRule[] = []
  const errors: string[] = []

  raw.forEach((entry, idx) => {
    const result = parseRuleEntry(entry, `entry #${idx + 1}`)
    if ("error" in result) {
      errors.push(result.error)
    } else {
      rules.push(result.rule)
    }
  })

  return { rules, errors }
}

type ParsedRuleEntry = { rule: PrefixRule } | { error: string }

function parseRuleEntry(entry: unknown, label: string): ParsedRuleEntry {
  if (typeof entry !== "object" || entry === null) {
    return { error: `${label}: not an object` }
  }
  const e = entry as Record<string, unknown>
  const pattern = typeof e.pattern === "string" ? e.pattern.trim() : ""
  const prefix = typeof e.prefix === "string" ? e.prefix.trim() : ""
  const isRegex = typeof e.isRegex === "boolean" ? e.isRegex : false

  if (!pattern || !prefix) {
    return { error: `${label}: 'pattern' and 'prefix' are required strings` }
  }
  if (isRegex) {
    const regexErr = validateRegex(pattern)
    if (regexErr) {
      return { error: `${label}: invalid regex ('${pattern}'): ${regexErr}` }
    }
    return { rule: { pattern, prefix, isRegex: true } }
  }
  return { rule: { pattern: normalizePattern(pattern), prefix } }
}

/**
 * Merge imported rules into existing ones. Rules with the same pattern are
 * overwritten in place; new patterns are appended at the end. Order of
 * existing rules is preserved so users can keep their priority intact.
 */
export function mergeRules(
  existing: PrefixRule[],
  imported: PrefixRule[]
): PrefixRule[] {
  const byPattern = new Map<string, number>()
  existing.forEach((r, i) => byPattern.set(r.pattern, i))

  const merged = existing.map((r) => ({ ...r }))
  for (const rule of imported) {
    const idx = byPattern.get(rule.pattern)
    if (idx !== undefined) {
      merged[idx] = rule
    } else {
      byPattern.set(rule.pattern, merged.length)
      merged.push(rule)
    }
  }
  return merged
}

/** Validate a regex pattern. Returns null if valid, error message if invalid. */
export function validateRegex(pattern: string): string | null {
  try {
    new RegExp(pattern)
    return null
  } catch (e) {
    return (e as Error).message
  }
}

/** Extract host from URL for use as default pattern */
export function extractHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ""
  }
}
