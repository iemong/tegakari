import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  IFRAME_SELECTION_KEY,
  loadIframeSelection,
  setIframeSelection,
} from "../settings"

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

describe("settings: iframe selection", () => {
  it("defaults to false when unset", async () => {
    await expect(loadIframeSelection()).resolves.toBe(false)
  })

  it("reads true only for an exact boolean true", async () => {
    storage[IFRAME_SELECTION_KEY] = true
    await expect(loadIframeSelection()).resolves.toBe(true)
  })

  it("treats non-true values as false", async () => {
    storage[IFRAME_SELECTION_KEY] = "true"
    await expect(loadIframeSelection()).resolves.toBe(false)
  })

  it("persists the flag", () => {
    setIframeSelection(true)
    expect(storageSet).toHaveBeenCalledWith({ [IFRAME_SELECTION_KEY]: true })
  })
})
