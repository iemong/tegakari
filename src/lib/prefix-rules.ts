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
    if (rule.isRegex) {
      try {
        if (new RegExp(rule.pattern).test(url)) {
          return rule.prefix
        }
      } catch {
        // invalid regex, skip
      }
    } else {
      if (host === rule.pattern || host.endsWith(`.${rule.pattern}`)) {
        return rule.prefix
      }
    }
  }
  return null
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
