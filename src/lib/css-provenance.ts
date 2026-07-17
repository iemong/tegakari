// Collect same-origin CSS rules that match the selected element, so AI
// editors can see *which file/selector* a computed style value came from
// (not just the resolved value). Complements style-collector.ts, which only
// reports the computed-style diff.

import type { CssRuleInfo } from "./types"

const MAX_RULES = 10
const MAX_DECLARATIONS_PER_RULE = 15
const MAX_CUSTOM_PROPERTIES = 10
// Safety valve for pathological pages (huge inlined frameworks, atomic CSS):
// stop scanning once this many rules (across all sheets/nesting) were visited
// and return whatever matched so far.
const MAX_SCANNED_RULES = 5000

const VAR_PATTERN = /var\(\s*(--[\w-]+)/g

export interface CssProvenance {
  cssRules?: CssRuleInfo[]
  customProperties?: Record<string, string>
}

/**
 * Walk `element.ownerDocument.styleSheets` (so same-origin iframe elements
 * use their own iframe document automatically) and collect matching rules
 * plus any CSS custom properties their declarations reference.
 */
export function collectCssProvenance(element: Element): CssProvenance {
  const doc = element.ownerDocument
  const win = doc?.defaultView
  if (!doc || !win) return {}

  const cssRules = capRules(scanStylesheets(doc, element))

  const result: CssProvenance = {}
  if (cssRules.length > 0) result.cssRules = cssRules

  const customProperties = resolveCustomProperties(cssRules, win, element)
  if (customProperties) result.customProperties = customProperties

  return result
}

interface ScanCtx {
  element: Element
  source: string
  matches: CssRuleInfo[]
  state: { count: number }
}

// Matches in document order (later sheets/rules win the cascade on ties);
// capRules() takes the newest ones and reverses to newest-first.
function scanStylesheets(doc: Document, element: Element): CssRuleInfo[] {
  const matches: CssRuleInfo[] = []
  const state = { count: 0 }
  for (const sheet of Array.from(doc.styleSheets)) {
    if (state.count >= MAX_SCANNED_RULES) break
    let rules: CSSRuleList
    try {
      // Throws (SecurityError) for cross-origin stylesheets — skip silently.
      rules = sheet.cssRules
    } catch {
      continue
    }
    if (!rules) continue
    const ctx: ScanCtx = { element, source: sheetSource(sheet), matches, state }
    collectFromRuleList(rules, [], ctx)
  }
  return matches
}

function collectFromRuleList(rules: CSSRuleList, conditions: string[], ctx: ScanCtx): void {
  for (const rule of Array.from(rules)) {
    if (ctx.state.count >= MAX_SCANNED_RULES) return
    ctx.state.count++
    processRule(rule, conditions, ctx)
  }
}

// Matches CSSStyleRules against the element, then recurses at least one
// level into any grouping rule (CSSMediaRule, CSSSupportsRule, native CSS
// nesting, @layer, ...), threading the accumulated @media/@supports
// condition text down so nested matches record it.
//
// Rule-kind checks use the numeric `rule.type` rather than `instanceof
// CSSStyleRule`/`CSSMediaRule`/`CSSSupportsRule`: a same-origin iframe's
// rules come from that iframe window's own realm, so `instanceof` against
// *this* module's global constructors would silently be false for every
// iframe rule (cross-realm `instanceof` always fails, even for identical,
// same-origin classes — a plain number on the rule object is realm-safe).
function processRule(rule: CSSRule, conditions: string[], ctx: ScanCtx): void {
  if (rule.type === CSSRule.STYLE_RULE) {
    matchStyleRule(rule as CSSStyleRule, conditions, ctx)
  }
  const nested = (rule as unknown as { cssRules?: CSSRuleList }).cssRules
  if (!nested) return
  const condition = conditionText(rule)
  collectFromRuleList(nested, condition ? [...conditions, condition] : conditions, ctx)
}

function matchStyleRule(rule: CSSStyleRule, conditions: string[], ctx: ScanCtx): void {
  let isMatch: boolean
  try {
    isMatch = ctx.element.matches(rule.selectorText)
  } catch {
    // Invalid/unsupported selector (e.g. vendor-prefixed pseudo-class) — skip.
    isMatch = false
  }
  if (!isMatch) return

  const info: CssRuleInfo = {
    selector: rule.selectorText,
    source: ctx.source,
    declarations: ruleDeclarations(rule.style),
  }
  if (conditions.length > 0) info.media = conditions.join(" ")
  ctx.matches.push(info)
}

function conditionText(rule: CSSRule): string | null {
  if (rule.type === CSSRule.MEDIA_RULE) {
    return `@media ${(rule as CSSMediaRule).media.mediaText}`
  }
  if (rule.type === CSSRule.SUPPORTS_RULE) {
    return `@supports ${(rule as CSSSupportsRule).conditionText}`
  }
  return null
}

function ruleDeclarations(style: CSSStyleDeclaration): string[] {
  const decls: string[] = []
  for (let i = 0; i < style.length && decls.length < MAX_DECLARATIONS_PER_RULE; i++) {
    const prop = style.item(i)
    const value = style.getPropertyValue(prop)
    const priority = style.getPropertyPriority(prop)
    decls.push(`${prop}: ${value}${priority ? " !important" : ""}`)
  }
  return decls
}

// Newest-first, capped: the last MAX_RULES matches in document order (i.e.
// the ones "closest to winning" the cascade on a specificity tie), reversed
// so the most recently-declared rule appears first.
function capRules(matches: CssRuleInfo[]): CssRuleInfo[] {
  return matches.slice(-MAX_RULES).reverse()
}

function sheetSource(sheet: CSSStyleSheet): string {
  if (!sheet.href) return "inline"
  try {
    const filename = new URL(sheet.href).pathname.split("/").pop()
    return filename ? filename : sheet.href
  } catch {
    return sheet.href
  }
}

function extractVarNames(rules: CssRuleInfo[]): Set<string> {
  const names = new Set<string>()
  for (const rule of rules) {
    for (const decl of rule.declarations) {
      for (const match of decl.matchAll(VAR_PATTERN)) {
        if (names.size >= MAX_CUSTOM_PROPERTIES) return names
        names.add(match[1])
      }
    }
  }
  return names
}

// getComputedStyle() is only called when a declaration actually references
// var(--x) (rare relative to the total number of picks) — both for
// performance and because it's the one call in this module that can't be
// protected by scoping try/catch to a single stylesheet (see the cross-origin
// test in css-provenance.test.ts for why it's wrapped defensively here too).
function resolveCustomProperties(
  rules: CssRuleInfo[],
  win: Window & typeof globalThis,
  element: Element
): Record<string, string> | undefined {
  const names = extractVarNames(rules)
  if (names.size === 0) return undefined

  let computed: CSSStyleDeclaration
  try {
    computed = win.getComputedStyle(element)
  } catch {
    return undefined
  }

  const result: Record<string, string> = {}
  for (const name of names) {
    const value = computed.getPropertyValue(name).trim()
    if (value) result[name] = value
  }
  return Object.keys(result).length > 0 ? result : undefined
}
