import { log } from "./diagnostics"
import { applyTone, drawGeometry, sharpen } from "./develop"
import type { Photo, Tone } from "./types"

import { getProfileDistortion } from "./develop"

export type ExportFormat = "jpeg" | "png" | "tiff"
export type WatermarkPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center"
export type WatermarkSize = "small" | "medium" | "large"
export type WatermarkStyle = "clean" | "pill" | "shadow"
export type MetadataPolicy = "all" | "copyright" | "none"

export type ExportSettings = {
  format: ExportFormat
  quality: number
  resize: "original" | "long-edge"
  longEdge: number
  naming: "original" | "sequence" | "custom"
  prefix: string
  sharpen: "none" | "standard" | "high"
  metadata: boolean
  metadataPolicy?: MetadataPolicy
  copyrightNotice?: string
  creator?: string
  watermark?: boolean
  watermarkText?: string
  watermarkPosition?: WatermarkPosition
  watermarkOpacity?: number
  watermarkSize?: WatermarkSize
  watermarkStyle?: WatermarkStyle
}

export const BUILTIN_PRESETS: { name: string; settings: ExportSettings }[] = [
  {
    name: "Full-size JPEG",
    settings: {
      format: "jpeg",
      quality: 95,
      resize: "original",
      longEdge: 2048,
      naming: "original",
      prefix: "",
      sharpen: "none",
      metadata: true,
      metadataPolicy: "all",
      copyrightNotice: "© 2026 Glichylight. All rights reserved.",
      creator: "",
      watermark: false,
      watermarkText: "© Glichylight",
      watermarkPosition: "bottom-right",
      watermarkOpacity: 80,
      watermarkSize: "medium",
      watermarkStyle: "shadow",
    },
  },
  {
    name: "Web 2048px",
    settings: {
      format: "jpeg",
      quality: 90,
      resize: "long-edge",
      longEdge: 2048,
      naming: "sequence",
      prefix: "",
      sharpen: "standard",
      metadata: true,
      metadataPolicy: "all",
      copyrightNotice: "© 2026 Glichylight. All rights reserved.",
      creator: "",
      watermark: false,
      watermarkText: "© Glichylight",
      watermarkPosition: "bottom-right",
      watermarkOpacity: 80,
      watermarkSize: "medium",
      watermarkStyle: "shadow",
    },
  },
  {
    name: "Client Proof",
    settings: {
      format: "jpeg",
      quality: 75,
      resize: "long-edge",
      longEdge: 1600,
      naming: "custom",
      prefix: "proof",
      sharpen: "standard",
      metadata: false,
      metadataPolicy: "copyright",
      copyrightNotice: "© 2026 Client Proof. Do not reproduce.",
      creator: "",
      watermark: true,
      watermarkText: "PROOF · © GLICHYLIGHT",
      watermarkPosition: "center",
      watermarkOpacity: 65,
      watermarkSize: "large",
      watermarkStyle: "pill",
    },
  },
  {
    name: "Archive TIFF",
    settings: {
      format: "tiff",
      quality: 100,
      resize: "original",
      longEdge: 2048,
      naming: "original",
      prefix: "",
      sharpen: "none",
      metadata: false,
      metadataPolicy: "all",
      copyrightNotice: "© 2026 Glichylight. All rights reserved.",
      creator: "",
      watermark: false,
      watermarkText: "© Glichylight",
      watermarkPosition: "bottom-right",
      watermarkOpacity: 80,
      watermarkSize: "medium",
      watermarkStyle: "shadow",
    },
  },
]

export type ItemStatus = {
  state: "waiting" | "rendering" | "done" | "error"
  name?: string
  bytes?: number
  width?: number
  height?: number
  error?: string
}

export type DirHandle = {
  name: string
  getFileHandle(
    name: string,
    options: { create: boolean },
  ): Promise<{
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
  }>
}
export type Destination = { kind: "directory"; handle: DirHandle } | { kind: "download" }

