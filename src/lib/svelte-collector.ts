import type { ComponentInfo, SourceLocation } from "./types"

interface SvelteMeta {
  loc?: {
    file?: string
    line?: number
    column?: number
  }
}

interface SvelteLoc {
  file: string
  line?: number
}

/**
 * Collects Svelte component info by walking the real DOM ancestor chain
 * (Svelte has no fiber/vnode tree to traverse — elements are the tree).
 * Dev builds attach `__svelte_meta.loc` to elements; prod builds don't, so
 * this correctly degrades to `null` (framework-only detection) there.
 *
 * Props/state are intentionally omitted: Svelte doesn't expose a stable,
 * safe-to-serialize runtime representation of either (Svelte 4 closures vs.
 * Svelte 5 signals differ internally), so digging into internals risks
 * throwing or leaking unrelated closure state.
 */
export function collectSvelteComponent(element: Element): ComponentInfo | null {
  const locs = collectAncestorLocs(element)
  if (locs.length === 0) return null

  const hierarchy = buildHierarchy(locs)
  const nearest = locs[0]
  const source: SourceLocation = {
    file: nearest.file,
    ...(nearest.line != null ? { line: nearest.line } : {}),
  }

  return {
    framework: "svelte",
    hierarchy,
    props: undefined,
    state: undefined,
    source,
  }
}

// Leaf-to-root order (closest element to the click first).
function collectAncestorLocs(element: Element): SvelteLoc[] {
  const locs: SvelteLoc[] = []
  let current: Element | null = element

  while (current) {
    const meta = (current as any).__svelte_meta as SvelteMeta | undefined
    const file = meta?.loc?.file
    if (typeof file === "string" && file) {
      locs.push({ file, line: meta?.loc?.line })
    }
    current = current.parentElement
  }

  return locs
}

// Svelte has no runtime component "name"; the source filename (sans
// extension) stands in for it, root → leaf, de-duplicated.
function buildHierarchy(locs: SvelteLoc[]): string[] {
  const rootToLeaf = [...locs].reverse()
  const seen = new Set<string>()
  const hierarchy: string[] = []

  for (const loc of rootToLeaf) {
    const name = baseName(loc.file)
    if (!seen.has(name)) {
      seen.add(name)
      hierarchy.push(name)
    }
  }

  return hierarchy
}

function baseName(file: string): string {
  // split() on a string always yields at least one element, so pop() is safe.
  const fileName = file.split(/[/\\]/).pop() as string
  return fileName.replace(/\.[^.]+$/, "")
}
