import { describe, expect, it } from "vitest"
import { extOf, baseOf, isRaw } from "../src/app/raw"

describe("extOf", () => {
  it("extracts the extension and lowercases it", () => {
    expect(extOf("photo.JPG")).toBe("jpg")
  })
  it("handles strings with no dots", () => {
    // Current behavior returns the whole string if there is no dot
    expect(extOf("photo")).toBe("photo")
  })
  it("handles empty strings", () => {
    expect(extOf("")).toBe("")
  })
  it("handles hidden files", () => {
    expect(extOf(".hidden")).toBe("hidden")
  })
  it("handles multiple dots", () => {
    expect(extOf("photo.copy.JPG")).toBe("jpg")
  })
})

describe("baseOf", () => {
  it("extracts the base name and lowercases it", () => {
    expect(baseOf("Photo.JPG")).toBe("photo")
  })
  it("handles strings with no dots", () => {
    expect(baseOf("Photo")).toBe("photo")
  })
  it("handles empty strings", () => {
    expect(baseOf("")).toBe("")
  })
  it("handles hidden files", () => {
    expect(baseOf(".hidden")).toBe("")
  })
  it("handles multiple dots", () => {
    expect(baseOf("Photo.Copy.JPG")).toBe("photo.copy")
  })
})

describe("isRaw", () => {
  it("returns true for raw extensions regardless of case", () => {
    expect(isRaw("photo.CR2")).toBe(true)
    expect(isRaw("photo.dng")).toBe(true)
  })
  it("returns false for non-raw extensions", () => {
    expect(isRaw("photo.jpg")).toBe(false)
    expect(isRaw("photo.png")).toBe(false)
    expect(isRaw("")).toBe(false)
  })
})

describe("Camera RAW demosaicing engine", () => {
  it("demosaics 4x4 RGGB Bayer pattern into RGB values", async () => {
    const { demosaicBayer } = await import("../src/app/raw")
    const w = 4, h = 4
    const raw = new Uint16Array(w * h).fill(2048)
    const rgb = demosaicBayer(raw, w, h, "RGGB", [1, 1, 1], 512, 16383)
    expect(rgb.length).toBe(w * h * 4)
    expect(rgb[3]).toBe(255)
    expect(rgb[0]).toBeGreaterThan(0)
    expect(rgb[1]).toBeGreaterThan(0)
    expect(rgb[2]).toBeGreaterThan(0)
  })

  it("supports all Bayer pattern variations (BGGR, GRBG, GBRG)", async () => {
    const { demosaicBayer } = await import("../src/app/raw")
    const w = 4, h = 4
    const raw = new Uint16Array(w * h).fill(4096)
    for (const pattern of ["BGGR", "GRBG", "GBRG"] as const) {
      const rgb = demosaicBayer(raw, w, h, pattern, [1, 1, 1], 512, 16383)
      expect(rgb.length).toBe(w * h * 4)
      expect(rgb[3]).toBe(255)
    }
  })

  it("provides comprehensive white balance presets", async () => {
    const { RAW_WB_PRESETS } = await import("../src/app/raw")
    expect(RAW_WB_PRESETS.daylight).toBeDefined()
    expect(RAW_WB_PRESETS.tungsten).toBeDefined()
    expect(RAW_WB_PRESETS.shade).toBeDefined()
  })
})
