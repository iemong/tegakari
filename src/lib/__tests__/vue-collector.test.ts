import { expect, it } from "vitest"

import { collectVueComponent } from "../vue-collector"

it("returns null when element has no Vue instance", () => {
  const el = document.createElement("div")
  expect(collectVueComponent(el)).toBeNull()
})

it("Vue 3: collects component info", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Header" },
    props: { title: "My Title" },
    setupState: { count: 0 },
    parent: {
      type: { name: "App" },
      props: null,
      setupState: null,
      parent: null,
    },
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.framework).toBe("vue")
  expect(result!.hierarchy).toEqual(["App", "Header"])
  expect(result!.props).toEqual({ title: "My Title" })
  expect(result!.state).toEqual({ count: 0 })
})

it("Vue 3: handles component without props/setupState", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Simple" },
    props: null,
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.props).toBeUndefined()
  expect(result!.state).toBeUndefined()
})

it("Vue 3: uses __name when name is not available", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { __name: "ScriptSetupComp" },
    props: {},
    setupState: {},
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["ScriptSetupComp"])
})

it("Vue 3: skips components without name or __name", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: {},
    props: {},
    setupState: {},
    parent: {
      type: { name: "App" },
      props: null,
      setupState: null,
      parent: null,
    },
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["App"])
})

it("Vue 3: handles component with null type", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: null,
    props: {},
    setupState: {},
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual([])
})

it("Vue 2: collects component info", () => {
  const el = document.createElement("div")
  ;(el as any).__vue__ = {
    $options: { name: "MyComponent" },
    $props: { msg: "hello" },
    $data: { visible: true },
    $parent: {
      $options: { name: "App" },
      $props: null,
      $data: null,
      $parent: null,
    },
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.framework).toBe("vue")
  expect(result!.hierarchy).toEqual(["App", "MyComponent"])
  expect(result!.props).toEqual({ msg: "hello" })
  expect(result!.state).toEqual({ visible: true })
})

it("Vue 2: handles component without props/$data", () => {
  const el = document.createElement("div")
  ;(el as any).__vue__ = {
    $options: { name: "Simple" },
    $props: null,
    $data: null,
    $parent: null,
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.props).toBeUndefined()
  expect(result!.state).toBeUndefined()
})

it("Vue 2: uses _componentTag when name is not available", () => {
  const el = document.createElement("div")
  ;(el as any).__vue__ = {
    $options: { _componentTag: "my-tag" },
    $props: null,
    $data: null,
    $parent: null,
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["my-tag"])
})

it("Vue 2: skips components without name", () => {
  const el = document.createElement("div")
  ;(el as any).__vue__ = {
    $options: {},
    $props: null,
    $data: null,
    $parent: {
      $options: { name: "Root" },
      $props: null,
      $data: null,
      $parent: null,
    },
  }

  const result = collectVueComponent(el)

  expect(result).not.toBeNull()
  expect(result!.hierarchy).toEqual(["Root"])
})

it("prefers Vue 3 when both are present", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Vue3Comp" },
    props: {},
    setupState: {},
    parent: null,
  }
  ;(el as any).__vue__ = {
    $options: { name: "Vue2Comp" },
    $props: {},
    $data: {},
    $parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.hierarchy).toEqual(["Vue3Comp"])
})

it("Vue 3: extracts source from type.__file", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "PriceDisplay", __file: "src/components/PriceDisplay.vue" },
    props: null,
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.source).toEqual({ file: "src/components/PriceDisplay.vue" })
})

it("Vue 3: falls back to parent __file when own type has none", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Wrapper" },
    props: null,
    setupState: null,
    parent: {
      type: { name: "Page", __file: "src/pages/Page.vue" },
      props: null,
      setupState: null,
      parent: null,
    },
  }

  const result = collectVueComponent(el)

  expect(result!.source).toEqual({ file: "src/pages/Page.vue" })
})

it("Vue 3: omits source when no __file exists (prod build)", () => {
  const el = document.createElement("div")
  ;(el as any).__vueParentComponent = {
    type: { name: "Prod" },
    props: null,
    setupState: null,
    parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.source).toBeUndefined()
})

it("Vue 2: extracts source from $options.__file", () => {
  const el = document.createElement("div")
  ;(el as any).__vue__ = {
    $options: { name: "Legacy", __file: "src/components/Legacy.vue" },
    $props: { id: 1 },
    $data: {},
    $parent: null,
  }

  const result = collectVueComponent(el)

  expect(result!.source).toEqual({ file: "src/components/Legacy.vue" })
})

it("Vue 2: falls back to $parent __file when own options have none", () => {
  const el = document.createElement("div")
  ;(el as any).__vue__ = {
    $options: { name: "Child" },
    $props: null,
    $data: null,
    $parent: {
      $options: { name: "Root", __file: "src/App.vue" },
      $parent: null,
    },
  }

  const result = collectVueComponent(el)

  expect(result!.source).toEqual({ file: "src/App.vue" })
})
