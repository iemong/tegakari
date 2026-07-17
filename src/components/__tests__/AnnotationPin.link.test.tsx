import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

it("AnnotationPin: clicking Link on the popover starts link mode and closes the popover", async () => {
  const user = userEvent.setup()
  const onStartLink = vi.fn()
  const onDeselect = vi.fn()

  render(
    <AnnotationPin
      annotation={makeAnnotation()}
      isActive={true}
      onClick={vi.fn()}
      onUpdateInstruction={vi.fn()}
      onDelete={vi.fn()}
      onDeselect={onDeselect}
      onStartLink={onStartLink}
    />
  )

  await user.click(screen.getByRole("button", { name: "Link" }))

  expect(onStartLink).toHaveBeenCalledTimes(1)
  expect(onDeselect).toHaveBeenCalledTimes(1)
})

it("AnnotationPin: an inactive pin still exposes the pin marker for link-mode targeting", () => {
  render(
    <AnnotationPin
      annotation={makeAnnotation({ id: 2 })}
      isActive={false}
      onClick={vi.fn()}
      onUpdateInstruction={vi.fn()}
      onDelete={vi.fn()}
      onDeselect={vi.fn()}
      onStartLink={vi.fn()}
      linkModeActive={true}
    />
  )

  const marker = screen.getByTestId("tegakari-pin-2")
  expect(marker.style.cursor).toBe("crosshair")
})

it("AnnotationPin: the link source pin gets a dashed border instead of the normal active ring", () => {
  render(
    <AnnotationPin
      annotation={makeAnnotation({ id: 3 })}
      isActive={false}
      onClick={vi.fn()}
      onUpdateInstruction={vi.fn()}
      onDelete={vi.fn()}
      onDeselect={vi.fn()}
      onStartLink={vi.fn()}
      linkModeActive={true}
      isLinkSource={true}
    />
  )

  const marker = screen.getByTestId("tegakari-pin-3")
  expect(marker.style.border).toContain("dashed")
  expect(marker.style.cursor).toBe("pointer")
})
