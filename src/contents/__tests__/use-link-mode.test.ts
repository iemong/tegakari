import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, it } from "vitest"

import { useLinkMode } from "../use-link-mode"

function pin(id: number): HTMLElement {
  const el = document.createElement("div")
  el.dataset.testid = `tegakari-pin-${id}`
  document.body.appendChild(el)
  return el
}

function plainElement(): HTMLElement {
  const el = document.createElement("div")
  document.body.appendChild(el)
  return el
}

function plasmoUiElement(): HTMLElement {
  // Mirrors `isFromPlasmoUI`'s check (id/tag starting with "plasmo-").
  const el = document.createElement("div")
  el.id = "plasmo-toolbar"
  document.body.appendChild(el)
  return el
}

function click(el: HTMLElement): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true })
  act(() => {
    el.dispatchEvent(event)
  })
  return event
}

beforeEach(() => {
  document.body.innerHTML = ""
})

afterEach(() => {
  document.body.innerHTML = ""
})

it("useLinkMode: clicking another pin creates a pendingRelation and exits link mode", () => {
  const { result } = renderHook(() => useLinkMode())
  act(() => result.current.startLink(1))
  expect(result.current.linkFromId).toBe(1)

  click(pin(2))

  expect(result.current.linkFromId).toBeNull()
  expect(result.current.pendingRelation).toEqual({ fromId: 1, toId: 2 })
})

it("useLinkMode: clicking the source pin itself cancels link mode without a pendingRelation", () => {
  const { result } = renderHook(() => useLinkMode())
  act(() => result.current.startLink(1))

  click(pin(1))

  expect(result.current.linkFromId).toBeNull()
  expect(result.current.pendingRelation).toBeNull()
})

it("useLinkMode: clicking real page content cancels link mode and swallows the click", () => {
  const { result } = renderHook(() => useLinkMode())
  act(() => result.current.startLink(1))

  const event = click(plainElement())

  expect(result.current.linkFromId).toBeNull()
  expect(result.current.pendingRelation).toBeNull()
  expect(event.defaultPrevented).toBe(true)
})

it("useLinkMode: clicking other overlay UI (not a pin) cancels link mode but lets the click through", () => {
  const { result } = renderHook(() => useLinkMode())
  act(() => result.current.startLink(1))

  const event = click(plasmoUiElement())

  expect(result.current.linkFromId).toBeNull()
  expect(event.defaultPrevented).toBe(false)
})

it("useLinkMode: Escape cancels an active link mode with no pending relation", () => {
  const { result } = renderHook(() => useLinkMode())
  act(() => result.current.startLink(1))

  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
  })

  expect(result.current.linkFromId).toBeNull()
})

it("useLinkMode: Escape discards a pending relation without saving it", () => {
  const { result } = renderHook(() => useLinkMode())
  act(() => result.current.startLink(1))
  click(pin(2))
  expect(result.current.pendingRelation).toEqual({ fromId: 1, toId: 2 })

  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
  })

  expect(result.current.pendingRelation).toBeNull()
})

it("useLinkMode: cancelLink and cancelPending reset state directly", () => {
  const { result } = renderHook(() => useLinkMode())
  act(() => result.current.startLink(1))
  act(() => result.current.cancelLink())
  expect(result.current.linkFromId).toBeNull()

  act(() => result.current.startLink(1))
  click(pin(2))
  act(() => result.current.cancelPending())
  expect(result.current.pendingRelation).toBeNull()
})
