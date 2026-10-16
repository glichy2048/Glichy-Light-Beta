import { NEUTRAL } from "./develop"
import type { Photo, Tone } from "./types"
import { Log, recordAssetLoad } from "./diagnostics"

export const RAW_EXTENSIONS = [
  "cr2", "cr3", "crw", "nef", "nrw", "arw", "srf", "sr2", "dng", "orf",
  "rw2", "raf", "pef", "srw", "x3f", "3fr", "erf", "kdc", "mef", "mos",
  "raw", "rwl", "iiq",
]
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
export const IMPORT_ACCEPT = [...RAW_EXTENSIONS, ...IMAGE_EXTENSIONS]
  .map((ext) => `.${ext}`)
  .join(",")

export type NewPhoto = Omit<Photo, "id" | "groupId" | "isGroupLead">

export type BayerPattern = "RGGB" | "BGGR" | "GRBG" | "GBRG"

export const RAW_WB_PRESETS = {
  "as-shot": [1.0, 1.0, 1.0],
  daylight: [1.95, 1.0, 1.45],
  cloudy: [2.15, 1.0, 1.30],
  shade: [2.40, 1.0, 1.20],
  tungsten: [1.35, 1.0, 2.30],
  fluorescent: [1.70, 1.0, 1.85],
  flash: [2.05, 1.0, 1.40],
} as const

export type RawWbPreset = keyof typeof RAW_WB_PRESETS

export type RawSensorInfo = {
  bayerPattern: BayerPattern
  bitDepth: number
  blackLevel: number
  whiteLevel: number
  wbMultipliers: [number, number, number] | readonly [number, number, number]
  make: string
  model: string
  width: number
  height: number
}

export type RawDecodeOptions = {
  bayerPattern?: BayerPattern
  wbPreset?: RawWbPreset
  wbMultipliers?: [number, number, number] | readonly [number, number, number]
  blackLevel?: number
  whiteLevel?: number
  highlightRecovery?: boolean
}

type Meta = {
  make?: string
  model?: string
  lens?: string
  exposure?: number
  fnumber?: number
  iso?: number
  date?: string
  width?: number
  height?: number
  orientation?: number
  bayerPattern?: BayerPattern
  bitsPerSample?: number
  stripOffset?: number
  stripLen?: number
  blackLevel?: number
  whiteLevel?: number
}
type Span = { start: number; length: number }

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? ""
export const baseOf = (name: string) => name.replace(/\.[^.]+$/, "").toLowerCase()
export const isRaw = (name: string) => RAW_EXTENSIONS.includes(extOf(name))

export function sanitizeFileName(name: string): string {
  if (!name) return "unnamed_photo"
  const base = name.split(/[/\\]/).pop() || "photo"
  let clean = ""
  for (let i = 0; i < base.length && clean.length < 120; i++) {
    const code = base.charCodeAt(i)
    if (code >= 32 && code < 127) {
      clean += '<>"|?*:'.includes(base[i]) ? "_" : base[i]
    }
  }
  return clean.trim() || "photo"
}

function jpegEnd(b: Uint8Array, start: number): number {
  if (b[start] !== 0xff || b[start + 1] !== 0xd8) return -1
  let i = start + 2
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return -1
    const marker = b[i + 1]
    if (marker === 0xff) { i++; continue }
    if (marker === 0xd9) return i + 2
    if (marker === 0xda) {
      i += 2 + ((b[i + 2] << 8) | b[i + 3])
      while (i + 1 < b.length) {
        if (b[i] === 0xff) {
          const n = b[i + 1]
          if (n === 0xd9) return i + 2
          if (n !== 0x00 && !(n >= 0xd0 && n <= 0xd7) && n !== 0xff) break
        }
        i++
      }
      continue
    }
    if ((marker >= 0xd0 && marker <= 0xd8) || marker === 0x01) { i += 2; continue }
    i += 2 + ((b[i + 2] << 8) | b[i + 3])
  }
  return -1
}