export const canPickDirectory = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window

export async function pickDirectory(): Promise<DirHandle | null> {
  try {
    const pick = (window as unknown as {
      showDirectoryPicker(o: { mode: "readwrite" }): Promise<DirHandle>
    }).showDirectoryPicker
    return await pick.call(window, { mode: "readwrite" })
  } catch {
    return null
  }
}

const EXT: Record<ExportFormat, string> = { jpeg: "jpg", png: "png", tiff: "tif" }
const MIME: Record<ExportFormat, string> = { jpeg: "image/jpeg", png: "image/png", tiff: "image/tiff" }

export function outputName(
  photo: Photo,
  index: number,
  s: ExportSettings,
  used: Set<string>,
): string {
  const base = photo.name.replace(/\.[^.]+$/, "")
  const seq = String(index + 1).padStart(3, "0")
  const stem =
    s.naming === "original"
      ? base
      : s.naming === "sequence"
        ? `${base}-${seq}`
        : `${(s.prefix.trim() || "export").replace(/[\\/:*?"<>|]/g, "-")}-${seq}`
  let name = `${stem}.${EXT[s.format]}`
  for (let n = 2; used.has(name.toLowerCase()); n++) name = `${stem}-${n}.${EXT[s.format]}`
  used.add(name.toLowerCase())
  return name
}

// ---- source ---------------------------------------------------------------

const PLACEHOLDER_SKY: Record<Tone, [number, string][]> = {
  sunset: [[0, "#242b5c"], [0.43, "#7a4a73"], [0.71, "#e58a5b"], [1, "#f6c98a"]],
  coast: [[0, "#7e9ba5"], [0.47, "#b7c4bd"], [0.48, "#d5b898"], [1, "#667866"]],
  lake: [[0, "#6b899d"], [0.47, "#a9c0c7"], [0.48, "#7793a0"], [1, "#243e49"]],
  dunes: [[0, "#9a8274"], [0.52, "#c6a47a"], [1, "#ae704a"]],
  fog: [[0, "#889896"], [0.54, "#bcc2b9"], [1, "#5a6862"]],
  forest: [[0, "#627772"], [0.47, "#929c83"], [1, "#243d35"]],
  night: [[0, "#151936"], [0.56, "#344266"], [1, "#202738"]],
  desert: [[0, "#8197a6"], [0.55, "#d5aa76"], [1, "#8e5133"]],
}

function placeholderCanvas(tone: Tone): HTMLCanvasElement {
  const w = 3000, h = 2000
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")!
  const g = ctx.createLinearGradient(0, 0, 0, h)
  PLACEHOLDER_SKY[tone].forEach(([at, color]) => g.addColorStop(at, color))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const ridge = (base: number, amp: number, color: string, seed: number) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 60)
      ctx.lineTo(x, h * base - Math.sin(x / 340 + seed) * amp - Math.sin(x / 130 + seed * 2) * amp * 0.35)
    ctx.lineTo(w, h)
    ctx.fill()
  }
  ridge(0.62, 120, "rgba(20,24,30,.28)", 1)
  ridge(0.74, 150, "rgba(14,16,20,.5)", 2.4)
  ridge(0.88, 90, "rgba(8,9,12,.72)", 4.1)
  return c
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not decode preview image"))
    img.src = url
  })
}

type Source = HTMLImageElement | HTMLCanvasElement
const dims = (s: Source): [number, number] =>
  s instanceof HTMLImageElement ? [s.naturalWidth, s.naturalHeight] : [s.width, s.height]

