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

/** Find a matching prefix for the given URL */
export function findMatchingPrefix(
  rules: PrefixRule[],
  url: string
): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.host // e.g., "localhost:3000", "example.com"

    for (const rule of rules) {
      if (host === rule.pattern || host.endsWith(`.${rule.pattern}`)) {
        return rule.prefix
      }
    }
  } catch {
    // invalid URL
  }
  return null
}

/** Extract host from URL for use as default pattern */
export function extractHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ""
  }
}
