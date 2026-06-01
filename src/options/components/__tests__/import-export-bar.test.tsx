import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { darkTheme } from "~lib/theme"
import type { PrefixRule } from "~lib/types"

import { ImportExportBar } from "../import-export-bar"

function setup(props?: {
  rules?: PrefixRule[]
  onImport?: (imported: PrefixRule[]) => Promise<unknown>
}) {
  const onImport = props?.onImport ?? vi.fn().mockResolvedValue(undefined)
  const rules = props?.rules ?? []
  render(
    <ImportExportBar rules={rules} theme={darkTheme} onImport={onImport} />
  )
  return { onImport }
}

function fileFromJson(name: string, payload: unknown): File {
  return new File(
    [typeof payload === "string" ? payload : JSON.stringify(payload)],
    name,
    { type: "application/json" }
  )
}

// jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them
// for the Export path so we don't need to fight the environment.
const originalCreate = URL.createObjectURL
const originalRevoke = URL.revokeObjectURL

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock") as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
})

afterEach(() => {
  cleanup()
  URL.createObjectURL = originalCreate
  URL.revokeObjectURL = originalRevoke
  vi.restoreAllMocks()
})

it("ImportExportBar disables Export when there are no rules", () => {
  setup()
  expect(screen.getByRole("button", { name: "Export" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Import" })).toBeEnabled()
})

it("ImportExportBar enables Export and triggers a download with the dated filename", async () => {
  const user = userEvent.setup()
  setup({ rules: [{ pattern: "github.com", prefix: "[gh]" }] })

  const exportBtn = screen.getByRole("button", { name: "Export" })
  expect(exportBtn).toBeEnabled()

  // Spy on the anchor that the component creates on the fly.
  const realCreate = document.createElement.bind(document)
  let anchor: HTMLAnchorElement | null = null
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = realCreate(tag) as HTMLElement
    if (tag === "a") {
      anchor = el as HTMLAnchorElement
      anchor.click = vi.fn()
    }
    return el as never
  })

  await user.click(exportBtn)

  expect(anchor).not.toBeNull()
  expect(anchor!.click).toHaveBeenCalled()
  expect(anchor!.download).toMatch(
    /^tegakari-prefix-rules-\d{4}-\d{2}-\d{2}\.json$/
  )

  const status = await screen.findByRole("status")
  expect(status).toHaveTextContent(/Exported 1 rule/)
})

it("ImportExportBar imports a valid JSON file and shows a success banner", async () => {
  const user = userEvent.setup()
  const { onImport } = setup()

  const file = fileFromJson("rules.json", [
    { pattern: "github.com", prefix: "[gh]" },
  ])
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  await waitFor(() => {
    expect(onImport).toHaveBeenCalledWith([
      { pattern: "github.com", prefix: "[gh]" },
    ])
  })
  expect(await screen.findByRole("status")).toHaveTextContent(
    /Imported 1 rule/
  )
})

it("ImportExportBar shows a warning banner when some entries are skipped", async () => {
  const user = userEvent.setup()
  const { onImport } = setup()

  const file = fileFromJson("partial.json", [
    { pattern: "github.com", prefix: "[gh]" },
    { pattern: "", prefix: "[bad]" },
  ])
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
  const status = await screen.findByRole("status")
  expect(status).toHaveTextContent(/Imported 1 rule/)
  expect(status).toHaveTextContent(/skipped 1/)
})

it("ImportExportBar shows an error banner for invalid JSON and does not call onImport", async () => {
  const user = userEvent.setup()
  const { onImport } = setup()

  const file = new File(["this is not json {"], "broken.json", {
    type: "application/json",
  })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  expect(await screen.findByRole("status")).toHaveTextContent(/Import failed/)
  expect(onImport).not.toHaveBeenCalled()
})

it("ImportExportBar shows an error banner when the file contains zero valid rules", async () => {
  const user = userEvent.setup()
  const { onImport } = setup()

  const file = fileFromJson("empty.json", [])
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  expect(await screen.findByRole("status")).toHaveTextContent(/Import failed/)
  expect(onImport).not.toHaveBeenCalled()
})

it("ImportExportBar dismisses the status banner on click", async () => {
  const user = userEvent.setup()
  setup({ rules: [{ pattern: "github.com", prefix: "[gh]" }] })

  await user.click(screen.getByRole("button", { name: "Export" }))
  const status = await screen.findByRole("status")
  await user.click(status)

  expect(screen.queryByRole("status")).toBeNull()
})

it("ImportExportBar clicking Import triggers the hidden file input", async () => {
  const user = userEvent.setup()
  setup()

  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const click = vi.spyOn(input, "click")

  await user.click(screen.getByRole("button", { name: "Import" }))
  expect(click).toHaveBeenCalled()
})
