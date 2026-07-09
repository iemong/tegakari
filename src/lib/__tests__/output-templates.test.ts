import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createTemplateId,
  CUSTOM_PRESET_PREFIX,
  customPresetTemplateId,
  deleteOutputTemplate,
  isCustomPresetValue,
  loadOutputTemplates,
  MAX_OUTPUT_TEMPLATES,
  mergeOutputTemplates,
  type OutputTemplate,
  parseOutputTemplates,
  saveOutputTemplates,
  serializeOutputTemplates,
  toCustomPresetValue,
  upsertOutputTemplate,
} from "../output-templates"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
        set: vi.fn(async (obj: StorageRecord) => {
          Object.assign(storage, obj)
        }),
      },
    },
  })
})

function template(overrides: Partial<OutputTemplate> = {}): OutputTemplate {
  return {
    id: "id-1",
    name: "My Template",
    header: "H",
    annotation: "A",
    ...overrides,
  }
}

describe("custom preset value helpers", () => {
  it("round-trips an id through toCustomPresetValue/customPresetTemplateId", () => {
    const value = toCustomPresetValue("abc-123")
    expect(value).toBe(`${CUSTOM_PRESET_PREFIX}abc-123`)
    expect(customPresetTemplateId(value)).toBe("abc-123")
  })

  it("isCustomPresetValue distinguishes custom values from built-in preset ids", () => {
    expect(isCustomPresetValue("custom:abc-123")).toBe(true)
    expect(isCustomPresetValue("jsonl")).toBe(false)
    expect(isCustomPresetValue("markdown")).toBe(false)
  })

  it("createTemplateId returns unique, non-empty ids", () => {
    const a = createTemplateId()
    const b = createTemplateId()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })
})

describe("storage round trip", () => {
  it("loadOutputTemplates returns an empty array when nothing is stored", async () => {
    await expect(loadOutputTemplates()).resolves.toEqual([])
  })

  it("saveOutputTemplates persists and loadOutputTemplates reads it back", async () => {
    const templates = [template({ id: "a" }), template({ id: "b", name: "Second" })]
    await saveOutputTemplates(templates)
    await expect(loadOutputTemplates()).resolves.toEqual(templates)
  })

  it("loadOutputTemplates tolerates corrupt (non-array) stored data", async () => {
    storage.tegakariOutputTemplates = "not an array"
    await expect(loadOutputTemplates()).resolves.toEqual([])
  })

  it("upsertOutputTemplate appends a new template by id", async () => {
    await saveOutputTemplates([template({ id: "a" })])
    const result = await upsertOutputTemplate(template({ id: "b", name: "Second" }))
    expect(result.map((t) => t.id)).toEqual(["a", "b"])
  })

  it("upsertOutputTemplate updates an existing template in place (same id)", async () => {
    await saveOutputTemplates([template({ id: "a", name: "Original" })])
    const result = await upsertOutputTemplate(template({ id: "a", name: "Renamed" }))
    expect(result).toEqual([template({ id: "a", name: "Renamed" })])
  })

  it("deleteOutputTemplate removes a template by id", async () => {
    await saveOutputTemplates([template({ id: "a" }), template({ id: "b" })])
    const result = await deleteOutputTemplate("a")
    expect(result.map((t) => t.id)).toEqual(["b"])
  })
})

describe("the 10-template storage cap", () => {
  it("saveOutputTemplates caps stored templates at MAX_OUTPUT_TEMPLATES, keeping the first N", async () => {
    const many = Array.from({ length: MAX_OUTPUT_TEMPLATES + 5 }, (_, i) =>
      template({ id: `id-${i}`, name: `T${i}` })
    )
    await saveOutputTemplates(many)
    const loaded = await loadOutputTemplates()
    expect(loaded).toHaveLength(MAX_OUTPUT_TEMPLATES)
    expect(loaded.map((t) => t.id)).toEqual(
      many.slice(0, MAX_OUTPUT_TEMPLATES).map((t) => t.id)
    )
  })
})

describe("parseOutputTemplates: invalid data handling", () => {
  it("parses a valid array of templates", () => {
    const text = JSON.stringify([template({ id: "a" }), template({ id: "b" })])
    const { templates, errors } = parseOutputTemplates(text)
    expect(errors).toEqual([])
    expect(templates).toHaveLength(2)
  })

  it("reports an error and returns no templates for invalid JSON", () => {
    const { templates, errors } = parseOutputTemplates("{ not json")
    expect(templates).toEqual([])
    expect(errors[0]).toMatch(/Invalid JSON/)
  })

  it("reports an error when the top-level value isn't an array", () => {
    const { templates, errors } = parseOutputTemplates(JSON.stringify({ a: 1 }))
    expect(templates).toEqual([])
    expect(errors[0]).toMatch(/array/)
  })

  it("skips entries missing a name and collects an error, keeping valid entries", () => {
    const text = JSON.stringify([
      { id: "a", name: "Valid", header: "H", annotation: "A" },
      { id: "b", header: "H2", annotation: "A2" },
    ])
    const { templates, errors } = parseOutputTemplates(text)
    expect(templates).toHaveLength(1)
    expect(templates[0].name).toBe("Valid")
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/name/)
  })

  it("skips non-object entries", () => {
    const { templates, errors } = parseOutputTemplates(JSON.stringify(["nope", 42, null]))
    expect(templates).toEqual([])
    expect(errors).toHaveLength(3)
  })

  it("defaults missing header/annotation to empty strings and generates an id when absent", () => {
    const text = JSON.stringify([{ name: "Bare" }])
    const { templates, errors } = parseOutputTemplates(text)
    expect(errors).toEqual([])
    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({ name: "Bare", header: "", annotation: "" })
    expect(templates[0].id.length).toBeGreaterThan(0)
  })

  it("preserves an explicit id from the imported entry", () => {
    const text = JSON.stringify([template({ id: "kept-id" })])
    const { templates } = parseOutputTemplates(text)
    expect(templates[0].id).toBe("kept-id")
  })
})

describe("serializeOutputTemplates / parseOutputTemplates round trip", () => {
  it("round-trips a template list through export and import", () => {
    const original = [template({ id: "a" }), template({ id: "b", name: "Second" })]
    const text = serializeOutputTemplates(original)
    const { templates, errors } = parseOutputTemplates(text)
    expect(errors).toEqual([])
    expect(templates).toEqual(original)
  })

  it("serializes with a fixed key order and trailing newline", () => {
    const text = serializeOutputTemplates([template({ id: "a" })])
    expect(text.endsWith("\n")).toBe(true)
    const parsed = JSON.parse(text)
    expect(Object.keys(parsed[0])).toEqual(["id", "name", "header", "annotation"])
  })
})

describe("mergeOutputTemplates", () => {
  it("overwrites an existing template with the same id in place", () => {
    const existing = [template({ id: "a", name: "Old" }), template({ id: "b" })]
    const imported = [template({ id: "a", name: "New" })]
    const merged = mergeOutputTemplates(existing, imported)
    expect(merged.map((t) => t.name)).toEqual(["New", "My Template"])
  })

  it("appends templates with a new id", () => {
    const existing = [template({ id: "a" })]
    const imported = [template({ id: "c", name: "Appended" })]
    const merged = mergeOutputTemplates(existing, imported)
    expect(merged.map((t) => t.id)).toEqual(["a", "c"])
  })
})
