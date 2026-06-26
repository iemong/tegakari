import { beforeEach, describe, expect, it } from "vitest"

import { climbToAncestor } from "../dom-traverse"

describe("climbToAncestor", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="grandparent">
        <div id="parent">
          <button id="child"><span id="leaf">x</span></button>
        </div>
      </section>
    `
  })

  const el = (id: string) => document.getElementById(id) as Element

  it("returns the base element when steps is 0", () => {
    const result = climbToAncestor(el("leaf"), 0)
    expect(result.element).toBe(el("leaf"))
    expect(result.steps).toBe(0)
  })

  it("climbs one parent up", () => {
    const result = climbToAncestor(el("leaf"), 1)
    expect(result.element).toBe(el("child"))
    expect(result.steps).toBe(1)
  })

  it("climbs multiple parents up", () => {
    const result = climbToAncestor(el("leaf"), 3)
    expect(result.element).toBe(el("grandparent"))
    expect(result.steps).toBe(3)
  })

  it("clamps steps to the available depth and stops before <body>", () => {
    const result = climbToAncestor(el("leaf"), 99)
    // grandparent is a direct child of <body>; we never select <body> itself.
    expect(result.element).toBe(el("grandparent"))
    expect(result.steps).toBe(3)
  })

  it("returns the base unchanged when it is already a body child", () => {
    const result = climbToAncestor(el("grandparent"), 5)
    expect(result.element).toBe(el("grandparent"))
    expect(result.steps).toBe(0)
  })
})
