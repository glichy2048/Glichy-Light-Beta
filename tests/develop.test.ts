import { describe, expect, it } from "vitest"
import {
  applyTone,
  boxBlur,
  curveLut,
  matchesPreset,
  migrateDevelop,
  NEUTRAL,
  PRESETS,
  presetDevelop,
  detectLensFromExif,
  preselectLensFromExif,
} from "../src/app/develop"

const w = 32
const h = 32
const src = new Uint8ClampedArray(w * h * 4)
for (let i = 0; i < w * h; i++) {
  src[i * 4] = (i * 7) % 256
  src[i * 4 + 1] = (i * 13) % 256
  src[i * 4 + 2] = (i * 29) % 256
  src[i * 4 + 3] = 255
}
const mean = (a: Uint8ClampedArray, c: number) => {
  let s = 0
  for (let i = c; i < a.length; i += 4) s += a[i]
  return s / (a.length / 4)
}

describe("applyTone", () => {
  it("leaves pixels untouched for a neutral recipe", () => {
    expect(Array.from(applyTone(src, w, h, NEUTRAL).data)).toEqual(Array.from(src))
  })

  it("brightens with positive exposure and darkens with negative", () => {
    const up = applyTone(src, w, h, { ...NEUTRAL, exposure: 40 }).data
    const down = applyTone(src, w, h, { ...NEUTRAL, exposure: -40 }).data
    expect(mean(up, 1)).toBeGreaterThan(mean(src, 1))
    expect(mean(down, 1)).toBeLessThan(mean(src, 1))
  })

  it("warms red/blue balance with temperature", () => {
    const o = applyTone(src, w, h, { ...NEUTRAL, temperature: 60 }).data
    expect(mean(o, 0)).toBeGreaterThan(mean(src, 0))
    expect(mean(o, 2)).toBeLessThan(mean(src, 2))
  })

  it("tint moves green opposite to red/blue", () => {
    const o = applyTone(src, w, h, { ...NEUTRAL, tint: 60 }).data
    expect(mean(o, 1)).toBeLessThan(mean(src, 1))
    expect(mean(o, 0)).toBeGreaterThan(mean(src, 0))
  })

  it("keeps alpha and reports four histograms totalling the pixel count", () => {
    const r = applyTone(src, w, h, { ...NEUTRAL, contrast: 30, whites: 20 })
    expect(r.data[3]).toBe(255)
    for (const bins of r.histogram) expect(bins.reduce((a, b) => a + b, 0)).toBe(w * h)
  })
})

describe("boxBlur", () => {
  it("does nothing with zero radius", () => {
    const src = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const original = new Float32Array(src)
    const out = boxBlur(src, 3, 3, 0)
    expect(Array.from(out)).toEqual(Array.from(original))
  })

  it("blurs uniformly with clamping at the edges", () => {
    const src = new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1])
    const original = new Float32Array(src)
    const out = boxBlur(src, 3, 3, 1)
    expect(Array.from(out)).toEqual(Array.from(original)) // Uniform stays uniform
  })

  it("spreads a single point outward on a larger grid", () => {
    const src = new Float32Array(25)
    src[12] = 100 // Center of 5x5 grid
    const out = boxBlur(src, 5, 5, 1)

    // The center pixel and its immediate 8 neighbors should be 100/9
    expect(out[12]).toBeCloseTo(100 / 9, 3) // Center (2, 2)
    expect(out[7]).toBeCloseTo(100 / 9, 3)  // Top-center (2, 1)
    expect(out[6]).toBeCloseTo(100 / 9, 3)  // Top-left (1, 1)

    // Pixels further away should be 0
    expect(out[0]).toBeCloseTo(0, 3) // Top-left corner (0, 0)
    expect(out[24]).toBeCloseTo(0, 3) // Bottom-right corner (4, 4)
  })
})

describe("curveLut", () => {
  it("is null when flat and lifts the targeted region otherwise", () => {
    expect(curveLut(NEUTRAL)).toBeNull()
    const lut = curveLut({ ...NEUTRAL, curveShadows: 100 })!
    expect(lut[32]).toBeGreaterThan(32 / 255)
    expect(lut[255]).toBeCloseTo(1, 1)
  })
})

describe("recipes", () => {
  it("fills missing fields when migrating an old recipe", () => {
    const { whites: _w, noise: _n, ...old } = NEUTRAL
    const m = migrateDevelop({ ...old, exposure: 5 })
    expect(m.whites).toBe(0)
    expect(m.noise).toBe(0)
    expect(m.exposure).toBe(5)
  })

  it("applies and matches every preset", () => {
    for (const p of PRESETS) expect(matchesPreset(presetDevelop(NEUTRAL, p.values), p.values)).toBe(true)
  })
})

