import { afterEach, expect, it } from "vitest"
import { buildElementInfo } from "../overlay-helpers"

afterEach(() => {
  document.body.innerHTML = ""
  document.head.innerHTML = ""
})

it("buildElementInfo: wires css-provenance into ElementInfo.cssRules/customProperties", () => {
  const style = document.createElement("style")
  style.textContent = ":root { --brand: rgb(37, 99, 235); } .card { color: red; }"
  document.head.appendChild(style)
  const el = document.createElement("div")
  el.className = "card"
  document.body.appendChild(el)

  const info = buildElementInfo(el, "div.card")

  expect(info.cssRules).toEqual([
    { selector: ".card", source: "inline", declarations: ["color: red"] },
  ])
})

it("buildElementInfo: omits cssRules when nothing matches", () => {
  const el = document.createElement("div")
  document.body.appendChild(el)

  const info = buildElementInfo(el, "div")

  expect(info.cssRules).toBeUndefined()
  expect(info.customProperties).toBeUndefined()
})
