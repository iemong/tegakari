import type { FrameworkInfo } from "./types"

const win = window as any

export function detectFramework(): FrameworkInfo | null {
  const framework = detectBaseFramework()
  const metaFramework = detectMetaFramework()

  if (!framework && !metaFramework) return null

  return { framework, metaFramework }
}

function detectBaseFramework(): string | null {
  try {
    if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) return "React"
  } catch {
    // ignore
  }
  try {
    if (win.__VUE__) return "Vue"
    if (win.__vue__) return "Vue"
  } catch {
    // ignore
  }
  const svelteResult = detectSvelte()
  if (svelteResult) return svelteResult
  return null
}

function detectMetaFramework(): string | null {
  // Next.js
  const nextResult = detectNextJs()
  if (nextResult) return nextResult

  // Nuxt
  const nuxtResult = detectNuxt()
  if (nuxtResult) return nuxtResult

  // SvelteKit
  const svelteKitResult = detectSvelteKit()
  if (svelteKitResult) return svelteKitResult

  return null
}

// Svelte's runtime registers itself on `window.__svelte.v` (a Set of major
// version strings) to warn about multiple Svelte instances on one page. This
// works in dev *and* prod builds. `__svelte_meta`/scoped-style class names
// are dev-only / heuristic fallbacks for older or minified builds where the
// version registry isn't present.
function detectSvelte(): string | null {
  try {
    const version = detectSvelteVersion(win.__svelte)
    if (version) return version
  } catch {
    // ignore
  }
  try {
    if (document.querySelector('[class*="svelte-"]')) return "Svelte"
  } catch {
    // ignore
  }
  try {
    if (hasSvelteMetaElement()) return "Svelte"
  } catch {
    // ignore
  }
  return null
}

function detectSvelteVersion(svelteGlobal: any): string | null {
  if (!svelteGlobal) return null
  const versions = svelteGlobal.v
  if (versions && typeof versions.values === "function") {
    // Sort descending so the newest major version wins when multiple Svelte
    // instances are loaded on the same page.
    const sorted = Array.from(versions.values() as Iterable<string>).sort(
      (a, b) => Number(b) - Number(a)
    )
    if (sorted.length > 0) return `Svelte ${sorted[0]}`
  }
  return "Svelte"
}

// Dev builds attach `__svelte_meta` (JSX-like source location info) to
// template-root elements. Scanning the whole tree is a last-resort fallback
// used only when the version registry and scoped-style classes are absent.
function hasSvelteMetaElement(): boolean {
  const elements = document.querySelectorAll("*")
  for (const el of elements) {
    if ((el as any).__svelte_meta) return true
  }
  return false
}

function detectSvelteKit(): string | null {
  try {
    if (document.getElementById("svelte-announcer")) return "SvelteKit"
    if (
      document.querySelector(
        "[data-sveltekit-preload-data], [data-sveltekit-preload-code], [data-sveltekit-reload], [data-sveltekit-replacestate], [data-sveltekit-noscroll], [data-sveltekit-keepfocus]"
      )
    )
      return "SvelteKit"
    if (Object.keys(win).some((key) => key.startsWith("__sveltekit_")))
      return "SvelteKit"
  } catch {
    // ignore
  }
  return null
}

function detectNextJs(): string | null {
  try {
    if (win.__NEXT_DATA__) return "Next.js (Pages Router)"
    if (win.__next_f || win.__next_router_prefetch_for)
      return "Next.js (App Router)"

    const hasNextRoot = !!document.getElementById("__next")
    const hasNextScript = !!document.querySelector('script[src*="/_next/"]')
    if (hasNextRoot && hasNextScript) return "Next.js"
  } catch {
    // ignore
  }
  return null
}

function detectNuxt(): string | null {
  try {
    if (win.__NUXT__ || win.__NUXT_DATA__) return "Nuxt"
    if (
      document.getElementById("__nuxt") ||
      document.getElementById("__layout")
    )
      return "Nuxt"
  } catch {
    // ignore
  }
  return null
}
