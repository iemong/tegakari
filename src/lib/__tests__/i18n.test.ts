import { afterEach, describe, expect, it, vi } from "vitest"

import enMessages from "../../../locales/en/messages.json"
import jaMessages from "../../../locales/ja/messages.json"
import { t } from "../i18n"

type MessageMap = Record<string, { message: string }>

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Reproduces chrome.i18n.getMessage's documented positional substitution
 * ($1, $2, $3 referring to the Nth entry of the substitutions array) against
 * a real messages.json map. Used to exercise the actual ja/en message
 * strings the way the real Chrome API would, since chrome.i18n itself isn't
 * available in jsdom.
 */
function chromeGetMessage(
  messages: MessageMap,
  key: string,
  substitutions?: string | string[]
): string {
  const entry = messages[key]
  if (!entry) return ""
  const values = Array.isArray(substitutions)
    ? substitutions
    : substitutions
      ? [substitutions]
      : []
  return entry.message.replace(/\$(\d+)/g, (_match, index: string) => {
    return values[Number(index) - 1] ?? ""
  })
}

describe("t()", () => {
  it("falls back to the English message when chrome.i18n is unavailable", () => {
    // jsdom has no `chrome` global at all by default.
    expect(t("options_common_save")).toBe("Save")
  })

  it("falls back to the English message when chrome.i18n.getMessage returns an empty string", () => {
    vi.stubGlobal("chrome", {
      i18n: { getMessage: vi.fn().mockReturnValue("") },
    })
    expect(t("options_common_save")).toBe("Save")
  })

  it("falls back to the English message when chrome exists but chrome.i18n does not", () => {
    vi.stubGlobal("chrome", {})
    expect(t("options_common_save")).toBe("Save")
  })

  it("returns the message resolved by chrome.i18n.getMessage when available", () => {
    const getMessage = vi.fn().mockReturnValue("保存")
    vi.stubGlobal("chrome", { i18n: { getMessage } })

    expect(t("options_common_save")).toBe("保存")
    expect(getMessage).toHaveBeenCalledWith("options_common_save", undefined)
  })

  it("forwards substitutions to chrome.i18n.getMessage", () => {
    const getMessage = vi.fn().mockReturnValue("Exported 3 rule(s).")
    vi.stubGlobal("chrome", { i18n: { getMessage } })

    expect(t("options_export_success", "3")).toBe("Exported 3 rule(s).")
    expect(getMessage).toHaveBeenCalledWith("options_export_success", "3")
  })

  it("interpolates a single substitution into the English fallback", () => {
    expect(t("options_export_success", "3")).toBe("Exported 3 rule(s).")
  })

  it("interpolates multiple substitutions into the English fallback in order", () => {
    expect(
      t("options_import_partial", ["2", "1", "bad pattern"])
    ).toBe("Imported 2 rule(s); skipped 1: bad pattern")
  })

  it("leaves unmatched placeholders empty when fewer substitutions are given", () => {
    expect(t("options_import_partial", ["2"])).toBe(
      "Imported 2 rule(s); skipped : "
    )
  })
})

describe("t() against the real ja locale via a chrome.i18n-shaped substitution", () => {
  it("substitutes a single placeholder into the real ja message", () => {
    const getMessage = vi.fn((key: string, subs?: string | string[]) =>
      chromeGetMessage(jaMessages, key, subs)
    )
    vi.stubGlobal("chrome", { i18n: { getMessage } })

    expect(t("options_export_success", "3")).toBe(
      "3件のルールをエクスポートしました。"
    )
  })

  it("substitutes multiple ordered placeholders into the real ja message", () => {
    const getMessage = vi.fn((key: string, subs?: string | string[]) =>
      chromeGetMessage(jaMessages, key, subs)
    )
    vi.stubGlobal("chrome", { i18n: { getMessage } })

    expect(
      t("options_import_partial", ["2", "1", "bad pattern"])
    ).toBe("2件のルールをインポートしました（1件をスキップ: bad pattern）")
  })

  it("substitutes a placeholder embedded next to translated text in the real ja message", () => {
    const getMessage = vi.fn((key: string, subs?: string | string[]) =>
      chromeGetMessage(jaMessages, key, subs)
    )
    vi.stubGlobal("chrome", { i18n: { getMessage } })

    expect(t("options_error_invalid_regex", "Unterminated group")).toBe(
      "正規表現が無効です: Unterminated group"
    )
  })
})

describe("locale file parity", () => {
  const enKeys = Object.keys(enMessages).sort()
  const jaKeys = Object.keys(jaMessages).sort()

  it("ja declares exactly the same keys as en (no missing or extra translations)", () => {
    expect(jaKeys).toEqual(enKeys)
  })

  it("every message avoids named $NAME$ placeholders now that positional $N substitution is used directly", () => {
    const allMessages = { ...enMessages, ...jaMessages } as MessageMap
    for (const [key, entry] of Object.entries(allMessages)) {
      expect(entry.message, key).not.toMatch(/\$[A-Za-z_]+\$/)
    }
  })

  it("ja uses the same set of $N substitution slots as en for every message", () => {
    const en = enMessages as MessageMap
    const ja = jaMessages as MessageMap
    for (const key of enKeys) {
      const enSlots = [...en[key].message.matchAll(/\$(\d+)/g)]
        .map((m) => m[1])
        .sort()
      const jaSlots = [...ja[key].message.matchAll(/\$(\d+)/g)]
        .map((m) => m[1])
        .sort()
      expect(jaSlots, key).toEqual(enSlots)
    }
  })
})
