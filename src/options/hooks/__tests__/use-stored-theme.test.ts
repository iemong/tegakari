import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { darkTheme, lightTheme } from "~lib/theme"

import { useStoredTheme } from "../use-stored-theme"

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
        get: vi.fn((key: string, callback: (result: StorageRecord) => void) => {
          callback({ [key]: storage[key] })
        }),
        set: storageSet,
      },
    },
  })
})

describe("useStoredTheme", () => {
  it("defaults to dark mode", () => {
    const { result } = renderHook(() => useStoredTheme())

    expect(result.current.mode).toBe("dark")
    expect(result.current.theme).toBe(darkTheme)
  })

  it("loads light mode from storage", () => {
    storage.tegakariTheme = "light"

    const { result } = renderHook(() => useStoredTheme())

    expect(result.current.mode).toBe("light")
    expect(result.current.theme).toBe(lightTheme)
  })

  it("toggles and persists the next mode", () => {
    const { result } = renderHook(() => useStoredTheme())

    act(() => result.current.toggleMode())

    expect(result.current.mode).toBe("light")
    expect(storageSet).toHaveBeenCalledWith({ tegakariTheme: "light" })
  })

  it("toggles from light mode back to dark mode", () => {
    storage.tegakariTheme = "light"
    const { result } = renderHook(() => useStoredTheme())

    act(() => result.current.toggleMode())

    expect(result.current.mode).toBe("dark")
    expect(storageSet).toHaveBeenCalledWith({ tegakariTheme: "dark" })
  })
})
