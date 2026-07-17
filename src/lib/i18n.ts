import enMessages from "../../locales/en/messages.json"

/** Every message key available to the Options page, sourced from the
 * English locale file so the type stays in sync with `locales/en/messages.json`. */
export type OptionsMessageKey = keyof typeof enMessages

type Substitutions = string | string[]

/**
 * Thin wrapper around `chrome.i18n.getMessage` for the Options page.
 *
 * `chrome.i18n` isn't available in the jsdom test environment (and the
 * message for a given key may simply be missing from the active locale), so
 * every lookup falls back to the bundled English string in
 * `locales/en/messages.json`. This keeps components testable without
 * stubbing `chrome.i18n` and guarantees readable output even when a
 * translation hasn't shipped yet.
 */
export function t(key: OptionsMessageKey, substitutions?: Substitutions): string {
  const fromChrome = getChromeMessage(key, substitutions)
  if (fromChrome) return fromChrome
  return interpolate(enMessages[key].message, substitutions)
}

function getChromeMessage(
  key: OptionsMessageKey,
  substitutions?: Substitutions
): string | undefined {
  const i18n = typeof chrome !== "undefined" ? chrome.i18n : undefined
  if (!i18n?.getMessage) return undefined
  const message = i18n.getMessage(key, substitutions)
  return message ? message : undefined
}

function interpolate(message: string, substitutions?: Substitutions): string {
  if (!substitutions) return message
  const values = Array.isArray(substitutions) ? substitutions : [substitutions]
  return message.replace(/\$(\d+)/g, (_match, index: string) => {
    return values[Number(index) - 1] ?? ""
  })
}
