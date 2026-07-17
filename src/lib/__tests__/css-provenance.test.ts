import { afterEach, describe, expect, it, vi } from "vitest"
import { collectCssProvenance } from "../css-provenance"

afterEach(() => {
  document.body.innerHTML = ""
  document.head.innerHTML = ""
  vi.restoreAllMocks()
})

function addStyle(css: string): HTMLStyleElement {
  const style = document.createElement("style")
  style.textContent = css
  document.head.appendChild(style)
  return style
}

function mount(el: HTMLElement): HTMLElement {
  document.body.appendChild(el)
  return el
}

describe("collectCssProvenance: matching", () => {
  it("collects a CSSStyleRule matching the element, with selector/source/declarations", () => {
    // Deliberately non-shorthand properties: jsdom's CSSOM expands a
    // shorthand like `padding: 8px` into its longhand components *and*
    // keeps the shorthand entry, so `style.length`/enumeration order for
    // shorthands is a jsdom-specific quirk this test avoids depending on.
    addStyle(".btn { color: red; font-weight: bold; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules).toEqual([
      {
        selector: ".btn",
        source: "inline",
        declarations: ["color: red", "font-weight: bold"],
      },
    ])
  })

  it("does not include rules that don't match the element", () => {
    addStyle(".other { color: red; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules).toBeUndefined()
  })

  it("keeps !important in the declaration value", () => {
    addStyle(".btn { color: red !important; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules?.[0].declarations).toEqual(["color: red !important"])
  })

  it("matches comma-separated selector lists", () => {
    addStyle(".a, .btn { color: red; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules?.[0].selector).toBe(".a, .btn")
  })

  it("returns {} for an element with no owner document window (detached document)", () => {
    const orphanDoc = document.implementation.createHTMLDocument("")
    const detached = orphanDoc.createElement("div")

    expect(collectCssProvenance(detached)).toEqual({})
  })
})

describe("collectCssProvenance: source naming", () => {
  it("reports 'inline' for <style>-tag rules", () => {
    addStyle(".btn { color: red; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    expect(collectCssProvenance(el).cssRules?.[0].source).toBe("inline")
  })

  it("reports the stylesheet's filename for <link> rules", () => {
    addStyle(".btn { color: red; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    // jsdom doesn't fetch external stylesheets, so simulate a loaded <link>
    // sheet by pointing the existing CSSStyleSheet's href getter at a URL.
    const sheet = document.styleSheets[0]
    Object.defineProperty(sheet, "href", {
      value: "https://example.com/assets/app.css?v=2",
      configurable: true,
    })

    expect(collectCssProvenance(el).cssRules?.[0].source).toBe("app.css")
  })
})

describe("collectCssProvenance: nested @media / @supports rules", () => {
  it("recurses into @media and records the condition text", () => {
    addStyle(`
      @media (min-width: 768px) {
        .btn { color: blue; }
      }
    `)
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules?.[0]).toEqual({
      selector: ".btn",
      source: "inline",
      declarations: ["color: blue"],
      media: "@media (min-width: 768px)",
    })
  })

  it("recurses into @supports and records the condition text", () => {
    addStyle(`
      @supports (display: grid) {
        .btn { display: grid; }
      }
    `)
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules?.[0].media).toBe("@supports (display: grid)")
  })

  it("does not record a media condition for top-level (non-nested) rules", () => {
    addStyle(".btn { color: red; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    expect(collectCssProvenance(el).cssRules?.[0].media).toBeUndefined()
  })
})

describe("collectCssProvenance: cross-origin stylesheets", () => {
  it("silently skips a stylesheet whose cssRules getter throws", () => {
    // jsdom doesn't perform real network fetches for <link rel="stylesheet">
    // in the test environment, so a genuinely cross-origin sheet never gets
    // an entry in `document.styleSheets` to exercise in the first place.
    // Real browsers *do* add cross-origin sheets to `styleSheets` but throw
    // a SecurityError on `.cssRules` access — simulated here by overriding
    // the getter on an ordinary same-origin sheet, which throws identically
    // from this module's point of view.
    const crossOriginLike = addStyle(".ignored { color: green; }")
    const throwingSheet = crossOriginLike.sheet
    expect(throwingSheet).not.toBeNull()
    Object.defineProperty(throwingSheet, "cssRules", {
      get() {
        throw new DOMException("cssRules access denied", "SecurityError")
      },
      configurable: true,
    })
    // Same-origin rule (in a separate sheet) that should still be found. No
    // var() reference here: jsdom's own getComputedStyle() re-reads every
    // stylesheet's cssRules internally, so it would also blow up on the
    // simulated exception above if this module called it unconditionally —
    // collectCssProvenance only calls getComputedStyle lazily, when a
    // matched declaration actually references a custom property.
    addStyle(".btn { color: red; }")

    const el = mount(document.createElement("div"))
    el.className = "btn"

    expect(() => collectCssProvenance(el)).not.toThrow()
    const result = collectCssProvenance(el)
    expect(result.cssRules).toEqual([
      { selector: ".btn", source: "inline", declarations: ["color: red"] },
    ])
  })
})

describe("collectCssProvenance: limits", () => {
  it("caps at 10 rules, newest-declared first", () => {
    const classes = "abcdefghijkl".split("") // 12 single-letter classes
    addStyle(classes.map((c) => `.${c} { color: red; }`).join("\n"))
    const el = mount(document.createElement("div"))
    el.className = classes.join(" ")

    const result = collectCssProvenance(el)

    expect(result.cssRules).toHaveLength(10)
    // Newest-declared (.l, the last rule in the stylesheet) comes first;
    // the two oldest matches (.a, .b) are dropped.
    expect(result.cssRules?.map((r) => r.selector)).toEqual([
      ".l",
      ".k",
      ".j",
      ".i",
      ".h",
      ".g",
      ".f",
      ".e",
      ".d",
      ".c",
    ])
  })

  it("caps declarations at 15 per rule", () => {
    const props = [
      "color",
      "background-color",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "text-align",
      "text-decoration",
      "text-transform",
      "text-indent",
      "white-space",
      "word-break",
      "overflow-wrap",
      "vertical-align",
      "cursor",
      "opacity",
      "visibility",
      "z-index",
      "position",
      "display",
    ]
    expect(props.length).toBe(20)
    const declBlock = props.map((p) => `${p}: initial;`).join(" ")
    addStyle(`.btn { ${declBlock} }`)
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules?.[0].declarations).toHaveLength(15)
  })
})

describe("collectCssProvenance: CSS custom properties", () => {
  // jsdom's CSS engine does not implement custom-property resolution: it
  // always returns "" from getComputedStyle(...).getPropertyValue("--x"),
  // even when a matching declaration is visibly present in the CSSOM (see
  // the "declares var()..." test below, which confirms raw declaration text
  // is read correctly independent of this limitation). getComputedStyle is
  // stubbed here to exercise the resolution/limit logic in isolation.
  it("resolves custom properties referenced via var() in matched declarations", () => {
    addStyle(".btn { background-color: var(--brand-color); }")
    const el = mount(document.createElement("div"))
    el.className = "btn"
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (prop: string) =>
        prop === "--brand-color" ? "rgb(37, 99, 235)" : "",
    } as unknown as CSSStyleDeclaration)

    const result = collectCssProvenance(el)

    expect(result.customProperties).toEqual({ "--brand-color": "rgb(37, 99, 235)" })
  })

  it("declares var() in the raw declaration text regardless of computed-style resolution", () => {
    addStyle(".btn { background-color: var(--brand-color); }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    const result = collectCssProvenance(el)

    expect(result.cssRules?.[0].declarations).toEqual([
      "background-color: var(--brand-color)",
    ])
  })

  it("omits a referenced custom property when it resolves to an empty value", () => {
    addStyle(".btn { color: var(--unset-color); }")
    const el = mount(document.createElement("div"))
    el.className = "btn"
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration)

    const result = collectCssProvenance(el)

    expect(result.customProperties).toBeUndefined()
  })

  it("caps resolved custom properties at 10", () => {
    const decls = Array.from({ length: 12 }, (_, i) => `--x${i}: var(--v${i});`).join(
      " "
    )
    addStyle(`.btn { ${decls} }`)
    const el = mount(document.createElement("div"))
    el.className = "btn"
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (prop: string) => `resolved(${prop})`,
    } as unknown as CSSStyleDeclaration)

    const result = collectCssProvenance(el)

    expect(Object.keys(result.customProperties ?? {})).toHaveLength(10)
  })

  it("is absent when no declaration references var()", () => {
    addStyle(".btn { color: red; }")
    const el = mount(document.createElement("div"))
    el.className = "btn"

    expect(collectCssProvenance(el).customProperties).toBeUndefined()
  })
})

