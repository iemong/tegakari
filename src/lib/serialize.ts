const MAX_DEPTH = 3
const MAX_ARRAY = 10
const MAX_ENTRIES = 20

type SkipKey = (key: string) => boolean

interface SerializeCtx {
  depth: number
  seen: WeakSet<object>
  skipKey: SkipKey
}

/**
 * Serialize framework-internal objects (React Fiber / Vue instances) safely.
 * Circular references, functions, DOM nodes, and oversized structures are
 * collapsed so the result is always JSON-friendly. `skipKey` lets each caller
 * drop framework-private keys (e.g. `_`/`$$` for React, `_`/`$` for Vue).
 */
export function safeSerialize(value: unknown, skipKey: SkipKey): unknown {
  return serialize(value, { depth: 0, seen: new WeakSet(), skipKey })
}

function serialize(value: unknown, ctx: SerializeCtx): unknown {
  if (ctx.depth > MAX_DEPTH) return "..."
  if (value === null || typeof value !== "object") return serializeScalar(value)
  if (value instanceof HTMLElement) return `<${value.tagName.toLowerCase()}>`
  return serializeContainer(value, ctx)
}

function serializeScalar(value: unknown): unknown {
  if (value === undefined) return value
  if (typeof value === "function") return "fn"
  if (typeof value === "symbol") return value.toString()
  return value
}

function serializeContainer(value: object, ctx: SerializeCtx): unknown {
  if (ctx.seen.has(value)) return "[Circular]"
  ctx.seen.add(value)

  const child: SerializeCtx = { ...ctx, depth: ctx.depth + 1 }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((v) => serialize(v, child))
  }

  const result: Record<string, unknown> = {}
  const entries = Object.entries(value as Record<string, unknown>)
  for (const [key, val] of entries.slice(0, MAX_ENTRIES)) {
    if (ctx.skipKey(key)) continue
    result[key] = serialize(val, child)
  }
  return result
}
