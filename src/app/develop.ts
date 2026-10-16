import type { DevelopValues } from "./types"

export const NEUTRAL: DevelopValues = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  temperature: 0, tint: 0, vibrance: 0, saturation: 0,
  hueRed: 0, satRed: 0, lumRed: 0,
  hueOrange: 0, satOrange: 0, lumOrange: 0,
  hueYellow: 0, satYellow: 0, lumYellow: 0,
  hueGreen: 0, satGreen: 0, lumGreen: 0,
  hueAqua: 0, satAqua: 0, lumAqua: 0,
  hueBlue: 0, satBlue: 0, lumBlue: 0,
  huePurple: 0, satPurple: 0, lumPurple: 0,
  hueMagenta: 0, satMagenta: 0, lumMagenta: 0,
  curveHighlights: 0, curveLights: 0, curveDarks: 0, curveShadows: 0,
  clarity: 0, sharpening: 0, sharpRadius: 0, sharpDetail: 0,
  noise: 0, noiseColor: 0,
  lensProfile: false, lensModel: "Auto (EXIF)", chromaticAberration: false, defringe: 0,
  distortion: 0, vignetting: 0, vignetteMidpoint: 50,
  rotation: 0, vertical: 0,
}

// Fills fields missing from catalogs saved before the recipe grew and clamps values safely.
export const migrateDevelop = (d: Partial<DevelopValues> | undefined): DevelopValues => ({
  ...NEUTRAL,
  ...sanitizeRecipe(d ?? {}),
})

export const clamp = (num: number, min: number, max: number): number => {
  if (typeof num !== "number" || !Number.isFinite(num)) return 0
  return Math.min(max, Math.max(min, num))
}

export function sanitizeDevelopValue(key: keyof DevelopValues, value: unknown): number | boolean | string {
  if (key === "lensProfile" || key === "chromaticAberration") {
    return Boolean(value)
  }
  if (key === "lensModel") {
    return typeof value === "string" ? value.slice(0, 80) : "Auto (EXIF)"
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return NEUTRAL[key] as number
  }
  switch (key) {
    case "rotation":
      return clamp(value, -180, 180)
    case "distortion":
      return clamp(value, -50, 50)
    case "sharpRadius":
      return clamp(value, 0, 3)
    case "sharpDetail":
    case "clarity":
    case "sharpening":
    case "noise":
    case "noiseColor":
    case "defringe":
    case "vignetting":
    case "vignetteMidpoint":
      return clamp(value, 0, 100)
    default:
      return clamp(value, -100, 100)
  }
}

export function sanitizeRecipe(recipe: Partial<DevelopValues>): Partial<DevelopValues> {
  if (!recipe || typeof recipe !== "object") return {}
  const sanitized: Partial<DevelopValues> = {}
  for (const k of Object.keys(recipe) as (keyof DevelopValues)[]) {
    if (k in NEUTRAL) {
      sanitized[k] = sanitizeDevelopValue(k, recipe[k]) as never
    }
  }
  return sanitized
}

export const isNeutral = (d: DevelopValues) =>
  (Object.keys(NEUTRAL) as (keyof DevelopValues)[]).every((k) => d[k] === NEUTRAL[k])


export const TONE_KEYS = [
  "exposure", "contrast", "highlights", "shadows", "whites", "blacks",
  "temperature", "tint", "vibrance", "saturation",
  "hueRed", "satRed", "lumRed",
  "hueOrange", "satOrange", "lumOrange",
  "hueYellow", "satYellow", "lumYellow",
  "hueGreen", "satGreen", "lumGreen",
  "hueAqua", "satAqua", "lumAqua",
  "hueBlue", "satBlue", "lumBlue",
  "huePurple", "satPurple", "lumPurple",
  "hueMagenta", "satMagenta", "lumMagenta",
  "curveHighlights", "curveLights", "curveDarks", "curveShadows",
  "clarity", "sharpening", "sharpRadius", "sharpDetail", "noise", "noiseColor",
  "lensProfile", "lensModel", "chromaticAberration", "defringe", "distortion",
  "vignetting", "vignetteMidpoint",
] as const

