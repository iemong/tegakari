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

it("collectReactComponent: should extract source from the element fiber's _debugSource", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 5,
    type: "button",
    memoizedProps: {},
    _debugSource: {
      fileName: "src/components/SubmitButton.tsx",
      lineNumber: 42,
    },
    return: createFiber({
      tag: 0,
      type: { name: "SubmitButton" },
      memoizedProps: {},
      return: null,
    }),
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result!.source).toEqual({
    file: "src/components/SubmitButton.tsx",
    line: 42,
  })
})

it("collectReactComponent: should fall back to ancestor _debugSource when element fiber has none", () => {
  const el = document.createElement("div")
  const fiber = createFiber({
    tag: 5,
    type: "div",
    memoizedProps: {},
    return: createFiber({
      tag: 0,
      type: { name: "Card" },
      memoizedProps: {},
      _debugSource: { fileName: "src/components/Card.tsx", lineNumber: 10 },
      return: null,
    }),
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result!.source).toEqual({ file: "src/components/Card.tsx", line: 10 })
})

it("collectReactComponent: should read _debugSource via _debugOwner", () => {
  const el = document.createElement("div")
  const owner = createFiber({
    tag: 0,
    type: { name: "Owner" },
    memoizedProps: {},
    _debugSource: { fileName: "src/components/Owner.tsx", lineNumber: 7 },
    return: null,
  })
  const fiber = createFiber({
    tag: 0,
    type: { name: "Leaf" },
    memoizedProps: {},
    _debugOwner: owner,
    return: null,
  })
  attachFiber(el, fiber)

  const result = collectReactComponent(el)

  expect(result!.source).toEqual({ file: "src/components/Owner.tsx", line: 7 })
})

it("collectReactComponent: should omit source when no _debugSource exists (prod / React 19)", () => {
  const el = document.createElement("div")
  attachFiber(
    el,
    createFiber({
      tag: 0,
      type: { name: "ProdComponent" },
      memoizedProps: {},
      return: null,
    })
  )

  const result = collectReactComponent(el)

  expect(result!.source).toBeUndefined()
})

it("collectReactComponent: should omit line when _debugSource has no lineNumber", () => {
  const el = document.createElement("div")
  attachFiber(
    el,
    createFiber({
      tag: 0,
      type: { name: "NoLine" },
      memoizedProps: {},
      _debugSource: { fileName: "src/components/NoLine.tsx" },
      return: null,
    })
  )

  const result = collectReactComponent(el)

  expect(result!.source).toEqual({ file: "src/components/NoLine.tsx" })
})
