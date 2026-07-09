import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  IFRAME_SELECTION_KEY,
  OUTPUT_FORMAT_KEY,
  loadIframeSelection,
  loadOutputPreset,
  setIframeSelection,
  setOutputPreset,
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

describe("settings: output preset", () => {
  it("defaults to jsonl when unset", async () => {
    await expect(loadOutputPreset()).resolves.toBe("jsonl")
  })

  it("reads markdown when persisted", async () => {
    storage[OUTPUT_FORMAT_KEY] = "markdown"
    await expect(loadOutputPreset()).resolves.toBe("markdown")
  })

  it.each(["jsonl", "markdown", "claude-code", "cursor", "minimal"] as const)(
    "reads the %s preset when persisted",
    async (preset) => {
      storage[OUTPUT_FORMAT_KEY] = preset
      await expect(loadOutputPreset()).resolves.toBe(preset)
    }
  )

  it("falls back to jsonl for unknown values", async () => {
    storage[OUTPUT_FORMAT_KEY] = "yaml"
    await expect(loadOutputPreset()).resolves.toBe("jsonl")
  })

  it("falls back to jsonl for non-string values", async () => {
    storage[OUTPUT_FORMAT_KEY] = 42
    await expect(loadOutputPreset()).resolves.toBe("jsonl")
  })

  it("persists the chosen preset", () => {
    setOutputPreset("markdown")
    expect(storageSet).toHaveBeenCalledWith({ [OUTPUT_FORMAT_KEY]: "markdown" })
  })

  it("persists a new preset id under the same storage key (backward-compat)", () => {
    setOutputPreset("claude-code")
    expect(storageSet).toHaveBeenCalledWith({
      [OUTPUT_FORMAT_KEY]: "claude-code",
    })
  })
})
