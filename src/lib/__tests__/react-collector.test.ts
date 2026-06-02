import { expect, it } from "vitest"
import { collectReactComponent } from "../react-collector"

function createFiber(overrides: Record<string, unknown> = {}) {
  return {
    tag: 0,
    type: { name: "MyComponent", displayName: undefined },
    memoizedProps: { title: "Test" },
    memoizedState: null,
    stateNode: null,
    return: null,
    child: null,
    sibling: null,
    ...overrides,
  }
}

function attachFiber(element: Element, fiber: any) {
  ;(element as any)["__reactFiber$test123"] = fiber
}

it("collectReactComponent: should return null when element has no fiber", () => {
  const el = document.createElement("div")
  expect(collectReactComponent(el)).toBeNull()
})

it("collectReactComponent: should collect basic function component info", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: { name: "Header" },
    memoizedProps: { title: "My Title" },
    return: createFiber({
      tag: 0,
      type: { name: "App" },
      memoizedProps: {},
      return: null,
    }),
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.framework).toBe("react")
  expect(result!.hierarchy).toEqual(["App", "Header"])
  expect(result!.props).toEqual({ title: "My Title" })
})

it("collectReactComponent: should collect class component state", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 1,
    type: { name: "Counter" },
    memoizedProps: {},
    stateNode: { state: { count: 5 } },
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.state).toEqual({ count: 5 })
})

it("collectReactComponent: should return null state for function component with hooks but no useState/useReducer", () => {
  const el = document.createElement("div")
  const hooks = {
    memoizedState: "effect",
    queue: null,
    next: null,
  }
  const fiber = createFiber({
    tag: 0,
    type: { name: "EffectOnly" },
    memoizedProps: {},
    memoizedState: hooks,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  // extractState returns null when no useState/useReducer hooks found
  expect(result!.state).toBeNull()
})

it("collectReactComponent: should use displayName over name", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: { displayName: "MyDisplayName", name: "InternalName" },
    memoizedProps: {},
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result!.hierarchy).toEqual(["MyDisplayName"])
})

it("collectReactComponent: should skip fibers without names (string types like 'div')", () => {
  const el = document.createElement("div")
  const divFiber = createFiber({
    tag: 5,
    type: "div",
    memoizedProps: {},
    return: createFiber({
      tag: 0,
      type: { name: "App" },
      memoizedProps: {},
      return: null,
    }),
  })
  attachFiber(el, divFiber)

  const result = collectReactComponent(el)

  // The div fiber (tag 5) is not a component, so the nearest component
  // should be App
  expect(result).not.toBeNull()
})

it("collectReactComponent: should handle ForwardRef (tag 11) component", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 11,
    type: { name: "ForwardRefComp" },
    memoizedProps: { ref: "fn" },
    memoizedState: { memoizedState: true, queue: {}, next: null },
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["ForwardRefComp"])
  expect(result!.state).toEqual({ state_0: true })
})

it("collectReactComponent: should handle SimpleMemoComponent (tag 15)", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 15,
    type: { name: "MemoComp" },
    memoizedProps: { data: [1, 2, 3] },
    memoizedState: { memoizedState: "cached", queue: {}, next: null },
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["MemoComp"])
})

it("collectReactComponent: should return null when no component fibers found in hierarchy", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 5, // HostComponent (div, span, etc.)
    type: "div",
    memoizedProps: {},
    return: createFiber({
      tag: 5,
      type: "span",
      memoizedProps: {},
      return: null,
    }),
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).toBeNull()
})

it("collectReactComponent: should handle fibers with null type", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: null,
    memoizedProps: {},
    return: createFiber({
      tag: 0,
      type: { name: "App" },
      memoizedProps: {},
      return: null,
    }),
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["App"])
})

it("collectReactComponent: should handle class component without state", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 1,
    type: { name: "StatelessClass" },
    memoizedProps: {},
    stateNode: { state: null },
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  // extractState returns null for class comp with no state
  expect(result!.state).toBeNull()
})

it("collectReactComponent: should handle function component with no memoizedState (no hooks)", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: { name: "NoHooks" },
    memoizedProps: { text: "simple" },
    memoizedState: null,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  // extractState returns null when memoizedState is null
  expect(result!.state).toBeNull()
})

it("collectReactComponent: should skip non-fiber keys when finding fiber", () => {
  const el = document.createElement("div")
  ;(el as any).someOtherProp = "value"
  ;(el as any).anotherProp = 42
  attachFiber(
    el,
    createFiber({
      tag: 0,
      type: { name: "WithOtherKeys" },
      memoizedProps: {},
      return: null,
    })
  )

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["WithOtherKeys"])
})

it("collectReactComponent: should handle component fiber with string type", () => {
  const el = document.createElement("div")
  // A component fiber (tag 0) but with string type (unusual but possible)
  const fiber = createFiber({
    tag: 0,
    type: "div",
    memoizedProps: {},
    return: createFiber({
      tag: 0,
      type: { name: "Parent" },
      memoizedProps: {},
      return: null,
    }),
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  // The string-type fiber is a component fiber but getComponentName returns null
  // Parent has a valid name, so hierarchy = ["Parent"]
  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["Parent"])
})

it("collectReactComponent: should handle component fiber with object type but no displayName or name", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: { someOtherProp: true },
    memoizedProps: {},
    return: createFiber({
      tag: 0,
      type: { name: "Root" },
      memoizedProps: {},
      return: null,
    }),
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  // type has no displayName or name → getComponentName returns null
  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["Root"])
})