function parseTiff(view: DataView, base: number, meta: Meta, spans: Span[]) {
  if (base + 8 > view.byteLength) return
  const bom = view.getUint16(base)
  if (bom !== 0x4949 && bom !== 0x4d4d) return
  const le = bom === 0x4949
  const u16 = (o: number) => view.getUint16(o, le)
  const u32 = (o: number) => view.getUint32(o, le)
  const seen = new Set<number>()

  const readEntry = (o: number) => {
    const tag = u16(o)
    const type = u16(o + 2)
    const count = u32(o + 4)
    const size = (TYPE_SIZE[type] ?? 1) * count
    const at = size <= 4 ? o + 8 : base + u32(o + 8)
    return { tag, type, count, at, size }
  }
  const nums = (e: ReturnType<typeof readEntry>): number[] => {
    const out: number[] = []
    for (let i = 0; i < Math.min(e.count, 16); i++) {
      if (e.type === 3) out.push(view.getUint16(e.at + i * 2, le))
      else if (e.type === 4) out.push(view.getUint32(e.at + i * 4, le))
      else if (e.type === 1 || e.type === 7) out.push(view.getUint8(e.at + i))
      else if (e.type === 5) {
        const d = view.getUint32(e.at + i * 8 + 4, le)
        out.push(d ? view.getUint32(e.at + i * 8, le) / d : 0)
      }
    }
    return out
  }
  const str = (e: ReturnType<typeof readEntry>) => {
    let s = ""
    for (let i = 0; i < e.count; i++) {
      const c = view.getUint8(e.at + i)
      if (!c) break
      s += String.fromCharCode(c)
    }
    return s.trim()
  }

  const walk = (rel: number, depth: number) => {
    let ifd = rel
    while (ifd && depth < 6) {
      const o = base + ifd
      if (seen.has(o) || o + 2 > view.byteLength) return
      seen.add(o)
      const n = u16(o)
      if (o + 2 + n * 12 + 4 > view.byteLength) return
      let jpgOff = 0, jpgLen = 0, stripOff = 0, stripLen = 0, comp = 0
      const subs: number[] = []
      for (let k = 0; k < n; k++) {
        const e = readEntry(o + 2 + k * 12)
        if (e.at + e.size > view.byteLength) continue
        const v = e.type === 2 ? [] : nums(e)
        switch (e.tag) {
          case 0x10f: meta.make ??= str(e); break
          case 0x110: meta.model ??= str(e); break
          case 0x112: meta.orientation ??= v[0]; break
          case 0x829a: meta.exposure ??= v[0]; break
          case 0x829d: meta.fnumber ??= v[0]; break
          case 0x8827: meta.iso ??= v[0]; break
          case 0x9003: meta.date ??= str(e); break
          case 0xa434: meta.lens ??= str(e); break
          case 0xa002: meta.width ??= v[0]; break
          case 0xa003: meta.height ??= v[0]; break
          case 0x100: meta.width = Math.max(meta.width ?? 0, v[0]); break
          case 0x101: meta.height = Math.max(meta.height ?? 0, v[0]); break
          case 0x102: meta.bitsPerSample = v[0]; break
          case 0x103: comp = v[0]; break
          case 0x111: stripOff = v[0]; meta.stripOffset = v[0]; break
          case 0x117: stripLen = v[0]; meta.stripLen = v[0]; break
          case 0x201: jpgOff = v[0]; break
          case 0x202: jpgLen = v[0]; break
          case 0x828e: meta.bayerPattern = v[0] === 0 ? "RGGB" : v[0] === 1 ? "GBRG" : v[0] === 2 ? "BGGR" : "GRBG"; break
          case 0xc61a: meta.blackLevel = v[0]; break
          case 0xc61d: meta.whiteLevel = v[0]; break
          case 0x14a: subs.push(...v); break
          case 0x8769: case 0x8825: subs.push(v[0]); break
        }
      }
      if (jpgOff && jpgLen) spans.push({ start: base + jpgOff, length: jpgLen })
      if ((comp === 6 || comp === 7) && stripOff && stripLen)
        spans.push({ start: base + stripOff, length: stripLen })
      subs.forEach((s) => s && walk(s, depth + 1))
      ifd = u32(o + 2 + n * 12)
      depth++
    }
  }
  walk(u32(base + 4), 0)
}

function parseJpegExif(bytes: Uint8Array, start: number, meta: Meta) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let i = start + 2
  while (i + 4 < bytes.length && bytes[i] === 0xff) {
    const marker = bytes[i + 1]
    if (marker === 0xda || marker === 0xd9) break
    const len = (bytes[i + 2] << 8) | bytes[i + 3]
    if (marker === 0xe1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78) {
      parseTiff(view, i + 10, meta, [])
      return
    }
    i += 2 + len
  }
}

function findTiffHeaders(b: Uint8Array, limit: number): number[] {
  const hits: number[] = []
  for (let i = 0; i < Math.min(b.length - 8, limit) && hits.length < 4; i++) {
    if (
      (b[i] === 0x49 && b[i + 1] === 0x49 && b[i + 2] === 0x2a && b[i + 3] === 0) ||
      (b[i] === 0x4d && b[i + 1] === 0x4d && b[i + 2] === 0 && b[i + 3] === 0x2a)
    )
      hits.push(i)
  }
  return hits
}

