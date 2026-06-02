import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { darkTheme } from "~lib/theme"

import { AppearanceSection } from "../appearance-section"

afterEach(cleanup)

describe("AppearanceSection", () => {
  it("renders both Light and Dark options and shows the current mode", () => {
    render(
      <AppearanceSection theme={darkTheme} mode="dark" onToggle={vi.fn()} />
    )

    expect(screen.getByRole("radio", { name: /Light/ })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Dark/ })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Dark/ })).toHaveAttribute(
      "aria-checked",
      "true"
    )
    expect(screen.getByText(/Currently dark mode/)).toBeInTheDocument()
  })

  it("calls onToggle when the non-selected option is clicked", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <AppearanceSection theme={darkTheme} mode="light" onToggle={onToggle} />
    )

    await user.click(screen.getByRole("radio", { name: /Dark/ }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("does not call onToggle when the already-selected option is clicked", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <AppearanceSection theme={darkTheme} mode="light" onToggle={onToggle} />
    )

    await user.click(screen.getByRole("radio", { name: /Light/ }))
    expect(onToggle).not.toHaveBeenCalled()
  })
})
