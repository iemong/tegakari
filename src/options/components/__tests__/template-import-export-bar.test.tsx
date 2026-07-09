import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import type { OutputTemplate } from "~lib/output-templates"
import { darkTheme } from "~lib/theme"

import { TemplateImportExportBar } from "../template-import-export-bar"

function fileFromJson(name: string, payload: unknown): File {
  return new File([JSON.stringify(payload)], name, { type: "application/json" })
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock") as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it("TemplateImportExportBar shows a plain success banner when everything fits", async () => {
  const user = userEvent.setup()
  const onImport = vi.fn().mockResolvedValue({ templates: [], overflowCount: 0 })
  render(
    <TemplateImportExportBar templates={[]} theme={darkTheme} onImport={onImport} />
  )

  const file = fileFromJson("templates.json", [
    { id: "a", name: "A", header: "H", annotation: "An" },
  ])
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Imported 1 template(s)."
  )
})

it("TemplateImportExportBar reports storage-cap overflow as a skipped count, not a silent loss", async () => {
  const user = userEvent.setup()
  // 3 parsed, but the manager could only fit 1 under the cap.
  const onImport = vi.fn().mockResolvedValue({ templates: [], overflowCount: 2 })
  render(
    <TemplateImportExportBar templates={[]} theme={darkTheme} onImport={onImport} />
  )

  const file = fileFromJson("templates.json", [
    { id: "a", name: "A", header: "", annotation: "" },
    { id: "b", name: "B", header: "", annotation: "" },
    { id: "c", name: "C", header: "", annotation: "" },
  ] satisfies OutputTemplate[])
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
  const status = await screen.findByRole("status")
  // Kept count (1) and skipped count (2) both reflect what onImport
  // actually persisted, not the raw parsed count.
  expect(status).toHaveTextContent(/Imported 1 template\(s\); skipped 2/)
  expect(status).toHaveTextContent(/exceeded the 10-template limit/)
})

it("TemplateImportExportBar combines parse errors and cap overflow in one warning", async () => {
  const user = userEvent.setup()
  const onImport = vi.fn().mockResolvedValue({ templates: [], overflowCount: 1 })
  render(
    <TemplateImportExportBar templates={[]} theme={darkTheme} onImport={onImport} />
  )

  const file = fileFromJson("templates.json", [
    { id: "a", name: "A", header: "", annotation: "" },
    { id: "b", name: "B", header: "", annotation: "" },
    { name: "" }, // invalid — no name
  ])
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
  // onImport only ever receives the 2 successfully-parsed entries.
  expect(onImport).toHaveBeenCalledWith([
    { id: "a", name: "A", header: "", annotation: "" },
    { id: "b", name: "B", header: "", annotation: "" },
  ])
  const status = await screen.findByRole("status")
  // 1 kept, 2 skipped (1 parse error + 1 cap overflow).
  expect(status).toHaveTextContent(/Imported 1 template\(s\); skipped 2/)
})

it("TemplateImportExportBar shows an error banner and never calls onImport for zero valid entries", async () => {
  const user = userEvent.setup()
  const onImport = vi.fn()
  render(
    <TemplateImportExportBar templates={[]} theme={darkTheme} onImport={onImport} />
  )

  const file = fileFromJson("empty.json", [])
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  expect(await screen.findByRole("status")).toHaveTextContent(/Import failed/)
  expect(onImport).not.toHaveBeenCalled()
})