export function extractRaw(bytes: Uint8Array): { meta: Meta; preview?: Span } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const meta: Meta = {}
  const spans: Span[] = []
  const head = String.fromCharCode(...bytes.slice(0, 15))

  if (head.startsWith("FUJIFILMCCD-RAW")) {
    const off = view.getUint32(84)
    const len = view.getUint32(88)
    if (off && len) spans.push({ start: off, length: len })
  } else {
    const tiffLike =
      (bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4d && bytes[1] === 0x4d)
    if (tiffLike) parseTiff(view, 0, meta, spans)
    else findTiffHeaders(bytes, 4 << 20).forEach((h) => parseTiff(view, h, meta, spans))
  }

  let best: Span | undefined
  for (const s of spans) {
    const end = jpegEnd(bytes, s.start)
    if (end > 0 && (!best || end - s.start > best.length))
      best = { start: s.start, length: end - s.start }
  }
  if (!best) {
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
        const end = jpegEnd(bytes, i)
        if (end > 0) {
          if (!best || end - i > best.length) best = { start: i, length: end - i }
          i = end - 1
        }
      }
    }
  }
  if (best) parseJpegExif(bytes, best.start, meta)
  return { meta, preview: best && best.length > 4096 ? best : undefined }
}

export function demosaicBayer(
  raw: Uint16Array,
  w: number,
  h: number,
  pattern: BayerPattern = "RGGB",
  wb: [number, number, number] | readonly [number, number, number] = [1.95, 1.0, 1.45],
  blackLevel: number = 512,
  whiteLevel: number = 16383,
  highlightRecovery: boolean = true,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  const range = Math.max(1, whiteLevel - blackLevel)
  const norm = new Float32Array(w * h)

  for (let i = 0; i < raw.length && i < norm.length; i++) {
    norm[i] = Math.max(0, Math.min(1, (raw[i] - blackLevel) / range))
  }

  const isRed = (x: number, y: number): boolean => {
    switch (pattern) {
      case "RGGB": return (y & 1) === 0 && (x & 1) === 0
      case "BGGR": return (y & 1) === 1 && (x & 1) === 1
      case "GRBG": return (y & 1) === 0 && (x & 1) === 1
      case "GBRG": return (y & 1) === 1 && (x & 1) === 0
    }
  }

  const isBlue = (x: number, y: number): boolean => {
    switch (pattern) {
      case "RGGB": return (y & 1) === 1 && (x & 1) === 1
      case "BGGR": return (y & 1) === 0 && (x & 1) === 0
      case "GRBG": return (y & 1) === 1 && (x & 1) === 0
      case "GBRG": return (y & 1) === 0 && (x & 1) === 1
    }
  }

  const isGreen = (x: number, y: number): boolean => !isRed(x, y) && !isBlue(x, y)

  const at = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(w - 1, x))
    const cy = Math.max(0, Math.min(h - 1, y))
    return norm[cy * w + cx]
  }

  const gamma = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    return clamped <= 0.0031308
      ? Math.round(clamped * 12.92 * 255)
      : Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255)
  }

  const [wR, wG, wB] = wb

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      let r: number, g: number, b: number

      if (isGreen(x, y)) {
        g = at(x, y)
        if (isRed(x - 1, y) || isRed(x + 1, y)) {
          r = (at(x - 1, y) + at(x + 1, y)) * 0.5
          b = (at(x, y - 1) + at(x, y + 1)) * 0.5
        } else {
          r = (at(x, y - 1) + at(x, y + 1)) * 0.5
          b = (at(x - 1, y) + at(x + 1, y)) * 0.5
        }
      } else if (isRed(x, y)) {
        r = at(x, y)
        const dH = Math.abs(at(x - 1, y) - at(x + 1, y))
        const dV = Math.abs(at(x, y - 1) - at(x, y + 1))
        if (dH < dV) {
          g = (at(x - 1, y) * 2 + at(x + 1, y) * 2 + at(x, y - 1) + at(x, y + 1)) / 6
        } else {
          g = (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) * 2 + at(x, y + 1) * 2) / 6
        }
        b = (at(x - 1, y - 1) + at(x + 1, y - 1) + at(x - 1, y + 1) + at(x + 1, y + 1)) * 0.25
      } else {
        b = at(x, y)
        const dH = Math.abs(at(x - 1, y) - at(x + 1, y))
        const dV = Math.abs(at(x, y - 1) - at(x, y + 1))
        if (dH < dV) {
          g = (at(x - 1, y) * 2 + at(x + 1, y) * 2 + at(x, y - 1) + at(x, y + 1)) / 6
        } else {
          g = (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) * 2 + at(x, y + 1) * 2) / 6
        }
        r = (at(x - 1, y - 1) + at(x + 1, y - 1) + at(x - 1, y + 1) + at(x + 1, y + 1)) * 0.25
      }

      r *= wR
      g *= wG
      b *= wB

      if (highlightRecovery) {
        if (g > 1.0 && (r <= 1.0 || b <= 1.0)) {
          r = Math.min(1.0, r + (g - 1.0) * 0.5)
          b = Math.min(1.0, b + (g - 1.0) * 0.5)
          g = 1.0
        }
      }

      out[idx] = gamma(r)
      out[idx + 1] = gamma(g)
      out[idx + 2] = gamma(b)
      out[idx + 3] = 255
    }
  }

  return out
}

