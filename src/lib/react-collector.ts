import { safeSerialize } from "./serialize"
import type { ComponentInfo } from "./types"

const skipKey = (key: string) => key.startsWith("_") || key.startsWith("$$")

interface FiberNode {
  tag: number
  type: any
  memoizedProps: Record<string, unknown>
  memoizedState: any
  stateNode: any
  return: FiberNode | null
  child: FiberNode | null
  sibling: FiberNode | null
}

export function collectReactComponent(element: Element): ComponentInfo | null {
  const fiber = getFiber(element)
  if (!fiber) return null

  const { hierarchy, nearestComponent } = analyzeComponentTree(fiber)
  if (hierarchy.length === 0) return null

  // nearestComponent is guaranteed non-null when hierarchy is non-empty
  const component = nearestComponent!
  const props = safeSerialize(component.memoizedProps, skipKey)
  const state = extractState(component)

  return {
    framework: "react",
    hierarchy,
    props: props as Record<string, unknown> | undefined,
    state: state as Record<string, unknown> | undefined,
  }
}

function getFiber(element: Element): FiberNode | null {
  for (const key of Object.keys(element)) {
    if (key.startsWith("__reactFiber$")) {
      return (element as any)[key] as FiberNode
    }
  }
  return null
}

function analyzeComponentTree(fiber: FiberNode): {
  hierarchy: string[]
  nearestComponent: FiberNode | null
} {
  const components: string[] = []
  let nearestComponent: FiberNode | null = null
  let current: FiberNode | null = fiber

  while (current) {
    if (isComponentFiber(current)) {
      if (!nearestComponent) nearestComponent = current
      const name = getComponentName(current)
      if (name) {
        components.unshift(name)
      }
    }
    current = current.return
  }

  return { hierarchy: components, nearestComponent }
}

function isComponentFiber(fiber: FiberNode): boolean {
  // tag 0 = FunctionComponent, 1 = ClassComponent,
  // 11 = ForwardRef, 15 = SimpleMemoComponent
  return [0, 1, 11, 15].includes(fiber.tag)
}

function getComponentName(fiber: FiberNode): string | null {
  const type = fiber.type
  if (!type) return null
  if (typeof type === "string") return null
  return type.displayName || type.name || null
}

function extractState(fiber: FiberNode): Record<string, unknown> | null {
  // Class component
  if (fiber.tag === 1 && fiber.stateNode?.state) {
    return safeSerialize(fiber.stateNode.state, skipKey) as Record<
      string,
      unknown
    >
  }

  // Function component (hooks)
  if (isFunctionFiber(fiber.tag) && fiber.memoizedState) {
    return extractHookState(fiber.memoizedState)
  }

  return null
}

function isFunctionFiber(tag: number): boolean {
  return tag === 0 || tag === 11 || tag === 15
}

function extractHookState(firstHook: any): Record<string, unknown> | null {
  const states: unknown[] = []
  let hook = firstHook

  while (hook) {
    // useState/useReducer hooks have a queue property
    if (hook.queue !== null && hook.queue !== undefined) {
      states.push(hook.memoizedState)
    }
    hook = hook.next
  }

  if (states.length === 0) return null

  const result: Record<string, unknown> = {}
  states.forEach((s, i) => {
    result[`state_${i}`] = safeSerialize(s, skipKey)
  })
  return result
}
