import { expect, it } from "vitest"

import { collectVueComponent } from "../vue-collector"

it("serialize: handles circular references", () => {
  const el = document.createElement("div")
  const data: any = { a: 1 }
  data.self = data
  ;(el as any).__vueParentComponent = {
    type: { name: "Circular" },
    props: data,
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.props!.self).toBe("[Circular]")
})

it("serialize: handles functions, symbols, HTMLElements", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Mixed" },
    props: {
      fn: () => {},
      sym: Symbol("test"),
      el: document.createElement("span"),
      nil: null,
      undef: undefined,
    },
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.props!.fn).toBe("fn")
  expect(result!.props!.sym).toBe("Symbol(test)")
  expect(result!.props!.el).toBe("<span>")
})

it("serialize: respects max depth", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Deep" },
    props: {
      l1: { l2: { l3: { l4: "deep" } } },
    },
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect((result!.props!.l1 as any).l2.l3.l4).toBe("...")
})

it("serialize: skips keys starting with _, $, or __", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Filtered" },
    props: {
      visible: true,
      _internal: "hidden",
      $ref: "ref",
      __proto_field: "proto",
      name: "test",
    },
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.props!.visible).toBe(true)
  expect(result!.props!.name).toBe("test")
  expect(result!.props!._internal).toBeUndefined()
  expect(result!.props!.$ref).toBeUndefined()
  expect(result!.props!.__proto_field).toBeUndefined()
})

it("serialize: limits arrays to 10 items", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "LargeArray" },
    props: {
      items: Array.from({ length: 15 }, (_, i) => i),
    },
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect((result!.props!.items as unknown[]).length).toBe(10)
})

it("serialize: limits object entries to 20", () => {
  const el = document.createElement("div")
  const manyProps: Record<string, number> = {}
  for (let i = 0; i < 25; i++) {
    manyProps[`prop${i}`] = i
  }
  ;(el as any).__vueParentComponent = {
    type: { name: "ManyProps" },
    props: manyProps,
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(Object.keys(result!.props!).length).toBe(20)
})

it("serialize: handles empty objects and arrays", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Empty" },
    props: { obj: {}, arr: [] },
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.props!.obj).toEqual({})
  expect(result!.props!.arr).toEqual([])
})
