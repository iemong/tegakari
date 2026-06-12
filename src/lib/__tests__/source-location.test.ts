import { expect, it } from "vitest"
import { formatSourceLocation } from "../source-location"

it("formatSourceLocation: should join file and line with a colon", () => {
  expect(
    formatSourceLocation({ file: "src/components/Button.tsx", line: 42 })
  ).toBe("src/components/Button.tsx:42")
})

it("formatSourceLocation: should return file only when line is unknown", () => {
  expect(formatSourceLocation({ file: "src/components/Button.vue" })).toBe(
    "src/components/Button.vue"
  )
})
