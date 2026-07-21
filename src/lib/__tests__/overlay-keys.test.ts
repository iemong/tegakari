import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { describe, expect, it, vi } from "vitest"

import { stopOverlayKeyPropagation } from "../overlay-keys"

function keyEvent(key: string) {
  return {
    key,
    stopPropagation: vi.fn(),
  } as unknown as ReactKeyboardEvent
}

describe("stopOverlayKeyPropagation", () => {
  it("stops propagation for a regular key (e.g. a digit)", () => {
    const e = keyEvent("2")
    stopOverlayKeyPropagation(e)
    expect(e.stopPropagation).toHaveBeenCalledOnce()
  })

  it("stops propagation for a letter key", () => {
    const e = keyEvent("a")
    stopOverlayKeyPropagation(e)
    expect(e.stopPropagation).toHaveBeenCalledOnce()
  })

  it("lets Escape keep bubbling", () => {
    const e = keyEvent("Escape")
    stopOverlayKeyPropagation(e)
    expect(e.stopPropagation).not.toHaveBeenCalled()
  })
})
