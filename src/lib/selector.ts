/**
 * A short, human-readable hint for an element, used by the hover/traversal
 * label (#34): its id (`#id`) or first class (`.first`), or "" when neither
 * exists. Not a unique selector — just enough to recognize the element.
 */
export function shortSelectorHint(element: Element): string {
  if (element.id) return `#${element.id}`
  if (typeof element.className === "string") {
    const first = element.className.trim().split(/\s+/).filter(Boolean)[0]
    if (first) return `.${first}`
  }
  return ""
}

export function generateSelector(element: Element): string {
  const parts: string[] = []
  let current: Element | null = element
  // Use the element's own document so selectors generated for elements inside
  // a same-origin iframe stop at the iframe's <body>, not the top document's.
  const doc = element.ownerDocument

  while (current && current !== doc.body && current !== doc.documentElement) {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`)
      break
    }

    const parent = current.parentElement
    if (!parent) {
      parts.unshift(current.tagName.toLowerCase())
      break
    }

    parts.unshift(selectorForChild(current, parent))
    current = parent
  }

  return parts.join(" > ")
}

function selectorForChild(current: Element, parent: Element): string {
  const tag = current.tagName.toLowerCase()
  const siblings = Array.from(parent.children)

  // Try class-based selector first
  const classSelector = uniqueClassSelector(current, tag, siblings)
  if (classSelector) return classSelector

  // Fall back to nth-child
  const sameTagSiblings = siblings.filter((s) => s.tagName === current.tagName)
  if (sameTagSiblings.length > 1) {
    return `${tag}:nth-child(${siblings.indexOf(current) + 1})`
  }
  return tag
}

function uniqueClassSelector(
  current: Element,
  tag: string,
  siblings: Element[]
): string | null {
  if (!current.className || typeof current.className !== "string") return null

  const classes = current.className.trim().split(/\s+/).filter(Boolean)
  if (classes.length === 0) return null

  const classSelector = `${tag}.${classes.map((c) => CSS.escape(c)).join(".")}`
  const matchingSiblings = siblings.filter((s) => safeMatches(s, classSelector))
  return matchingSiblings.length === 1 ? classSelector : null
}

function safeMatches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector)
  } catch {
    return false
  }
}