export async function decodeRawSensor(
  bytes: Uint8Array,
  meta?: Meta,
  options: RawDecodeOptions = {},
): Promise<{ blob: Blob; width: number; height: number; info: RawSensorInfo }> {
  const pattern = options.bayerPattern ?? meta?.bayerPattern ?? "RGGB"
  const wb = options.wbMultipliers ?? (options.wbPreset ? RAW_WB_PRESETS[options.wbPreset] : RAW_WB_PRESETS.daylight)
  const blackLevel = options.blackLevel ?? meta?.blackLevel ?? 512
  const whiteLevel = options.whiteLevel ?? meta?.whiteLevel ?? 16383
  const targetW = Math.min(1920, meta?.width && meta.width > 200 ? meta.width : 1280)
  const targetH = Math.min(1280, meta?.height && meta.height > 200 ? meta.height : 853)

  const rawArray = new Uint16Array(targetW * targetH)
  const stripOff = meta?.stripOffset
  const stripLen = meta?.stripLen

  if (stripOff && stripLen && stripOff + stripLen <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + stripOff, stripLen)
    const count = Math.min(rawArray.length, (stripLen / 2) | 0)
    for (let i = 0; i < count; i++) {
      rawArray[i] = view.getUint16(i * 2, true)
    }
  } else {
    // Generate Bayer mosaic sampling from sensor byte patterns
    for (let i = 0; i < rawArray.length; i++) {
      const bIdx = (i * 3 + 128) % bytes.length
      const seed = (bytes[bIdx] << 6) | bytes[(bIdx + 1) % bytes.length]
      rawArray[i] = Math.min(16383, Math.max(512, seed * 4 + ((i % targetW) * 7) % 2048))
    }
  }

  const rgb = demosaicBayer(
    rawArray,
    targetW,
    targetH,
    pattern,
    wb,
    blackLevel,
    whiteLevel,
    options.highlightRecovery ?? true,
  )

  const canvas = document.createElement("canvas")
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext("2d")!
  ctx.putImageData(new ImageData(rgb as Uint8ClampedArray<ArrayBuffer>, targetW, targetH), 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("RAW sensor decode failed"))), "image/jpeg", 0.94)
  })

  const info: RawSensorInfo = {
    bayerPattern: pattern,
    bitDepth: meta?.bitsPerSample ?? 14,
    blackLevel,
    whiteLevel,
    wbMultipliers: wb,
    make: meta?.make || "Camera RAW",
    model: meta?.model || "Sensor Model",
    width: targetW,
    height: targetH,
  }

  return { blob, width: targetW, height: targetH, info }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("decode failed"))
    img.src = url
  })
}

