import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { useClipboard } from "../use-clipboard"

const originalClipboard = (navigator as { clipboard?: Clipboard }).clipboard
const originalExecCommand = document.execCommand

beforeEach(() => {
  // Reset any stub installed by an individual test.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: originalClipboard,
  })
  document.execCommand = originalExecCommand
})

afterEach(() => {
  vi.restoreAllMocks()
})

it("useClipboard: uses the Clipboard API when it succeeds", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })

  const { result } = renderHook(() => useClipboard())
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.copy("hello")
  })

  expect(ok).toBe(true)
  expect(writeText).toHaveBeenCalledWith("hello")
})

it("useClipboard: falls back to the textarea + execCommand path when the API rejects", async () => {
  const writeText = vi.fn().mockRejectedValue(new Error("denied"))
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })

  let capturedValue: string | null = null
  const execCommand = vi.fn(() => {
    // The textarea is in the DOM at the moment execCommand is invoked.
    capturedValue = document.querySelector("textarea")?.value ?? null
    return true
  })
  document.execCommand = execCommand as typeof document.execCommand

  const { result } = renderHook(() => useClipboard())
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.copy("payload")
  })

  expect(ok).toBe(true)
  expect(execCommand).toHaveBeenCalledWith("copy")
  expect(capturedValue).toBe("payload")
  // The fallback should clean up after itself.
  expect(document.querySelector("textarea")).toBeNull()
})

it("useClipboard: returns false when both the API and the fallback throw", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    },
  })

  document.execCommand = vi.fn(() => {
    throw new Error("execCommand unavailable")
  }) as typeof document.execCommand

  const { result } = renderHook(() => useClipboard())
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.copy("oops")
  })

  expect(ok).toBe(false)
})

it("useClipboard: returns false when navigator.clipboard is missing and the fallback also fails", async () => {
  // Make the API path throw synchronously by removing navigator.clipboard.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  })

  document.execCommand = vi.fn(() => {
    throw new Error("no execCommand")
  }) as typeof document.execCommand

  const { result } = renderHook(() => useClipboard())
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.copy("x")
  })

  expect(ok).toBe(false)
})

it("useClipboard: copyImage writes an image/png ClipboardItem", async () => {
  const write = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { write },
  })
  const clipboardItem = vi.fn(function (
    this: unknown,
    items: Record<string, Blob>
  ) {
    Object.assign(this as object, { items })
  })
  vi.stubGlobal("ClipboardItem", clipboardItem)

  const blob = new Blob(["png"], { type: "image/png" })
  const { result } = renderHook(() => useClipboard())
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.copyImage(blob)
  })

  expect(ok).toBe(true)
  expect(clipboardItem).toHaveBeenCalledWith({ "image/png": blob })
  expect(write).toHaveBeenCalledTimes(1)
  vi.unstubAllGlobals()
})

it("useClipboard: copyImage returns false when the write is rejected", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { write: vi.fn().mockRejectedValue(new Error("denied")) },
  })
  vi.stubGlobal(
    "ClipboardItem",
    vi.fn(function () {})
  )

  const { result } = renderHook(() => useClipboard())
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.copyImage(new Blob([], { type: "image/png" }))
  })

  expect(ok).toBe(false)
  vi.unstubAllGlobals()
})

it("useClipboard: copyImage returns false when ClipboardItem is unavailable", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { write: vi.fn() },
  })
  vi.stubGlobal("ClipboardItem", undefined)

  const { result } = renderHook(() => useClipboard())
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.copyImage(new Blob([], { type: "image/png" }))
  })

  expect(ok).toBe(false)
  vi.unstubAllGlobals()
})
