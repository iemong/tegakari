import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"

import type { Annotation } from "~lib/types"

import AnnotationPin from "../AnnotationPin"

afterEach(cleanup)

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: { selector: "#target", tag: "div", text: "Hello", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
    ...overrides,
  }
}

/**
 * End-to-end smoke test for the "Adjust styles" panel wired into the pin
 * popover: opening the panel, editing a value (live DOM preview), and Save
 * persisting the resulting styleDelta alongside instruction/tags.
 */
it("AnnotationPin: editing a style row previews it live and Save persists styleDelta with instruction/tags", async () => {
  const target = document.createElement("div")
  target.id = "target"
  document.body.appendChild(target)

  const user = userEvent.setup()
  const onUpdateInstruction = vi.fn()

  render(
    <AnnotationPin
      annotation={makeAnnotation()}
      isActive={true}
      onClick={vi.fn()}
      onUpdateInstruction={onUpdateInstruction}
      onDelete={vi.fn()}
      onDeselect={vi.fn()}
      onStartLink={vi.fn()}
    />
  )

  await user.click(screen.getByRole("button", { name: /Adjust styles/ }))
  const gapInput = screen.getByTestId("tegakari-style-value-gap")
  await user.clear(gapInput)
  await user.type(gapInput, "8px")

  expect(target.style.getPropertyValue("gap")).toBe("8px")

  await user.click(screen.getByRole("button", { name: "Save" }))

  expect(onUpdateInstruction).toHaveBeenCalledWith(
    1,
    expect.objectContaining({
      styleDelta: expect.arrayContaining([
        expect.objectContaining({ property: "gap", after: "8px" }),
      ]),
    })
  )
})

it("AnnotationPin: reopening restores a saved styleDelta into the row and does not re-apply the preview", async () => {
  const target = document.createElement("div")
  target.id = "target"
  document.body.appendChild(target)

  render(
    <AnnotationPin
      annotation={makeAnnotation({
        styleDelta: [{ property: "gap", before: "0px", after: "8px" }],
      })}
      isActive={true}
      onClick={vi.fn()}
      onUpdateInstruction={vi.fn()}
      onDelete={vi.fn()}
      onDeselect={vi.fn()}
      onStartLink={vi.fn()}
    />
  )

  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: /Adjust styles/ }))

  // The saved "after" value is prefilled into the input...
  expect(screen.getByTestId("tegakari-style-value-gap")).toHaveValue("8px")
  // ...but the preview itself is not re-applied to the live DOM on revisit.
  expect(target.style.getPropertyValue("gap")).toBe("")
})
