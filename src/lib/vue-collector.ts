import { safeSerialize } from "./serialize"
import type { ComponentInfo } from "./types"

const skipKey = (key: string) =>
  key.startsWith("_") || key.startsWith("$") || key.startsWith("__")

export function collectVueComponent(element: Element): ComponentInfo | null {
  // Try Vue 3 first
  const vue3Result = collectVue3(element)
  if (vue3Result) return vue3Result

  // Try Vue 2
  const vue2Result = collectVue2(element)
  if (vue2Result) return vue2Result

  return null
}

function collectVue3(element: Element): ComponentInfo | null {
  const instance = (element as any).__vueParentComponent
  if (!instance) return null

  const hierarchy = getVue3Hierarchy(instance)
  const props = instance.props
    ? safeSerialize(instance.props, skipKey)
    : undefined
  const data = instance.setupState
    ? safeSerialize(instance.setupState, skipKey)
    : undefined

  return {
    framework: "vue",
    hierarchy,
    props: props as Record<string, unknown> | undefined,
    state: data as Record<string, unknown> | undefined,
  }
}

function getVue3Hierarchy(instance: any): string[] {
  const components: string[] = []
  let current = instance

  while (current) {
    const name = getVue3ComponentName(current)
    if (name) {
      components.unshift(name)
    }
    current = current.parent
  }

  return components
}

function getVue3ComponentName(instance: any): string | null {
  const type = instance.type
  if (!type) return null
  return type.name || type.__name || null
}

function collectVue2(element: Element): ComponentInfo | null {
  const vm = (element as any).__vue__
  if (!vm) return null

  const hierarchy = getVue2Hierarchy(vm)
  const props = vm.$props ? safeSerialize(vm.$props, skipKey) : undefined
  const data = vm.$data ? safeSerialize(vm.$data, skipKey) : undefined

  return {
    framework: "vue",
    hierarchy,
    props: props as Record<string, unknown> | undefined,
    state: data as Record<string, unknown> | undefined,
  }
}

function getVue2Hierarchy(vm: any): string[] {
  const components: string[] = []
  let current = vm

  while (current) {
    const name = current.$options?.name || current.$options?._componentTag
    if (name) {
      components.unshift(name)
    }
    current = current.$parent
  }

  return components
}
