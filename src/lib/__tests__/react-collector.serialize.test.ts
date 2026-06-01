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

it("collectReactComponent: should safely serialize complex props", () => {
  const el = document.createElement("div")
  const complexProps = {
    onClick: () => {},
    data: { nested: { deep: { value: 42 } } },
    items: [1, 2, 3],
    htmlEl: document.createElement("span"),
    sym: Symbol("test"),
    nil: null,
    undef: undefined,
  }
  const fiber = createFiber({
    tag: 0,
    type: { name: "Complex" },
    memoizedProps: complexProps,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.props!.onClick).toBe("fn")
  expect(result!.props!.htmlEl).toBe("<span>")
  expect(result!.props!.sym).toBe("Symbol(test)")
  expect(result!.props!.nil).toBeNull()
  expect(result!.props!.undef).toBeUndefined()
})

it("collectReactComponent: should handle circular references in props", () => {
  const el = document.createElement("div")
  const obj: any = { a: 1 }
  obj.self = obj
  const fiber = createFiber({
    tag: 0,
    type: { name: "Circular" },
    memoizedProps: obj,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.props!.self).toBe("[Circular]")
})

it("collectReactComponent: should respect max depth during serialization", () => {
  const el = document.createElement("div")
  const deepProps = {
    l1: { l2: { l3: { l4: { l5: "deep" } } } },
  }
  const fiber = createFiber({
    tag: 0,
    type: { name: "Deep" },
    memoizedProps: deepProps,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  // depth 0: root props, 1: l1, 2: l2, 3: l3, 4: l4 → "..."
  expect((result!.props!.l1 as any).l2.l3.l4).toBe("...")
})

it("collectReactComponent: should limit array serialization to 10 items", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: { name: "ArrayComp" },
    memoizedProps: {
      items: Array.from({ length: 15 }, (_, i) => i),
    },
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect((result!.props!.items as unknown[]).length).toBe(10)
})

it("collectReactComponent: should skip keys starting with _ or $$", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: { name: "Filtered" },
    memoizedProps: {
      visible: true,
      _internal: "hidden",
      $$typeof: "symbol",
      name: "test",
    },
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.props!.visible).toBe(true)
  expect(result!.props!.name).toBe("test")
  expect(result!.props!._internal).toBeUndefined()
  expect(result!.props!.$$typeof).toBeUndefined()
})

it("collectReactComponent: should limit object entries to 20", () => {
  const el = document.createElement("div")
  const manyProps: Record<string, number> = {}
  for (let i = 0; i < 25; i++) {
    manyProps[`prop${i}`] = i
  }
  const fiber = createFiber({
    tag: 0,
    type: { name: "ManyProps" },
    memoizedProps: manyProps,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(Object.keys(result!.props!).length).toBe(20)
})

it("collectReactComponent: should serialize empty objects and arrays", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 0,
    type: { name: "Empty" },
    memoizedProps: { obj: {}, arr: [] },
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result!.props!.obj).toEqual({})
  expect(result!.props!.arr).toEqual([])
})

it("collectReactComponent: should collect useState hooks state", () => {
  const el = document.createElement("div")
  const hooks = {
    memoizedState: "hello",
    queue: {},
    next: {
      memoizedState: 42,
      queue: {},
      next: null,
    },
  }
  const fiber = createFiber({
    tag: 0,
    type: { name: "HookComponent" },
    memoizedProps: {},
    memoizedState: hooks,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result).not.toBeNull()
  expect(result!.state).toEqual({ state_0: "hello", state_1: 42 })
})

it("collectReactComponent: should skip hooks without queue (useEffect, useMemo, etc.)", () => {
  const el = document.createElement("div")
  const hooks = {
    memoizedState: "effect",
    queue: null,
    next: {
      memoizedState: "value",
      queue: {},
      next: null,
    },
  }
  const fiber = createFiber({
    tag: 0,
    type: { name: "MixedHooks" },
    memoizedProps: {},
    memoizedState: hooks,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result!.state).toEqual({ state_0: "value" })
})

it("collectReactComponent: should handle hook with queue set to undefined", () => {
  const el = document.createElement("div")
  const hooks = {
    memoizedState: "value",
    queue: undefined,
    next: null,
  }
  const fiber = createFiber({
    tag: 0,
    type: { name: "UndefinedQueue" },
    memoizedProps: {},
    memoizedState: hooks,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  // queue is undefined, so it should be skipped → no useState found → null
  expect(result!.state).toBeNull()
})
