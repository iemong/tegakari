import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { IFRAME_SELECTION_KEY } from "~lib/settings"

import { useIframeSelection } from "../use-iframe-selection"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}
const storageSet = vi.fn()

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  storageSet.mockImplementation((value: StorageRecord) => {
    Object.assign(storage, value)
  })
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn((key: string, cb: (result: StorageRecord) => void) => {
          cb({ [key]: storage[key] })
        }),
        set: storageSet,
      },
    },
  })
})

describe("useIframeSelection (options page)", () => {
  it("defaults to disabled", () => {
    const { result } = renderHook(() => useIframeSelection())
    expect(result.current.enabled).toBe(false)
  })

  it("loads the persisted enabled state", async () => {
    storage[IFRAME_SELECTION_KEY] = true
    const { result } = renderHook(() => useIframeSelection())
    await waitFor(() => expect(result.current.enabled).toBe(true))
  })

  it("toggles and persists", async () => {
    const { result } = renderHook(() => useIframeSelection())
    // Flush the mount-time load so it can't clobber the toggle below.
    await act(async () => {})
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.enabled).toBe(true))
    expect(storageSet).toHaveBeenCalledWith({ [IFRAME_SELECTION_KEY]: true })

    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.enabled).toBe(false))
    expect(storageSet).toHaveBeenCalledWith({ [IFRAME_SELECTION_KEY]: false })
  })
})
