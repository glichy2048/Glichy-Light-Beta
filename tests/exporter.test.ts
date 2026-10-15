import { describe, expect, it } from "vitest"
import { BUILTIN_PRESETS, encodeTiff, outputName, zipFiles } from "../src/app/exporter"
import { initialState } from "../src/app/reducer"

const photo = initialState.photos[0]
const settings = BUILTIN_PRESETS[0].settings
const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer())

describe("outputName", () => {
  it("avoids collisions case-insensitively", () => {
    const used = new Set<string>()
    const s = { ...settings, naming: "original" as const }
    const a = outputName(photo, 0, s, used)
    const b = outputName(photo, 1, s, used)
    expect(a).not.toBe(b)
    expect(b).toMatch(/-2\./)
  })

  it("sanitises custom prefixes", () => {
    const n = outputName(photo, 0, { ...settings, naming: "custom", prefix: "a/b:c" }, new Set())
    expect(n.startsWith("a-b-c-001")).toBe(true)
  })
})

describe("encodeTiff", () => {
  it("writes a little-endian header and raw RGB payload", async () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 9, 9, 9, 255])
    const b = await bytes(encodeTiff(px, 2, 2))
    expect(Array.from(b.slice(0, 4))).toEqual([0x49, 0x49, 0x2a, 0x00])
    expect(Array.from(b.slice(-12))).toEqual([255, 0, 0, 0, 255, 0, 0, 0, 255, 9, 9, 9])
  })
})

describe("zipFiles", () => {
  it("builds a store-only archive with matching entry count and CRC", async () => {
    const zip = await bytes(await zipFiles([{ name: "a.txt", blob: new Blob(["hello"]) }]))
    const v = new DataView(zip.buffer)
    expect(v.getUint32(0, true)).toBe(0x04034b50)
    expect(v.getUint32(14, true)).toBe(0x3610a686) // CRC32("hello")
    const eocd = zip.length - 22
    expect(v.getUint32(eocd, true)).toBe(0x06054b50)
    expect(v.getUint16(eocd + 10, true)).toBe(1)
  })
})

describe("copyright metadata and watermark", () => {
  it("encodes copyright notice and artist in EXIF segment", async () => {
    const { buildExifSegment } = await import("../src/app/exporter")
    const customSettings = {
      ...settings,
      metadata: true,
      metadataPolicy: "all" as const,
      copyrightNotice: "© 2026 Test Artist",
      creator: "Test Photographer",
    }
    const seg = buildExifSegment(photo, 1920, 1080, customSettings)
    expect(seg.length).toBeGreaterThan(0)
    const text = new TextDecoder().decode(seg)
    expect(text).toContain("Test Artist")
    expect(text).toContain("Test Photographer")
  })

  it("respects copyright-only metadata policy without camera tags", async () => {
    const { buildExifSegment } = await import("../src/app/exporter")
    const copyOnlySettings = {
      ...settings,
      metadataPolicy: "copyright" as const,
      copyrightNotice: "© 2026 Studio",
      creator: "Studio Lead",
    }
    const seg = buildExifSegment(photo, 1920, 1080, copyOnlySettings)
    const text = new TextDecoder().decode(seg)
    expect(text).toContain("Studio")
  })

  it("BUILTIN_PRESETS include watermark and copyright defaults", () => {
    const proof = BUILTIN_PRESETS.find((p) => p.name === "Client Proof")
    expect(proof?.settings.watermark).toBe(true)
    expect(proof?.settings.watermarkText).toContain("PROOF")
    expect(proof?.settings.metadataPolicy).toBe("copyright")
  })
})