export const toneKey = (d: DevelopValues) => TONE_KEYS.map((k) => d[k]).join("|")

export const LENS_PROFILES = [
  { id: "Auto (EXIF)", name: "Auto (Detected from Lens EXIF)", defaultDistortion: -8, defaultVignette: 18 },
  { id: "Sony FE 24-70mm f/2.8 GM II", name: "Sony FE 24-70mm f/2.8 GM II", defaultDistortion: -12, defaultVignette: 24 },
  { id: "Canon RF 24-70mm f/2.8L IS USM", name: "Canon RF 24-70mm f/2.8L IS USM", defaultDistortion: -10, defaultVignette: 22 },
  { id: "Nikon NIKKOR Z 24-70mm f/2.8 S", name: "Nikon NIKKOR Z 24-70mm f/2.8 S", defaultDistortion: -11, defaultVignette: 20 },
  { id: "Fujifilm XF 16-55mm f/2.8 R LM WR", name: "Fujifilm XF 16-55mm f/2.8 R LM WR", defaultDistortion: -14, defaultVignette: 26 },
  { id: "Leica Summilux-M 35mm f/1.4 ASPH", name: "Leica Summilux-M 35mm f/1.4 ASPH", defaultDistortion: 5, defaultVignette: 30 },
  { id: "Generic 50mm Prime", name: "Generic 50mm F/1.8 Prime", defaultDistortion: -4, defaultVignette: 15 },
  { id: "Manual", name: "Manual / Custom Calibration", defaultDistortion: 0, defaultVignette: 0 },
]

export function getProfileDistortion(model?: string): number {
  const match = LENS_PROFILES.find((p) => p.id === model)
  return match?.defaultDistortion ?? -8
}

export const DEVELOP_LABELS: Record<keyof DevelopValues, string> = {
  exposure: "Exposure", contrast: "Contrast", highlights: "Highlights",
  shadows: "Shadows", whites: "Whites", blacks: "Blacks",
  temperature: "Temperature", tint: "Tint", vibrance: "Vibrance",
  saturation: "Saturation",
  hueRed: "Red Hue", satRed: "Red Saturation", lumRed: "Red Luminance",
  hueOrange: "Orange Hue", satOrange: "Orange Saturation", lumOrange: "Orange Luminance",
  hueYellow: "Yellow Hue", satYellow: "Yellow Saturation", lumYellow: "Yellow Luminance",
  hueGreen: "Green Hue", satGreen: "Green Saturation", lumGreen: "Green Luminance",
  hueAqua: "Aqua Hue", satAqua: "Aqua Saturation", lumAqua: "Aqua Luminance",
  hueBlue: "Blue Hue", satBlue: "Blue Saturation", lumBlue: "Blue Luminance",
  huePurple: "Purple Hue", satPurple: "Purple Saturation", lumPurple: "Purple Luminance",
  hueMagenta: "Magenta Hue", satMagenta: "Magenta Saturation", lumMagenta: "Magenta Luminance",
  curveHighlights: "Curve highlights", curveLights: "Curve lights",
  curveDarks: "Curve darks", curveShadows: "Curve shadows",
  clarity: "Clarity", sharpening: "Sharpening", sharpRadius: "Sharpen radius",
  sharpDetail: "Sharpen detail", noise: "Noise reduction", noiseColor: "Color noise reduction",
  lensProfile: "Enable profile corrections", lensModel: "Lens Profile",
  chromaticAberration: "Remove chromatic aberration", defringe: "Defringe amount",
  distortion: "Distortion correction", vignetting: "Vignetting",
  vignetteMidpoint: "Vignette midpoint",
  rotation: "Rotate", vertical: "Vertical",
}

export const PRESETS: { name: string; tone: string; values: Partial<DevelopValues> }[] = [
  { name: "Natural", tone: "coast", values: { exposure: 4, contrast: 8, vibrance: 10 } },
  { name: "Soft dusk", tone: "sunset", values: { exposure: 10, contrast: -8, highlights: -25, shadows: 20, temperature: 18, vibrance: 8 } },
  { name: "Cinematic", tone: "night", values: { contrast: 22, highlights: -30, shadows: -10, temperature: -12, clarity: 14 } },
  { name: "Warm film", tone: "desert", values: { temperature: 28, contrast: 6, shadows: 12, vibrance: -6 } },
  { name: "Cool fade", tone: "fog", values: { temperature: -22, contrast: -14, shadows: 18, vibrance: -10 } },
  { name: "Forest matte", tone: "forest", values: { contrast: -10, shadows: 24, temperature: 6, vibrance: 14, highlights: -12 } },
]


