import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"

import type { Annotation } from "~lib/types"

import AnnotationPin from "../AnnotationPin"

afterEach(cleanup)

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: { selector: "#target", tag: "div", text: "", attributes: {} },
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
 * Regression for the "digit keys get eaten by the page's own hotkeys" bug:
 * some sites (YouTube-style) install a bubble-phase `document` keydown
 * listener that treats digit keys as shortcuts. Without stopping
 * propagation inside the popover, typing into e.g. the style-tweak
 * font-size input would leak the same keystrokes to that listener.
 *
 * Escape is asserted as a positive control in the same test: it proves the
 * popover → document path is genuinely live (so the digit's absence isn't
 * just a fluke of the test setup) while also verifying the deliberate
 * Escape exclusion in `stopOverlayKeyPropagation`.
 */
it("AnnotationPin: keydown on a style-tweak input never reaches document, but Escape does", async () => {
  const target = document.createElement("div")
  target.id = "target"
  document.body.appendChild(target)

  render(
    <AnnotationPin
      annotation={makeAnnotation()}
      isActive={true}
      onClick={vi.fn()}
      onUpdateInstruction={vi.fn()}
      onDelete={vi.fn()}
      onDeselect={vi.fn()}
      onStartLink={vi.fn()}
    />
  )

  fireEvent.click(screen.getByRole("button", { name: /Adjust styles/ }))
  const input = screen.getByTestId("tegakari-style-value-font-size")

  const documentKeydown = vi.fn()
  document.addEventListener("keydown", documentKeydown)

  fireEvent.keyDown(input, { key: "2" })
  expect(documentKeydown).not.toHaveBeenCalled()

  fireEvent.keyDown(input, { key: "Escape" })
  expect(documentKeydown).toHaveBeenCalledOnce()

  document.removeEventListener("keydown", documentKeydown)
})

it("AnnotationPin: keyup on a style-tweak input never reaches document", () => {
  const target = document.createElement("div")
  target.id = "target"
  document.body.appendChild(target)

  render(
    <AnnotationPin
      annotation={makeAnnotation()}
      isActive={true}
      onClick={vi.fn()}
      onUpdateInstruction={vi.fn()}
      onDelete={vi.fn()}
      onDeselect={vi.fn()}
      onStartLink={vi.fn()}
    />
  )

  fireEvent.click(screen.getByRole("button", { name: /Adjust styles/ }))
  const input = screen.getByTestId("tegakari-style-value-font-size")

  const documentKeyup = vi.fn()
  document.addEventListener("keyup", documentKeyup)

  fireEvent.keyUp(input, { key: "4" })
  expect(documentKeyup).not.toHaveBeenCalled()

  document.removeEventListener("keyup", documentKeyup)
})

it("AnnotationPin: the instruction textarea's own Escape-to-save still fires without the new guard double-handling it", () => {
  const onUpdateInstruction = vi.fn()
  const onDeselect = vi.fn()

  render(
    <AnnotationPin
      annotation={makeAnnotation({ instruction: "draft text" })}
      isActive={true}
      onClick={vi.fn()}
      onUpdateInstruction={onUpdateInstruction}
      onDelete={vi.fn()}
      onDeselect={onDeselect}
      onStartLink={vi.fn()}
    />
  )

  const textarea = screen.getByPlaceholderText(/指示を入力/)
  fireEvent.keyDown(textarea, { key: "Escape" })

  expect(onUpdateInstruction).toHaveBeenCalledOnce()
  expect(onDeselect).toHaveBeenCalledOnce()
})