function drawScaled(src: Source, w: number, h: number): HTMLCanvasElement {
  let cur: Source = src
  let [cw, ch] = dims(src)
  while (cw / 2 >= w && ch / 2 >= h) {
    cw = Math.floor(cw / 2)
    ch = Math.floor(ch / 2)
    const step = document.createElement("canvas")
    step.width = cw
    step.height = ch
    const sctx = step.getContext("2d")!
    sctx.imageSmoothingQuality = "high"
    sctx.drawImage(cur, 0, 0, cw, ch)
    cur = step
  }
  const out = document.createElement("canvas")
  out.width = w
  out.height = h
  const ctx = out.getContext("2d", { willReadFrequently: true })!
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(cur, 0, 0, w, h)
  return out
}

// ---- encoders -------------------------------------------------------------

type Ent = { tag: number; type: 2 | 3 | 4 | 5; vals: string | number[] }
const TYPE_BYTES = { 2: 1, 3: 2, 4: 4, 5: 8 } as const

function entryBytes(e: Ent) {
  const count = typeof e.vals === "string" ? e.vals.length + 1 : e.type === 5 ? e.vals.length / 2 : e.vals.length
  return { count, size: count * TYPE_BYTES[e.type] }
}
const ifdSize = (n: number) => 2 + 12 * n + 4
const dataSize = (es: Ent[]) =>
  es.reduce((a, e) => {
    const { size } = entryBytes(e)
    return a + (size > 4 ? size + (size % 2) : 0)
  }, 0)

function writeIfd(v: DataView, b: Uint8Array, start: number, dataStart: number, es: Ent[]) {
  const sorted = [...es].sort((a, c) => a.tag - c.tag)
  v.setUint16(start, sorted.length, true)
  let data = dataStart
  sorted.forEach((e, i) => {
    const o = start + 2 + i * 12
    const { count, size } = entryBytes(e)
    v.setUint16(o, e.tag, true)
    v.setUint16(o + 2, e.type, true)
    v.setUint32(o + 4, count, true)
    let at = o + 8
    if (size > 4) {
      v.setUint32(o + 8, data, true)
      at = data
      data += size + (size % 2)
    }
    if (typeof e.vals === "string")
      for (let k = 0; k < e.vals.length; k++) b[at + k] = e.vals.charCodeAt(k) & 0x7f
    else
      e.vals.forEach((val, k) => {
        if (e.type === 3) v.setUint16(at + k * 2, val, true)
        else v.setUint32(at + k * 4, val, true)
      })
  })
}

function parseFraction(text: string): [number, number] | null {
  const m = text.match(/^(\d+)\/(\d+)/)
  if (m) return [Number(m[1]), Number(m[2])]
  const n = parseFloat(text.replace(/[^\d.]/g, ""))
  return n ? [Math.round(n * 10), 10] : null
}