describe("optics and lens profiles", () => {
  it("provides calibrated profiles and calculates profile distortion", async () => {
    const { LENS_PROFILES, getProfileDistortion } = await import("../src/app/develop")
    expect(LENS_PROFILES.length).toBeGreaterThan(3)
    const canonProfile = LENS_PROFILES.find((p) => p.id === "Canon RF 24-70mm f/2.8L IS USM")
    expect(canonProfile).toBeDefined()
    expect(canonProfile?.defaultDistortion).toBe(-10)
    expect(getProfileDistortion("Canon RF 24-70mm f/2.8L IS USM")).toBe(-10)
    expect(getProfileDistortion("Manual")).toBe(0)
  })

  it("supports Sony Alpha camera lenses with full-frame FE and APS-C E mounts", async () => {
    const { getSonyAlphaLenses, resolveLensProfile, getProfileDistortion, getProfileVignette } =
      await import("../src/app/develop")
    const sonyLenses = getSonyAlphaLenses()
    expect(sonyLenses.length).toBeGreaterThanOrEqual(20)

    // Verify flagship G Master lenses
    const gm2470 = sonyLenses.find((p) => p.id === "Sony FE 24-70mm f/2.8 GM II")
    expect(gm2470).toBeDefined()
    expect(gm2470?.series).toBe("G Master")
    expect(gm2470?.mount).toBe("Sony FE")
    expect(gm2470?.defaultDistortion).toBe(-12)
    expect(gm2470?.defaultVignette).toBe(24)

    const gm70200 = sonyLenses.find((p) => p.id === "Sony FE 70-200mm f/2.8 GM OSS II")
    expect(gm70200).toBeDefined()
    expect(gm70200?.series).toBe("G Master")
    expect(gm70200?.defaultDistortion).toBe(-8)

    // Verify Sony APS-C E-mount lenses
    const e1655 = sonyLenses.find((p) => p.id === "Sony E 16-55mm f/2.8 G")
    expect(e1655).toBeDefined()
    expect(e1655?.mount).toBe("Sony E")
    expect(e1655?.series).toBe("G")

    // Test resolving via Auto (EXIF) with Sony camera and various EXIF strings
    const resolvedFromExif = resolveLensProfile("Auto (EXIF)", "FE 24-70mm F2.8 GM II", "Sony ILCE-7M4")
    expect(resolvedFromExif?.id).toBe("Sony FE 24-70mm f/2.8 GM II")

    const resolvedA7RV = resolveLensProfile("Auto (EXIF)", "35mm f/1.4", "Sony α7R V")
    expect(resolvedA7RV?.id).toBe("Sony FE 35mm f/1.4 GM")

    const resolvedF50 = resolveLensProfile("Auto (EXIF)", "FE 50mm F1.2 GM", "Sony Alpha 1")
    expect(resolvedF50?.id).toBe("Sony FE 50mm f/1.2 GM")

    // Test calibrated distortion and vignette getters
    expect(getProfileDistortion("Auto (EXIF)", "FE 24-70mm F2.8 GM II", "Sony ILCE-7RM5")).toBe(-12)
    expect(getProfileVignette("Auto (EXIF)", "FE 24-70mm F2.8 GM II", "Sony ILCE-7RM5")).toBe(24)
    expect(getProfileDistortion("Sony FE 70-200mm f/2.8 GM OSS II")).toBe(-8)

    // Test Sony lens filtering by query
    const filterSony = (query: string) => {
      const q = query.trim().toLowerCase()
      return sonyLenses.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.series?.toLowerCase().includes(q) ?? false) ||
          (p.focalLength?.toLowerCase().includes(q) ?? false) ||
          (p.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false)
        )
      })
    }

    const matches2470 = filterSony("24-70")
    expect(matches2470.length).toBeGreaterThanOrEqual(2)
    expect(matches2470.some((l) => l.name.includes("24-70mm f/2.8 GM II"))).toBe(true)

    const matchesGM = filterSony("GM")
    expect(matchesGM.length).toBeGreaterThanOrEqual(4)
    expect(matchesGM.every((l) => l.series === "G Master")).toBe(true)

    const matches70200 = filterSony("70-200")
    expect(matches70200.some((l) => l.name.includes("70-200mm"))).toBe(true)
  })

  it("applies vignetting correction to image boundaries", () => {
    const neutralRes = applyTone(src, w, h, NEUTRAL).data
    const lightenedCorners = applyTone(src, w, h, { ...NEUTRAL, vignetting: 50 }).data
    const darkenedCorners = applyTone(src, w, h, { ...NEUTRAL, vignetting: -50 }).data

    // Check corner pixel (0, 0)
    expect(lightenedCorners[0]).toBeGreaterThanOrEqual(neutralRes[0])
    expect(darkenedCorners[0]).toBeLessThanOrEqual(neutralRes[0])
  })

  it("applies defringe reduction to chromatic fringe pixels", () => {
    const testFringe = new Uint8ClampedArray(4 * 4 * 4).fill(128)
    // Make first pixel have severe magenta fringe (high R and B, low G)
    testFringe[0] = 240
    testFringe[1] = 40
    testFringe[2] = 230
    testFringe[3] = 255

    const defringed = applyTone(testFringe, 4, 4, { ...NEUTRAL, defringe: 80 }).data
    expect(defringed[0]).toBeLessThan(testFringe[0])
    expect(defringed[2]).toBeLessThan(testFringe[2])
  })
})