export const presetDevelop = (current: DevelopValues, values: Partial<DevelopValues>): DevelopValues => ({
  ...current,
  ...Object.fromEntries(TONE_KEYS.map((k) => [k, 0])),
  ...values,
})

export const matchesPreset = (d: DevelopValues, values: Partial<DevelopValues>) =>
  TONE_KEYS.every((k) => d[k] === (values[k] ?? 0))

// Cheap CSS approximation for art placeholders and preset thumbnails.
export function approxFilter(d: DevelopValues) {
  const brightness = 1 + d.exposure / 125 + d.shadows / 1200
  const contrast = 1 + d.contrast / 170 + d.clarity / 700
  const saturate = 1 + d.vibrance / 170 + d.saturation / 100
  const sepia = Math.max(0, d.temperature) / 290
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturate.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${(-d.temperature * 0.12).toFixed(1)}deg)`
}

const SRGB_TO_LIN = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  SRGB_TO_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const LUT_SIZE = 8192
const LIN_TO_SRGB = new Float32Array(LUT_SIZE + 1)
for (let i = 0; i <= LUT_SIZE; i++) {
  const c = i / LUT_SIZE
  LIN_TO_SRGB[i] = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function boxBlur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const size = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const row = y * w
    let sum = 0
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / size
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / size
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

const BUMPS = [0.125, 0.375, 0.625, 0.875]
// Parametric tone curve (shadows, darks, lights, highlights) as a 256-entry LUT; null when flat.
export function curveLut(d: DevelopValues): Float32Array | null {
  const p = [d.curveShadows, d.curveDarks, d.curveLights, d.curveHighlights]
  if (p.every((v) => v === 0)) return null
  const lut = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const x = i / 255
    let y = x
    for (let k = 0; k < 4; k++) {
      const b = Math.max(0, 1 - Math.abs(x - BUMPS[k]) / 0.3)
      y += (p[k] / 100) * 0.2 * b * b * (3 - 2 * b)
    }
    lut[i] = y
  }
  return lut
}
export const CURVE_BUMPS = BUMPS

export const HIST_BINS = 64

export type ToneResult = {
  data: Uint8ClampedArray
  histogram: [number[], number[], number[], number[]]
}

// Pure tone/color pipeline (WB -> exposure -> shadows/highlights in linear light,
// then contrast, clarity, vibrance in encoded space). Reused later for export.
export function applyTone(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  d: DevelopValues,
): ToneResult {
  const out = new Uint8ClampedArray(src.length)
  const hist: [number[], number[], number[], number[]] = [
    new Array(HIST_BINS).fill(0), new Array(HIST_BINS).fill(0), new Array(HIST_BINS).fill(0),
    new Array(HIST_BINS).fill(0),
  ]
  const t = d.temperature / 100
  const wr = 1 + 0.3 * t
  const wb = 1 - 0.3 * t
  const ev = Math.pow(2, (d.exposure / 100) * 2)
  const sh = d.shadows / 100
  const hl = d.highlights / 100
  const cf = d.contrast >= 0 ? 1 + (d.contrast / 100) * 0.9 : 1 + (d.contrast / 100) * 0.7
  const cl = (d.clarity / 100) * 1.2
  const vib = d.vibrance / 100
  const wh = d.whites / 100
  const bk = d.blacks / 100
  const tn = d.tint / 100
  const wg = 1 - 0.2 * tn
  const wm = 1 + 0.1 * tn
  const sat = 1 + d.saturation / 100
  const lut = curveLut(d)
  const sharpAmt = d.sharpening / 100
  const nr = d.noise / 100
  const fine = (blurRadius: number) => {
    const luma = new Float32Array(w * h)
    for (let p = 0, o = 0; p < luma.length; p++, o += 4)
      luma[p] = (0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2]) / 255
    return { luma, blur: boxBlur(luma, w, h, blurRadius) }
  }
  const sharpPass = sharpAmt > 0 ? fine(1 + Math.round(d.sharpRadius / 50)) : null
  const nrPass = nr > 0 ? fine(2) : null

  let blur: Float32Array | null = null
  if (cl !== 0) {
    const luma = new Float32Array(w * h)
    for (let p = 0, o = 0; p < luma.length; p++, o += 4)
      luma[p] = (0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2]) / 255
    blur = boxBlur(luma, w, h, Math.max(6, Math.round(Math.min(w, h) * 0.012)))
  }

  // Pre-calculate encode + global tonal adjustments (contrast, whites, blacks, curve)
  // These map [0, 1] input from linear light conversion to [0, 1] output before local adjustments
  const postEncodeLut = new Float32Array(LUT_SIZE + 1)
  for (let i = 0; i <= LUT_SIZE; i++) {
    let v = LIN_TO_SRGB[i]
    if (cf !== 1) {
      v = (v - 0.5) * cf + 0.5
    }
    if (wh !== 0 || bk !== 0) {
      v = v + wh * 0.25 * smooth(0.5, 1, v) + bk * 0.25 * (1 - smooth(0, 0.5, v))
    }
    if (lut) {
      const x = (v <= 0 ? 0 : v >= 1 ? 1 : v) * 255
      const idx = x | 0
      v = lut[idx] + (lut[Math.min(255, idx + 1)] - lut[idx]) * (x - idx)
    }
    postEncodeLut[i] = v
  }

  const vig = d.vignetting / 100
  const vigMid = Math.max(0.1, Math.min(0.9, (d.vignetteMidpoint ?? 50) / 100))
  const cx = w * 0.5
  const cy = h * 0.5
  const maxR = Math.hypot(cx, cy)
  const hasVig = vig !== 0
  const hasCa = d.chromaticAberration || (d.defringe ?? 0) > 0
  const defringeAmt = d.chromaticAberration ? Math.max(d.defringe ?? 0, 40) / 100 : (d.defringe ?? 0) / 100

  for (let p = 0, o = 0; p < w * h; p++, o += 4) {
    let r = SRGB_TO_LIN[src[o]] * wr * wm * ev
    let g = SRGB_TO_LIN[src[o + 1]] * wg * ev
    let b = SRGB_TO_LIN[src[o + 2]] * wb * wm * ev
    if (sh !== 0 || hl !== 0) {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const f =
        (1 + sh * 0.9 * (1 - smooth(0, 0.45, y))) * (1 + hl * 0.7 * smooth(0.35, 1.2, y))
      r *= f; g *= f; b *= f
    }

    // Instead of computing encode -> contrast -> lift -> lut per pixel,
    // lookup the pre-computed value based on the linear color.
    const rIdx = r <= 0 ? 0 : r >= 1 ? LUT_SIZE : (r * LUT_SIZE + 0.5) | 0
    const gIdx = g <= 0 ? 0 : g >= 1 ? LUT_SIZE : (g * LUT_SIZE + 0.5) | 0
    const bIdx = b <= 0 ? 0 : b >= 1 ? LUT_SIZE : (b * LUT_SIZE + 0.5) | 0

    let er = postEncodeLut[rIdx]
    let eg = postEncodeLut[gIdx]
    let eb = postEncodeLut[bIdx]

    if (blur) {
      const y = 0.2126 * er + 0.7152 * eg + 0.0722 * eb
      const m = 1 - (2 * y - 1) * (2 * y - 1)
      const delta = (y - blur[p]) * cl * m
      er += delta; eg += delta; eb += delta
    }
    if (vib !== 0) {
      const mx = Math.max(er, eg, eb)
      const mn = Math.min(er, eg, eb)
      const sat = mx > 0 ? (mx - mn) / mx : 0
      const amt = vib > 0 ? vib * (1 - sat) : vib
      const gray = 0.2126 * er + 0.7152 * eg + 0.0722 * eb
      er = gray + (er - gray) * (1 + amt)
      eg = gray + (eg - gray) * (1 + amt)
      eb = gray + (eb - gray) * (1 + amt)
    }
    if (sat !== 1) {
      const gray = 0.2126 * er + 0.7152 * eg + 0.0722 * eb
      er = gray + (er - gray) * sat
      eg = gray + (eg - gray) * sat
      eb = gray + (eb - gray) * sat
    }
    if (hasVig) {
      const px = p % w
      const py = (p / w) | 0
      const dist = Math.hypot(px - cx, py - cy) / maxR
      const norm = Math.max(0, Math.min(1, (dist - vigMid * 0.4) / (1 - vigMid * 0.4)))
      const factor = Math.max(0, 1 + vig * (norm * norm))
      er *= factor
      eg *= factor
      eb *= factor
    }
    if (hasCa) {
      const purpleFringe = (er + eb) * 0.5 - eg
      if (purpleFringe > 0.06) {
        const reduction = Math.min(purpleFringe * defringeAmt, 0.25)
        er -= reduction * 0.6
        eb -= reduction
      }
    }
    if (sharpPass || nrPass) {
      let delta = 0
      if (sharpPass) delta += (sharpPass.luma[p] - sharpPass.blur[p]) * sharpAmt * 1.5
      if (nrPass) delta += (nrPass.blur[p] - nrPass.luma[p]) * nr
      er += delta; eg += delta; eb += delta
    }
    const R = er <= 0 ? 0 : er >= 1 ? 255 : (er * 255 + 0.5) | 0
    const G = eg <= 0 ? 0 : eg >= 1 ? 255 : (eg * 255 + 0.5) | 0
    const B = eb <= 0 ? 0 : eb >= 1 ? 255 : (eb * 255 + 0.5) | 0
    out[o] = R; out[o + 1] = G; out[o + 2] = B; out[o + 3] = src[o + 3]
    hist[3][(0.2126 * R + 0.7152 * G + 0.0722 * B) >> 2]++; hist[0][R >> 2]++; hist[1][G >> 2]++; hist[2][B >> 2]++
  }
  return { data: out, histogram: hist }
}

// Rotation (cover-scaled), vertical keystone, and optic distortion drawn onto `target`.
export function drawGeometry(
  target: HTMLCanvasElement,
  source: HTMLCanvasElement,
  rotation: number,
  vertical: number,
  distortion: number = 0,
) {
  const w = source.width, h = source.height
  target.width = w
  target.height = h
  const ctx = target.getContext("2d")!
  ctx.clearRect(0, 0, w, h)
  const rad = (rotation * Math.PI) / 180
  const cover =
    Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)) * Math.max(w / h, h / w)
  const k = (vertical / 100) * 0.4
  const d = (distortion / 100) * 0.15
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(rad)
  const s = cover * (1 + Math.abs(k) + Math.abs(d))
  ctx.scale(s, s)
  if (k === 0 && d === 0) ctx.drawImage(source, -w / 2, -h / 2)
  else {
    const slices = 36
    const sliceH = h / slices
    for (let i = 0; i < slices; i++) {
      const y = i * sliceH
      const ny = (y + sliceH * 0.5) / h - 0.5
      const radDist = Math.abs(ny) * 2
      const distScale = 1 - d * (radDist * radDist)
      const sx = (1 + k * (2 * ((y + sliceH) / h) - 1)) * distScale
      ctx.drawImage(
        source,
        0,
        y,
        w,
        sliceH,
        (-w / 2) * sx,
        y - h / 2,
        w * sx,
        sliceH + 0.6,
      )
    }
  }
  ctx.restore()
}

// Luma unsharp mask, in place on RGBA bytes.
export function sharpen(data: Uint8ClampedArray, w: number, h: number, amount: number) {
  if (amount <= 0) return
  const luma = new Float32Array(w * h)
  for (let p = 0, o = 0; p < luma.length; p++, o += 4)
    luma[p] = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
  const blur = boxBlur(luma, w, h, 1)
  for (let p = 0, o = 0; p < luma.length; p++, o += 4) {
    const delta = (luma[p] - blur[p]) * amount
    data[o] += delta
    data[o + 1] += delta
    data[o + 2] += delta
  }
}