export function buildExifSegment(photo: Photo, width: number, height: number, s?: ExportSettings): Uint8Array {
  const [make, ...rest] = photo.camera.split(" ")
  const policy = s?.metadataPolicy ?? (s?.metadata ? "all" : "none")
  if (policy === "none") return new Uint8Array(0)

  const ifd0: Ent[] = [
    { tag: 0x131, type: 2, vals: "Glichylight" },
  ]

  if (policy === "all") {
    if (rest.length) ifd0.push({ tag: 0x10f, type: 2, vals: make })
    ifd0.push({ tag: 0x110, type: 2, vals: rest.length ? rest.join(" ") : photo.camera })
    if (photo.name) ifd0.push({ tag: 0x010e, type: 2, vals: photo.name })
  }

  // Copyright metadata encoding (EXIF 0x8298 & 0x013b)
  const copyright = (s?.copyrightNotice || "© 2026 Glichylight").trim()
  if (copyright) {
    ifd0.push({ tag: 0x8298, type: 2, vals: copyright })
  }
  const creator = (s?.creator || "").trim()
  if (creator) {
    ifd0.push({ tag: 0x013b, type: 2, vals: creator })
  }

  const exif: Ent[] = [
    { tag: 0xa002, type: 4, vals: [width] },
    { tag: 0xa003, type: 4, vals: [height] },
  ]

  if (policy === "all") {
    const exposure = parseFraction(photo.shutter)
    if (exposure) exif.push({ tag: 0x829a, type: 5, vals: exposure })
    const f = photo.aperture.match(/[\d.]+/)
    if (f) exif.push({ tag: 0x829d, type: 5, vals: [Math.round(parseFloat(f[0]) * 10), 10] })
    if (photo.iso) exif.push({ tag: 0x8827, type: 3, vals: [photo.iso] })
    const date = new Date(photo.date)
    if (!isNaN(date.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0")
      exif.push({
        tag: 0x9003,
        type: 2,
        vals: `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} 00:00:00`,
      })
    }
    if (photo.lens && !photo.lens.startsWith("Unknown")) exif.push({ tag: 0xa434, type: 2, vals: photo.lens })
  }

  const ptr: Ent = { tag: 0x8769, type: 4, vals: [0] }
  const all0 = [...ifd0, ptr]
  const ifd0Start = 8
  const ifd0Data = ifd0Start + ifdSize(all0.length)
  const exifStart = ifd0Data + dataSize(all0)
  const exifData = exifStart + ifdSize(exif.length)
  const total = exifData + dataSize(exif)
  const tiff = new Uint8Array(total)
  const v = new DataView(tiff.buffer)
  tiff.set([0x49, 0x49, 0x2a, 0])
  v.setUint32(4, ifd0Start, true)
  ptr.vals = [exifStart]
  writeIfd(v, tiff, ifd0Start, ifd0Data, all0)
  writeIfd(v, tiff, exifStart, exifData, exif)
  const seg = new Uint8Array(4 + 6 + total)
  seg.set([0xff, 0xe1, ((total + 8) >> 8) & 0xff, (total + 8) & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0])
  seg.set(tiff, 10)
  return seg
}

export async function withExif(blob: Blob, photo: Photo, w: number, h: number, s?: ExportSettings): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return blob
  const seg = buildExifSegment(photo, w, h, s)
  if (seg.length === 0) return blob
  return new Blob([bytes.subarray(0, 2), seg, bytes.subarray(2)] as BlobPart[], {
    type: "image/jpeg",
  })
}

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: ExportSettings,
) {
  if (!s.watermark) return
  const text = (s.watermarkText || "© Glichylight").trim()
  if (!text) return

  const pos = s.watermarkPosition || "bottom-right"
  const sizeKind = s.watermarkSize || "medium"
  const style = s.watermarkStyle || "shadow"
  const opacity = Math.max(0.1, Math.min(1, (s.watermarkOpacity ?? 80) / 100))

  const minDim = Math.min(w, h)
  const fontSize = Math.max(
    14,
    Math.round(minDim * (sizeKind === "small" ? 0.022 : sizeKind === "large" ? 0.045 : 0.032)),
  )
  const padding = Math.max(16, Math.round(minDim * 0.035))

  ctx.save()
  ctx.font = `600 ${fontSize}px "Instrument Sans", sans-serif`
  ctx.textBaseline = "middle"

  const metrics = ctx.measureText(text)
  const textW = metrics.width
  const textH = fontSize * 1.3

  let x = w - padding - textW / 2
  let y = h - padding - textH / 2

  if (pos === "bottom-left") {
    x = padding + textW / 2
    y = h - padding - textH / 2
  } else if (pos === "top-right") {
    x = w - padding - textW / 2
    y = padding + textH / 2
  } else if (pos === "top-left") {
    x = padding + textW / 2
    y = padding + textH / 2
  } else if (pos === "center") {
    x = w / 2
    y = h / 2
  }

  ctx.textAlign = "center"
  ctx.globalAlpha = opacity

  if (style === "pill") {
    const boxPadX = fontSize * 0.7
    const boxPadY = fontSize * 0.4
    const boxW = textW + boxPadX * 2
    const boxH = textH + boxPadY * 2
    const radius = Math.min(boxH / 2, 8)

    ctx.fillStyle = "rgba(15, 14, 12, 0.65)"
    ctx.beginPath()
    ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, radius)
    ctx.fill()

    ctx.strokeStyle = "rgba(232, 163, 61, 0.4)"
    ctx.lineWidth = 1
    ctx.stroke()
  } else if (style === "shadow") {
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)"
    ctx.shadowBlur = Math.max(4, Math.round(fontSize * 0.25))
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 2
  }

  ctx.fillStyle = "#ffffff"
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function encodeTiff(data: Uint8ClampedArray, w: number, h: number): Blob {
  const header = 168
  const buf = new ArrayBuffer(header + w * h * 3)
  const v = new DataView(buf)
  const b = new Uint8Array(buf)
  b.set([0x49, 0x49, 0x2a, 0])
  v.setUint32(4, 8, true)
  const entries: [number, number, number, number][] = [
    [256, 4, 1, w], [257, 4, 1, h], [258, 3, 3, 146], [259, 3, 1, 1], [262, 3, 1, 2],
    [273, 4, 1, header], [277, 3, 1, 3], [278, 4, 1, h], [279, 4, 1, w * h * 3],
    [282, 5, 1, 152], [283, 5, 1, 160], [296, 3, 1, 2],
  ]
  v.setUint16(8, entries.length, true)
  entries.forEach(([tag, type, count, value], i) => {
    const o = 10 + i * 12
    v.setUint16(o, tag, true)
    v.setUint16(o + 2, type, true)
    v.setUint32(o + 4, count, true)
    if (type === 3 && count === 1) v.setUint16(o + 8, value, true)
    else v.setUint32(o + 8, value, true)
  })
  v.setUint32(10 + entries.length * 12, 0, true)
  ;[8, 8, 8].forEach((bits, i) => v.setUint16(146 + i * 2, bits, true))
  v.setUint32(152, 300, true); v.setUint32(156, 1, true)
  v.setUint32(160, 300, true); v.setUint32(164, 1, true)
  for (let p = 0, o = header; p < w * h; p++, o += 3) {
    b[o] = data[p * 4]
    b[o + 1] = data[p * 4 + 1]
    b[o + 2] = data[p * 4 + 2]
  }
  return new Blob([buf], { type: "image/tiff" })
}

