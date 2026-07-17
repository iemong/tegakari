import type { Page } from "@playwright/test"

/**
 * Injects a fake circular cursor into the page. Playwright's video
 * recording never shows the real OS mouse pointer, so without this the
 * demo GIF would show elements highlighting/clicking with no visible
 * cause. The cursor follows real `mousemove` events (dispatched by
 * page.mouse.move) and pulses a ripple on `mousedown`.
 *
 * The extension's own toolbar renders via the native Popover API
 * (`popover="manual"`, see Toolbar.tsx `useTopLayer`) so it always paints
 * above regular DOM content regardless of z-index. To stay visible while
 * "clicking" toolbar buttons, the cursor also enters the top layer as a
 * popover, shown *after* the toolbar's — top-layer stacking is
 * show-order-based, so the most recently shown popover wins.
 *
 * Call this only after the overlay/toolbar has already mounted.
 *
 * The two functions below run entirely inside the page: they are
 * serialized by page.evaluate, so they must not close over module-scope
 * variables (element ids are therefore repeated literally in both).
 */
export async function injectFakeCursor(page: Page): Promise<void> {
  await page.evaluate(buildCursorElements)
  await page.evaluate(wireCursorEvents)
}

// Note: the Popover API's UA stylesheet applies default box styling
// ([popover] { position: fixed; padding: 0.25em; border: solid; ... })
// at normal-author-origin priority. Every property that matters here is
// set inline, which always wins over those UA defaults.
function buildCursorElements() {
  const buildDot = (id: string, background: string) => {
    const el = document.createElement("div")
    el.id = id
    el.style.position = "fixed"
    el.style.top = "0"
    el.style.left = "0"
    el.style.width = "20px"
    el.style.height = "20px"
    el.style.margin = "-10px 0 0 -10px"
    el.style.padding = "0"
    el.style.borderRadius = "50%"
    el.style.background = background
    el.style.pointerEvents = "none"
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.35)"
    el.style.transform = "translate(-100px, -100px)"
    return el
  }
  const showAsPopover = (el: HTMLElement) => {
    const withPopover = el as HTMLElement & {
      popover?: string
      showPopover?: () => void
    }
    withPopover.popover = "manual"
    try {
      withPopover.showPopover?.()
    } catch {
      // Popover API unsupported or already open — the fixed position
      // + high z-index fallback below still keeps it visible.
    }
    el.style.zIndex = "2147483647"
  }

  const cursor = buildDot("__demo_cursor__", "rgba(37, 99, 235, 0.92)")
  cursor.style.border = "2px solid #ffffff"
  const ripple = buildDot("__demo_cursor_ripple__", "transparent")
  ripple.style.border = "2px solid rgba(37, 99, 235, 0.9)"
  ripple.style.opacity = "0"

  document.documentElement.appendChild(cursor)
  document.documentElement.appendChild(ripple)
  showAsPopover(cursor)
  showAsPopover(ripple)
}

function wireCursorEvents() {
  const cursor = document.getElementById("__demo_cursor__")
  const ripple = document.getElementById("__demo_cursor_ripple__")
  if (!cursor || !ripple) return

  const place = (x: number, y: number) => {
    cursor.style.transform = `translate(${x}px, ${y}px)`
    ripple.style.transform = `translate(${x}px, ${y}px) scale(1)`
  }
  const pulse = (x: number, y: number) => {
    ripple.style.transition = "none"
    ripple.style.opacity = "0.9"
    ripple.style.transform = `translate(${x}px, ${y}px) scale(1)`
    requestAnimationFrame(() => {
      ripple.style.transition =
        "transform 0.45s ease-out, opacity 0.45s ease-out"
      ripple.style.opacity = "0"
      ripple.style.transform = `translate(${x}px, ${y}px) scale(2.4)`
    })
  }

  window.addEventListener(
    "mousemove",
    (e) => place(e.clientX, e.clientY),
    true
  )
  window.addEventListener(
    "mousedown",
    (e) => pulse(e.clientX, e.clientY),
    true
  )
}