describe("AI assist & neural looks", () => {
  it("computes auto develop tonal corrections", async () => {
    const { aiAutoDevelop } = await import("../src/app/ai")
    const darkPixels = new Uint8ClampedArray(16 * 16 * 4).fill(30)
    for (let i = 3; i < darkPixels.length; i += 4) darkPixels[i] = 255
    const res = aiAutoDevelop(darkPixels, 16, 16)
    expect(res.values.exposure).toBeGreaterThan(0)
    expect(res.explanation).toContain("exposure")
  })

  it("interprets creative styles via semantic look generator", async () => {
    const { aiDescribeYourLook } = await import("../src/app/ai")
    const look = await aiDescribeYourLook("Golden Hour warm sunset glow", NEUTRAL)
    expect(look.values.temperature).toBeGreaterThan(0)
    expect(look.styleName).toBeDefined()
  })
})

describe("EXIF lens detection and pre-selection helpers", () => {
  it("detects Sony Alpha lens profile from exact EXIF metadata", () => {
    const match = detectLensFromExif({
      name: "DSC04891.ARW",
      camera: "Sony ILCE-7RM5",
      lens: "Sony FE 24-70mm f/2.8 GM II",
    })
    expect(match).toBeDefined()
    expect(match?.profile.id).toBe("Sony FE 24-70mm f/2.8 GM II")
    expect(match?.chipId).toBe("Sony FE 24-70mm f/2.8 GM II")
    expect(match?.confidence).toBe("exact")
    expect(match?.profile.mount).toBe("Sony FE")
  })

  it("detects lens from standard Sony alias or shorthand string", () => {
    const match = detectLensFromExif({
      name: "A7R5_PORTRAIT.ARW",
      camera: "Sony α7R V",
      lens: "FE 35mm F1.4 GM",
    })
    expect(match).toBeDefined()
    expect(match?.profile.id).toBe("Sony FE 35mm f/1.4 GM")
    expect(match?.confidence).toBe("exact")

    const matchHeuristic = detectLensFromExif({
      name: "STREET.JPG",
      camera: "Sony Alpha 7 IV",
      lens: "35mm f/1.4",
    })
    expect(matchHeuristic?.profile.id).toBe("Sony FE 35mm f/1.4 GM")
  })

  it("handles null or missing EXIF safely without errors", () => {
    expect(detectLensFromExif(null)).toBeUndefined()
    expect(detectLensFromExif(undefined)).toBeUndefined()
    expect(detectLensFromExif({ name: "NO_EXIF.JPG", lens: "", camera: "" })).toBeUndefined()
    expect(
      detectLensFromExif({ name: "MANUAL.JPG", lens: "Vintage 50mm", camera: "Leica M3" })
    ).toBeUndefined()
  })

  it("pre-selects lens chip ID when lensModel is empty or Auto (EXIF)", () => {
    const photo = {
      name: "TEST.ARW",
      camera: "Sony α7R V",
      lens: "FE 70-200mm F2.8 GM OSS II",
      develop: { lensModel: "Auto (EXIF)" },
    }
    const preselected = preselectLensFromExif(photo)
    expect(preselected).toBe("Sony FE 70-200mm f/2.8 GM OSS II")

    // Does not override explicit custom lens selection unless forced
    const photoExplicit = {
      ...photo,
      develop: { lensModel: "Sony FE 50mm f/1.2 GM" },
    }
    expect(preselectLensFromExif(photoExplicit)).toBe("Sony FE 50mm f/1.2 GM")
    expect(preselectLensFromExif(photoExplicit, true)).toBe("Sony FE 70-200mm f/2.8 GM OSS II")
  })
})


