import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"

import type { Annotation, Relation } from "~lib/types"

import RelationLayer from "../RelationLayer"

afterEach(cleanup)

function annotation(id: number, pageX: number, pageY: number): Annotation {
  return {
    id,
    elementInfo: { selector: `#a${id}`, tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX,
    pageY,
    createdAt: 0,
  }
}

const annotations = [annotation(1, 100, 100), annotation(2, 300, 100)]
const relation: Relation = { id: 1, fromId: 1, toId: 2, instruction: "Align these" }

function baseProps() {
  return {
    relations: [relation],
    annotations,
    pendingRelation: null,
    activeRelationId: null,
    onSelectRelation: vi.fn(),
    onDeselectRelation: vi.fn(),
    onUpdateInstruction: vi.fn(),
    onDeleteRelation: vi.fn(),
    onConfirmPending: vi.fn(),
    onCancelPending: vi.fn(),
  }
}

it("renders one label per relation, showing its id", () => {
  render(<RelationLayer {...baseProps()} />)
  expect(screen.getByText("1")).toBeInTheDocument()
})

it("clicking a relation's label selects it", () => {
  const props = baseProps()
  render(<RelationLayer {...props} />)

  fireEvent.click(screen.getByText("1"))

  expect(props.onSelectRelation).toHaveBeenCalledWith(1)
})

it("shows the edit/delete popover for the active relation, prefilled with its instruction", () => {
  const props = { ...baseProps(), activeRelationId: 1 }
  render(<RelationLayer {...props} />)

  expect(screen.getByText("#1 ↔ #2")).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/指示を入力/)).toHaveValue("Align these")
})

it("editing and saving the active relation's popover calls onUpdateInstruction with the trimmed text", () => {
  const props = { ...baseProps(), activeRelationId: 1 }
  render(<RelationLayer {...props} />)

  const textarea = screen.getByPlaceholderText(/指示を入力/)
  fireEvent.change(textarea, { target: { value: "  Updated  " } })
  fireEvent.click(screen.getByRole("button", { name: "Save" }))

  expect(props.onUpdateInstruction).toHaveBeenCalledWith(1, "Updated")
})

it("clicking Delete on the active relation's popover calls onDeleteRelation", () => {
  const props = { ...baseProps(), activeRelationId: 1 }
  render(<RelationLayer {...props} />)

  fireEvent.click(screen.getByTitle("Delete relation"))

  expect(props.onDeleteRelation).toHaveBeenCalledWith(1)
})

it("pressing Escape in the active relation's popover closes it without saving", () => {
  const props = { ...baseProps(), activeRelationId: 1 }
  render(<RelationLayer {...props} />)

  fireEvent.change(screen.getByPlaceholderText(/指示を入力/), {
    target: { value: "unsaved edit" },
  })
  fireEvent.keyDown(screen.getByPlaceholderText(/指示を入力/), { key: "Escape" })

  expect(props.onDeselectRelation).toHaveBeenCalled()
  expect(props.onUpdateInstruction).not.toHaveBeenCalled()
})

it("renders a pending relation's form with no Delete button and a disabled Save until text is entered", () => {
  const props = {
    ...baseProps(),
    relations: [],
    pendingRelation: { fromId: 1, toId: 2 },
  }
  render(<RelationLayer {...props} />)

  expect(screen.getByText("#1 ↔ #2")).toBeInTheDocument()
  expect(screen.queryByTitle("Delete relation")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()

  fireEvent.change(screen.getByPlaceholderText(/指示を入力/), {
    target: { value: "New relation" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Save" }))

  expect(props.onConfirmPending).toHaveBeenCalledWith("New relation")
})

it("Cancel on the pending relation's form calls onCancelPending without saving", () => {
  const props = {
    ...baseProps(),
    relations: [],
    pendingRelation: { fromId: 1, toId: 2 },
  }
  render(<RelationLayer {...props} />)

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

  expect(props.onCancelPending).toHaveBeenCalled()
  expect(props.onConfirmPending).not.toHaveBeenCalled()
})

it("renders nothing extra when there are no relations and no pending relation", () => {
  const props = { ...baseProps(), relations: [] }
  const { container } = render(<RelationLayer {...props} />)

  expect(container.querySelector("line")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
})
