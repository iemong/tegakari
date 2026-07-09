import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"

import { MAX_OUTPUT_TEMPLATES } from "~lib/output-templates"

import { useOutputTemplatesManager } from "../use-output-templates-manager"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
        set: vi.fn(async (value: StorageRecord) => {
          Object.assign(storage, value)
        }),
      },
    },
  })
})

it("useOutputTemplatesManager loads stored templates", async () => {
  storage.tegakariOutputTemplates = [
    { id: "a", name: "A", header: "H", annotation: "An" },
  ]

  const { result } = renderHook(() => useOutputTemplatesManager())

  await waitFor(() => expect(result.current.templates).toHaveLength(1))
  expect(result.current.templates[0].name).toBe("A")
})

it("useOutputTemplatesManager adds a template with a generated id and resets the draft", async () => {
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() => expect(result.current.templates).toEqual([]))

  act(() => {
    result.current.updateAddDraft({
      name: "Cursor-ish",
      header: "H",
      annotation: "A",
    })
  })
  await act(async () => result.current.addTemplate())

  expect(result.current.templates).toHaveLength(1)
  expect(result.current.templates[0]).toMatchObject({
    name: "Cursor-ish",
    header: "H",
    annotation: "A",
  })
  expect(result.current.templates[0].id.length).toBeGreaterThan(0)
  expect(result.current.addDraft.name).toBe("")
  expect(storage.tegakariOutputTemplates).toEqual(result.current.templates)
})

it("useOutputTemplatesManager rejects adding a template without a name", async () => {
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() => expect(result.current.templates).toEqual([]))

  await act(async () => result.current.addTemplate())
  expect(result.current.addDraft.error).toBe("Name is required")
  expect(result.current.templates).toEqual([])
})

it("useOutputTemplatesManager blocks adding past the storage limit with a translated error", async () => {
  storage.tegakariOutputTemplates = Array.from(
    { length: MAX_OUTPUT_TEMPLATES },
    (_, i) => ({ id: `id-${i}`, name: `T${i}`, header: "", annotation: "" })
  )
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() =>
    expect(result.current.templates).toHaveLength(MAX_OUTPUT_TEMPLATES)
  )

  act(() => {
    result.current.updateAddDraft({ name: "One too many" })
  })
  await act(async () => result.current.addTemplate())

  expect(result.current.addDraft.error).toBe(
    `You can save up to ${MAX_OUTPUT_TEMPLATES} templates`
  )
  expect(result.current.templates).toHaveLength(MAX_OUTPUT_TEMPLATES)
})

it("useOutputTemplatesManager edits, saves, and cancels a template", async () => {
  storage.tegakariOutputTemplates = [
    { id: "a", name: "A", header: "H", annotation: "An" },
  ]
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() => expect(result.current.templates).toHaveLength(1))

  act(() => result.current.startEdit(0))
  act(() => result.current.updateEditDraft({ name: "Renamed" }))
  await act(async () => result.current.saveEdit())

  expect(result.current.templates[0].name).toBe("Renamed")
  expect(result.current.templates[0].id).toBe("a")
  expect(result.current.editingIdx).toBeNull()

  act(() => result.current.startEdit(0))
  act(() => result.current.updateEditDraft({ name: "Unused" }))
  act(() => result.current.cancelEdit())

  expect(result.current.editingIdx).toBeNull()
  expect(result.current.templates[0].name).toBe("Renamed")
})

it("useOutputTemplatesManager reports an inline error when saving an edit clears the name", async () => {
  storage.tegakariOutputTemplates = [
    { id: "a", name: "A", header: "H", annotation: "An" },
  ]
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() => expect(result.current.templates).toHaveLength(1))

  act(() => result.current.startEdit(0))
  act(() => result.current.updateEditDraft({ name: "   " }))
  await act(async () => result.current.saveEdit())

  expect(result.current.editDraft.error).toBe("Name is required")
  expect(result.current.templates[0].name).toBe("A")
})

it("useOutputTemplatesManager deletes a template", async () => {
  storage.tegakariOutputTemplates = [
    { id: "a", name: "A", header: "", annotation: "" },
    { id: "b", name: "B", header: "", annotation: "" },
  ]
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() => expect(result.current.templates).toHaveLength(2))

  await act(async () => result.current.removeTemplate("a"))
  expect(result.current.templates.map((t) => t.id)).toEqual(["b"])
})

it("useOutputTemplatesManager imports and merges templates", async () => {
  storage.tegakariOutputTemplates = [
    { id: "a", name: "A", header: "", annotation: "" },
  ]
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() => expect(result.current.templates).toHaveLength(1))

  const importResult = await act(async () =>
    result.current.importTemplates([
      { id: "a", name: "A-updated", header: "", annotation: "" },
      { id: "c", name: "C", header: "", annotation: "" },
    ])
  )

  expect(importResult.overflowCount).toBe(0)
  expect(result.current.templates.map((t) => [t.id, t.name])).toEqual([
    ["a", "A-updated"],
    ["c", "C"],
  ])
  expect(storage.tegakariOutputTemplates).toEqual(result.current.templates)
})

it("useOutputTemplatesManager caps an over-limit import so state and storage never diverge", async () => {
  storage.tegakariOutputTemplates = Array.from(
    { length: MAX_OUTPUT_TEMPLATES - 1 },
    (_, i) => ({ id: `id-${i}`, name: `T${i}`, header: "", annotation: "" })
  )
  const { result } = renderHook(() => useOutputTemplatesManager())
  await waitFor(() =>
    expect(result.current.templates).toHaveLength(MAX_OUTPUT_TEMPLATES - 1)
  )

  // 3 new templates on top of 9 existing ones — only 1 fits under the cap.
  const importResult = await act(async () =>
    result.current.importTemplates([
      { id: "new-1", name: "New1", header: "", annotation: "" },
      { id: "new-2", name: "New2", header: "", annotation: "" },
      { id: "new-3", name: "New3", header: "", annotation: "" },
    ])
  )

  expect(importResult.overflowCount).toBe(2)
  expect(result.current.templates).toHaveLength(MAX_OUTPUT_TEMPLATES)
  // State and storage must agree — this is exactly what regresses if the
  // cap is only applied inside saveOutputTemplates and not by the caller.
  expect(storage.tegakariOutputTemplates).toEqual(result.current.templates)
})
