// Compose the per-annotation screenshot crops into a single contact-sheet
// image with pin-style number badges. One image fits the clipboard (which
// cannot carry multiple images), and is copied separately from the text so
// image-preferring paste targets never swallow the text output (#21).

import type { Annotation } from "./types"

export const SHEET_METRICS = {
  cellWidth: 320,
  cellHeight: 240,
  gap: 12,
  padding: 16,
  badgeRadius: 13,
} as const

export interface SheetCell {
  x: number
  y: number
  width: number
  height: number
}

export interface SheetLayout {
  width: number
  height: number
  columns: number
  rows: number
  cells: SheetCell[]
}

export function computeSheetLayout(count: number): SheetLayout {
  const { cellWidth, cellHeight, gap, padding } = SHEET_METRICS
  const columns = count <= 1 ? 1 : Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / columns)

  const cells: SheetCell[] = []
  for (let i = 0; i < count; i++) {
    const col = i % columns
    const row = Math.floor(i / columns)
    cells.push({
      x: padding + col * (cellWidth + gap),
      y: padding + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    })
  }

  return {
    width: padding * 2 + columns * cellWidth + (columns - 1) * gap,
    height: padding * 2 + rows * cellHeight + (rows - 1) * gap,
    columns,
    rows,
    cells,
  }
}

/** Contain-fit a source image into a cell, centered */
export function fitRect(
  srcWidth: number,
  srcHeight: number,
  cell: SheetCell
): SheetCell {
  const scale = Math.min(cell.width / srcWidth, cell.height / srcHeight, 1)
  const width = srcWidth * scale
  const height = srcHeight * scale
  return {
    x: cell.x + (cell.width - width) / 2,
    y: cell.y + (cell.height - height) / 2,
    width,
    height,
  }
}

interface SheetItem {
  id: number
  img: HTMLImageElement
}

export async function renderContactSheet(
  annotations: Annotation[]
): Promise<Blob | null> {
  const withShots = annotations.filter((a) => a.screenshot)
  if (withShots.length === 0) return null

  const loaded = await Promise.all(
    withShots.map(async (a) => {
      const img = await loadImage(a.screenshot!)
      return img ? { id: a.id, img } : null
    })
  )
  const items = loaded.filter((item): item is SheetItem => item !== null)
  if (items.length === 0) return null

  const layout = computeSheetLayout(items.length)
  const canvas = document.createElement("canvas")
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  drawSheet(ctx, layout, items)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  })
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function drawSheet(
  ctx: CanvasRenderingContext2D,
  layout: SheetLayout,
  items: SheetItem[]
) {
  ctx.fillStyle = "#1c1c1f"
  ctx.fillRect(0, 0, layout.width, layout.height)

  items.forEach((item, i) => {
    const cell = layout.cells[i]
    const fitted = fitRect(item.img.width, item.img.height, cell)
    ctx.drawImage(item.img, fitted.x, fitted.y, fitted.width, fitted.height)
    drawBadge(ctx, cell, item.id)
  })
}

// Pin-style badge: accent circle + white id, matching AnnotationPin so the
// numbers line up with the ids referenced in the text output.
function drawBadge(
  ctx: CanvasRenderingContext2D,
  cell: SheetCell,
  id: number
) {
  const { badgeRadius } = SHEET_METRICS
  const cx = cell.x + badgeRadius + 4
  const cy = cell.y + badgeRadius + 4

  ctx.beginPath()
  ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2)
  ctx.fillStyle = "#2563eb"
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = "#ffffff"
  ctx.stroke()

  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 13px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(String(id), cx, cy)
}