// ---- render ---------------------------------------------------------------

export type Rendered = { name: string; blob: Blob; width: number; height: number }

export async function renderPhoto(
  photo: Photo,
  s: ExportSettings,
  name: string,
): Promise<Rendered> {
  const source: Source = photo.previewUrl
    ? await loadImage(photo.previewUrl)
    : placeholderCanvas(photo.tone)
  const [sw, sh] = dims(source)
  let tw = sw, th = sh
  if (s.resize === "long-edge") {
    const scale = Math.min(1, s.longEdge / Math.max(sw, sh))
    tw = Math.max(1, Math.round(sw * scale))
    th = Math.max(1, Math.round(sh * scale))
  }
  const base = drawScaled(source, tw, th)
  const img = base.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, tw, th)
  const toned = applyTone(img.data, tw, th, photo.develop).data
  const tonedCanvas = document.createElement("canvas")
  tonedCanvas.width = tw
  tonedCanvas.height = th
  tonedCanvas.getContext("2d")!.putImageData(new ImageData(toned as Uint8ClampedArray<ArrayBuffer>, tw, th), 0, 0)

  let final = tonedCanvas
  const netDistortion =
    (photo.develop.lensProfile
      ? getProfileDistortion(photo.develop.lensModel, photo.lens, photo.camera)
      : 0) + (photo.develop.distortion ?? 0)

  if (photo.develop.rotation !== 0 || photo.develop.vertical !== 0 || netDistortion !== 0) {
    final = document.createElement("canvas")
    drawGeometry(final, tonedCanvas, photo.develop.rotation, photo.develop.vertical, netDistortion)
  }
  const fctx = final.getContext("2d", { willReadFrequently: true })!
  const pixels = fctx.getImageData(0, 0, tw, th)
  if (s.sharpen !== "none") {
    sharpen(pixels.data, tw, th, s.sharpen === "high" ? 0.7 : 0.35)
    fctx.putImageData(pixels, 0, 0)
  }

  // Draw watermark if enabled
  if (s.watermark) {
    drawWatermark(fctx, tw, th, s)
    const updated = fctx.getImageData(0, 0, tw, th)
    pixels.data.set(updated.data)
  }

  let blob: Blob
  if (s.format === "tiff") blob = encodeTiff(pixels.data, tw, th)
  else {
    const out = await new Promise<Blob | null>((r) =>
      final.toBlob(r, MIME[s.format], s.quality / 100),
    )
    if (!out) throw new Error("Encoding failed (image too large for this browser?)")
    const shouldExif =
      s.format === "jpeg" &&
      (s.metadata || s.metadataPolicy === "all" || s.metadataPolicy === "copyright" || !!s.copyrightNotice || !!s.creator)
    blob = shouldExif ? await withExif(out, photo, tw, th, s) : out
  }
  return { name, blob, width: tw, height: th }
}

