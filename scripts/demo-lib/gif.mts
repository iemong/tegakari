import { execFileSync } from "node:child_process"
import { statSync } from "node:fs"
import { join } from "node:path"

const FFMPEG_BIN = process.env.FFMPEG_BIN ?? "ffmpeg"
const MAX_BYTES = 10 * 1024 * 1024

interface Tier {
  fps: number
  width: number
}

// Tried in order until the resulting GIF fits under MAX_BYTES.
const TIERS: Tier[] = [
  { fps: 12, width: 800 },
  { fps: 10, width: 720 },
  { fps: 10, width: 640 },
  { fps: 8, width: 560 },
]

/**
 * Two-pass palette conversion (palettegen/paletteuse) for a much better
 * GIF than a single-pass `-vf scale,fps` would give. Retries at
 * progressively smaller fps/width tiers until the file is <= 10MB.
 */
export function convertWebmToGif(webmPath: string, outputGif: string): {
  bytes: number
  tier: Tier
} {
  let last: { bytes: number; tier: Tier } | null = null
  for (const tier of TIERS) {
    renderGif(webmPath, outputGif, tier)
    const bytes = statSync(outputGif).size
    console.log(
      `[demo] gif @ fps=${tier.fps} width=${tier.width}: ${(bytes / 1024 / 1024).toFixed(2)}MB`
    )
    last = { bytes, tier }
    if (bytes <= MAX_BYTES) return last
  }
  console.warn(
    `[demo] WARNING: could not get under 10MB, shipping smallest tier attempted (${((last?.bytes ?? 0) / 1024 / 1024).toFixed(2)}MB)`
  )
  return last as { bytes: number; tier: Tier }
}

function renderGif(webmPath: string, outputGif: string, tier: Tier): void {
  const paletteFile = join(
    process.env.TMPDIR ?? "/tmp",
    `tegakari-demo-palette-${tier.fps}-${tier.width}.png`
  )
  const scaleFilter = `scale=${tier.width}:-1:flags=lanczos`

  execFileSync(FFMPEG_BIN, [
    "-y",
    "-i",
    webmPath,
    "-vf",
    `fps=${tier.fps},${scaleFilter},palettegen=stats_mode=diff`,
    "-update",
    "1",
    "-frames:v",
    "1",
    paletteFile,
  ])

  execFileSync(FFMPEG_BIN, [
    "-y",
    "-i",
    webmPath,
    "-i",
    paletteFile,
    "-filter_complex",
    `fps=${tier.fps},${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    "-loop",
    "0",
    outputGif,
  ])
}
