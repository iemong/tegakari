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
  return null
}

function detectMetaFramework(): string | null {
  // Next.js
  const nextResult = detectNextJs()
  if (nextResult) return nextResult

  // Nuxt
  const nuxtResult = detectNuxt()
  if (nuxtResult) return nuxtResult

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