// ---- delivery -------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export async function zipFiles(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const parts: BlobPart[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer())
    const name = new TextEncoder().encode(f.name)
    const crc = crc32(data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true)
    lv.setUint16(10, time, true); lv.setUint16(12, date, true)
    lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)
    const cd = new Uint8Array(46 + name.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true)
    cv.setUint16(12, time, true); cv.setUint16(14, date, true)
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true)
    cd.set(name, 46)
    central.push(cd)
    parts.push(local, data)
    offset += local.length + data.length
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end] as BlobPart[], { type: "application/zip" })
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export type ExportSummary = {
  exported: number
  failed: number
  bytes: number
  cancelled: boolean
  delivery: "directory" | "download" | "zip" | "none"
}

const tick = () => new Promise<void>((r) => window.setTimeout(r))

export async function runExport(
  photos: Photo[],
  s: ExportSettings,
  dest: Destination,
  o: { signal: AbortSignal; onItem: (index: number, status: ItemStatus) => void },
): Promise<ExportSummary> {
  const used = new Set<string>()
  const collected: Rendered[] = []
  const summary: ExportSummary = { exported: 0, failed: 0, bytes: 0, cancelled: false, delivery: "none" }
  for (let i = 0; i < photos.length; i++) {
    if (o.signal.aborted) break
    const name = outputName(photos[i], i, s, used)
    o.onItem(i, { state: "rendering", name })
    await tick()
    try {
      const out = await renderPhoto(photos[i], s, name)
      if (dest.kind === "directory") {
        const file = await dest.handle.getFileHandle(out.name, { create: true })
        const w = await file.createWritable()
        await w.write(out.blob)
        await w.close()
      } else collected.push(out)
      summary.exported++
      summary.bytes += out.blob.size
      o.onItem(i, { state: "done", name, bytes: out.blob.size, width: out.width, height: out.height })
    } catch (e) {
      summary.failed++
      log("error", "export", "Render failed", e)
      o.onItem(i, { state: "error", name, error: e instanceof Error ? e.message : "Export failed" })
    }
  }
  summary.cancelled = o.signal.aborted
  if (dest.kind === "directory") summary.delivery = "directory"
  else if (collected.length && !summary.cancelled) {
    if (collected.length === 1) {
      downloadBlob(collected[0].name, collected[0].blob)
      summary.delivery = "download"
    } else {
      const stamp = new Date().toISOString().slice(0, 10)
      downloadBlob(`glichylight-export-${stamp}.zip`, await zipFiles(collected))
      summary.delivery = "zip"
    }
  }
  return summary
}