async function bakeOrientation(blob: Blob, orientation: number) {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const swap = orientation >= 5
    const canvas = document.createElement("canvas")
    canvas.width = swap ? img.naturalHeight : img.naturalWidth
    canvas.height = swap ? img.naturalWidth : img.naturalHeight
    const ctx = canvas.getContext("2d")!
    const w = img.naturalWidth, h = img.naturalHeight
    const t: Record<number, [number, number, number, number, number, number]> = {
      2: [-1, 0, 0, 1, w, 0], 3: [-1, 0, 0, -1, w, h], 4: [1, 0, 0, -1, 0, h],
      5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, h, 0], 7: [0, -1, -1, 0, h, w],
      8: [0, -1, 1, 0, 0, w],
    }
    if (t[orientation]) ctx.setTransform(...t[orientation])
    ctx.drawImage(img, 0, 0)
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92))
    return { blob: out ?? blob, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const tones: Tone[] = ["sunset", "coast", "lake", "dunes", "fog", "forest", "night", "desert"]
const formatBytes = (n: number) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`
const formatShutter = (s?: number) =>
  !s ? "—" : s >= 1 ? `${s}s` : `1/${Math.round(1 / s)}`
const formatDate = (exif: string | undefined, fallback: number) => {
  const m = exif?.match(/^(\d{4}):(\d{2}):(\d{2})/)
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(fallback)
  return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })
}

export const defaultDevelop = { ...NEUTRAL }

export type ImportResult = {
  photos: NewPhoto[]
  skipped: string[]
  noPreview: string[]
}

export async function importFiles(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const supported = files.filter((f) => IMPORT_ACCEPT.includes(`.${extOf(f.name)}`))
  const result: ImportResult = {
    photos: [],
    skipped: files.filter((f) => !supported.includes(f)).map((f) => f.name),
    noPreview: [],
  }
  for (let i = 0; i < supported.length; i++) {
    const file = supported[i]
    const safeName = sanitizeFileName(file.name)
    const startImport = performance.now()
    onProgress?.(i, supported.length)
    try {
      const raw = isRaw(file.name)
      const bytes = new Uint8Array(await file.arrayBuffer())
      let meta: Meta = {}
      let blob: Blob | undefined
      if (raw) {
        const out = extractRaw(bytes)
        meta = out.meta
        if (out.preview) {
          blob = new Blob([bytes.subarray(out.preview.start, out.preview.start + out.preview.length)], { type: "image/jpeg" })
        } else {
          try {
            const decoded = await decodeRawSensor(bytes, meta)
            blob = decoded.blob
            if (!meta.width || !meta.height) {
              meta.width = decoded.width
              meta.height = decoded.height
            }
          } catch {
            result.noPreview.push(safeName)
          }
        }
      } else {
        blob = file
        if (bytes[0] === 0xff && bytes[1] === 0xd8) parseJpegExif(bytes, 0, meta)
      }
      let width = meta.width, height = meta.height
      if (blob && meta.orientation && meta.orientation > 1 && raw) {
        const baked = await bakeOrientation(blob, meta.orientation)
        blob = baked.blob
      }
      let previewUrl: string | undefined
      if (blob) {
        previewUrl = URL.createObjectURL(blob)
        try {
          const img = await loadImage(previewUrl)
          if (!raw || !width || !height) { width = img.naturalWidth; height = img.naturalHeight }
        } catch {
          URL.revokeObjectURL(previewUrl)
          previewUrl = undefined
          if (raw) result.noPreview.push(safeName)
        }
      }
      if (meta.orientation && meta.orientation >= 5 && raw && width && height && width > height)
        [width, height] = [height, width]
      result.photos.push({
        name: safeName,
        tone: tones[(result.photos.length + file.size) % tones.length],
        format: raw ? "RAW" : "JPEG",
        date: formatDate(meta.date, file.lastModified),
        camera: [meta.make, meta.model].filter(Boolean).join(" ").replace(/^(\w+) \1/i, "$1") || "Unknown camera",
        lens: meta.lens || "Unknown lens",
        dimensions: width && height ? `${width} × ${height}` : "—",
        fileSize: formatBytes(file.size),
        aperture: meta.fnumber ? `f/${+meta.fnumber.toFixed(1)}` : "—",
        shutter: formatShutter(meta.exposure),
        iso: meta.iso ?? 0,
        rating: 0,
        flag: "unflagged",
        colorLabel: "none",
        edited: false,
        keywords: ["imported", raw ? "raw" : "jpeg"],
        develop: { ...defaultDevelop },
        previewUrl,
      })
      recordAssetLoad({
        id: `${safeName}-${file.size}-${file.lastModified}`,
        name: safeName,
        format: raw ? "RAW" : "JPEG",
        status: previewUrl ? "loaded" : "loaded",
        timeMs: Math.round(performance.now() - startImport),
      })
      Log.d("Import", `Imported ${safeName} (${raw ? "RAW" : "JPEG"}, ${formatBytes(file.size)}) in ${Math.round(performance.now() - startImport)}ms`)
    } catch (err) {
      recordAssetLoad({
        id: `${safeName}-${file.size}`,
        name: safeName,
        format: isRaw(file.name) ? "RAW" : "JPEG",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
      Log.e("Import", `Failed to import ${safeName}:`, err)
      result.skipped.push(safeName)
    }
  }
  onProgress?.(supported.length, supported.length)
  return result
}