describe("collectCssProvenance: same-origin iframe elements", () => {
  it("resolves rules from the iframe's own document, not the top document's", () => {
    // Distractor: a same-class rule in the *top* document that must not leak
    // into the iframe element's result.
    addStyle(".btn { color: purple; }")

    const iframe = document.createElement("iframe")
    mount(iframe)
    const iframeDoc = iframe.contentDocument!
    const iframeStyle = iframeDoc.createElement("style")
    iframeStyle.textContent = ".btn { color: teal; }"
    iframeDoc.head.appendChild(iframeStyle)
    const iframeEl = iframeDoc.createElement("div")
    iframeEl.className = "btn"
    iframeDoc.body.appendChild(iframeEl)

    const result = collectCssProvenance(iframeEl)

    expect(result.cssRules).toEqual([
      { selector: ".btn", source: "inline", declarations: ["color: teal"] },
    ])
  })
})

describe("collectCssProvenance: performance cutoff", () => {
  it("stops scanning after 5000 rules and still returns matches found before the cutoff", () => {
    const ruleCount = 5010
    const css = Array.from(
      { length: ruleCount },
      (_, i) => `.c${i} { color: red; }`
    ).join("\n")
    addStyle(css)

    const el = mount(document.createElement("div"))
    // .c0 is scanned well before the 5000-rule cutoff...
    el.classList.add("c0")
    // ...but .c5005 is declared past it and must be missed once scanning
    // stops partway through the sheet.
    el.classList.add("c5005")

    const result = collectCssProvenance(el)
    const selectors = result.cssRules?.map((r) => r.selector) ?? []

    expect(selectors).toContain(".c0")
    expect(selectors).not.toContain(".c5005")
  })
})
