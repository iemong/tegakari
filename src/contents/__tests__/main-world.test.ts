import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("~lib/framework-detector", () => ({
  detectFramework: vi.fn(),
}))
vi.mock("~lib/react-collector", () => ({
  collectReactComponent: vi.fn(),
}))
vi.mock("~lib/vue-collector", () => ({
  collectVueComponent: vi.fn(),
}))

import { detectFramework } from "~lib/framework-detector"
import { collectReactComponent } from "~lib/react-collector"
import { collectVueComponent } from "~lib/vue-collector"

function createMessageEvent(data: unknown, fromWindow = true): MessageEvent {
  const event = new MessageEvent("message", { data })
  if (fromWindow) {
    Object.defineProperty(event, "source", { value: window })
  }
  return event
}

describe("main-world message handler", () => {
  let messageHandler: (event: MessageEvent) => void
  const postMessageSpy = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    vi.mocked(detectFramework).mockReset()
    vi.mocked(collectReactComponent).mockReset()
    vi.mocked(collectVueComponent).mockReset()
    postMessageSpy.mockReset()

    const originalPostMessage = window.postMessage.bind(window)
    window.postMessage = postMessageSpy

    const addEventListenerSpy = vi.spyOn(window, "addEventListener")

    const module = await import("../main-world")
    expect(module.config).toEqual({
      matches: ["<all_urls>"],
      world: "MAIN",
    })

    const call = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === "message"
    )
    messageHandler = call![1] as any

    addEventListenerSpy.mockRestore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should ignore events not from window", () => {
    const event = createMessageEvent(
      { type: "TEGAKARI_COLLECT", selector: "#app" },
      false
    )

    messageHandler(event)

    expect(postMessageSpy).not.toHaveBeenCalled()
  })

  it("should ignore events with wrong type", () => {
    const event = createMessageEvent({ type: "OTHER_TYPE" })

    messageHandler(event)

    expect(postMessageSpy).not.toHaveBeenCalled()
  })

  it("should handle TEGAKARI_COLLECT with React framework", () => {
    document.body.innerHTML = '<div id="app"></div>'
    vi.mocked(detectFramework).mockReturnValue({
      framework: "React",
      metaFramework: null,
    })
    vi.mocked(collectReactComponent).mockReturnValue({
      framework: "react",
      hierarchy: ["App"],
      props: { title: "Test" },
    })

    const event = createMessageEvent({
      type: "TEGAKARI_COLLECT",
      selector: "#app",
    })

    messageHandler(event)

    expect(collectReactComponent).toHaveBeenCalled()
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: "TEGAKARI_RESULT",
        framework: { framework: "React", metaFramework: null },
        component: {
          framework: "react",
          hierarchy: ["App"],
          props: { title: "Test" },
        },
      },
      "*"
    )
  })

  it("should handle TEGAKARI_COLLECT with Vue framework", () => {
    document.body.innerHTML = '<div id="app"></div>'
    vi.mocked(detectFramework).mockReturnValue({
      framework: "Vue",
      metaFramework: null,
    })
    vi.mocked(collectVueComponent).mockReturnValue({
      framework: "vue",
      hierarchy: ["App"],
    })

    const event = createMessageEvent({
      type: "TEGAKARI_COLLECT",
      selector: "#app",
    })

    messageHandler(event)

    expect(collectVueComponent).toHaveBeenCalled()
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: "TEGAKARI_RESULT",
        framework: { framework: "Vue", metaFramework: null },
        component: { framework: "vue", hierarchy: ["App"] },
      },
      "*"
    )
  })

  it("should handle TEGAKARI_COLLECT with no framework", () => {
    document.body.innerHTML = '<div id="app"></div>'
    vi.mocked(detectFramework).mockReturnValue(null)

    const event = createMessageEvent({
      type: "TEGAKARI_COLLECT",
      selector: "#app",
    })

    messageHandler(event)

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: "TEGAKARI_RESULT",
        framework: null,
        component: null,
      },
      "*"
    )
  })

  it("should handle TEGAKARI_COLLECT when element not found", () => {
    document.body.innerHTML = ""
    vi.mocked(detectFramework).mockReturnValue({
      framework: "React",
      metaFramework: null,
    })

    const event = createMessageEvent({
      type: "TEGAKARI_COLLECT",
      selector: "#nonexistent",
    })

    messageHandler(event)

    expect(collectReactComponent).not.toHaveBeenCalled()
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: "TEGAKARI_RESULT",
        framework: { framework: "React", metaFramework: null },
        component: null,
      },
      "*"
    )
  })

  it("should ignore events with undefined data", () => {
    const event = createMessageEvent(undefined)

    messageHandler(event)

    expect(postMessageSpy).not.toHaveBeenCalled()
  })
})
