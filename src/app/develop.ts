import type { DevelopValues } from "./types"
import { Log } from "./diagnostics"

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

export type LensProfile = {
  id: string
  name: string
  brand: "Sony" | "Canon" | "Nikon" | "Fujifilm" | "Leica" | "Generic" | "Special"
  mount?: "Sony FE" | "Sony E" | "Canon RF" | "Nikon Z" | "Fujifilm X" | "Leica M" | "Universal"
  series?: "G Master" | "G" | "Zeiss" | "L-Series" | "S-Line" | "Red Badge" | "Prime" | "Standard"
  focalLength?: string
  maxAperture?: string
  defaultDistortion: number
  defaultVignette: number
  chromaticAberration?: boolean
  aliases?: string[]
}

export const LENS_PROFILES: LensProfile[] = [
  {
    id: "Auto (EXIF)",
    name: "Auto (Detected from Lens EXIF)",
    brand: "Special",
    defaultDistortion: -8,
    defaultVignette: 18,
    aliases: ["auto", "exif", "detected"],
  },
  // --- Sony Alpha Full-Frame (FE Mount) ---
  {
    id: "Sony FE 24-70mm f/2.8 GM II",
    name: "Sony FE 24-70mm f/2.8 GM II",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "24-70mm",
    maxAperture: "f/2.8",
    defaultDistortion: -12,
    defaultVignette: 24,
    chromaticAberration: true,
    aliases: ["FE 24-70mm F2.8 GM II", "SEL2470GM2", "FE 24-70mm F2.8 GM2", "24-70mm GM II"],
  },
  {
    id: "Sony FE 24-70mm f/2.8 GM",
    name: "Sony FE 24-70mm f/2.8 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "24-70mm",
    maxAperture: "f/2.8",
    defaultDistortion: -14,
    defaultVignette: 26,
    chromaticAberration: true,
    aliases: ["FE 24-70mm F2.8 GM", "SEL2470GM", "24-70mm GM"],
  },
  {
    id: "Sony FE 70-200mm f/2.8 GM OSS II",
    name: "Sony FE 70-200mm f/2.8 GM OSS II",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "70-200mm",
    maxAperture: "f/2.8",
    defaultDistortion: -8,
    defaultVignette: 20,
    chromaticAberration: true,
    aliases: ["FE 70-200mm F2.8 GM OSS II", "SEL70200GM2", "70-200mm GM II", "70-200mm f/2.8"],
  },
  {
    id: "Sony FE 70-200mm f/4 Macro G OSS II",
    name: "Sony FE 70-200mm f/4 Macro G OSS II",
    brand: "Sony",
    mount: "Sony FE",
    series: "G",
    focalLength: "70-200mm",
    maxAperture: "f/4",
    defaultDistortion: -7,
    defaultVignette: 18,
    chromaticAberration: true,
    aliases: ["FE 70-200mm F4 Macro G OSS II", "SEL70200G2", "70-200mm F4 G II"],
  },
  {
    id: "Sony FE 16-35mm f/2.8 GM II",
    name: "Sony FE 16-35mm f/2.8 GM II",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "16-35mm",
    maxAperture: "f/2.8",
    defaultDistortion: -16,
    defaultVignette: 28,
    chromaticAberration: true,
    aliases: ["FE 16-35mm F2.8 GM II", "SEL1635GM2", "16-35mm GM II", "16-35mm f/2.8"],
  },
  {
    id: "Sony FE 12-24mm f/2.8 GM",
    name: "Sony FE 12-24mm f/2.8 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "12-24mm",
    maxAperture: "f/2.8",
    defaultDistortion: -18,
    defaultVignette: 30,
    chromaticAberration: true,
    aliases: ["FE 12-24mm F2.8 GM", "SEL1224GM", "12-24mm GM"],
  },
  {
    id: "Sony FE 14mm f/1.8 GM",
    name: "Sony FE 14mm f/1.8 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "14mm",
    maxAperture: "f/1.8",
    defaultDistortion: -15,
    defaultVignette: 26,
    chromaticAberration: true,
    aliases: ["FE 14mm F1.8 GM", "SEL14F18GM", "14mm GM"],
  },
  {
    id: "Sony FE 24mm f/1.4 GM",
    name: "Sony FE 24mm f/1.4 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "24mm",
    maxAperture: "f/1.4",
    defaultDistortion: -6,
    defaultVignette: 22,
    chromaticAberration: true,
    aliases: ["FE 24mm F1.4 GM", "SEL24F14GM", "24mm GM"],
  },
  {
    id: "Sony FE 35mm f/1.4 GM",
    name: "Sony FE 35mm f/1.4 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "35mm",
    maxAperture: "f/1.4",
    defaultDistortion: -5,
    defaultVignette: 22,
    chromaticAberration: true,
    aliases: ["FE 35mm F1.4 GM", "SEL35F14GM", "35mm GM", "35mm f/1.4"],
  },
  {
    id: "Sony FE 50mm f/1.2 GM",
    name: "Sony FE 50mm f/1.2 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "50mm",
    maxAperture: "f/1.2",
    defaultDistortion: -4,
    defaultVignette: 24,
    chromaticAberration: true,
    aliases: ["FE 50mm F1.2 GM", "SEL50F12GM", "50mm F1.2 GM", "50mm f/1.2"],
  },
  {
    id: "Sony FE 50mm f/1.4 GM",
    name: "Sony FE 50mm f/1.4 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "50mm",
    maxAperture: "f/1.4",
    defaultDistortion: -4,
    defaultVignette: 20,
    chromaticAberration: true,
    aliases: ["FE 50mm F1.4 GM", "SEL50F14GM", "50mm F1.4 GM"],
  },
  {
    id: "Sony FE 85mm f/1.4 GM II",
    name: "Sony FE 85mm f/1.4 GM II",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "85mm",
    maxAperture: "f/1.4",
    defaultDistortion: -3,
    defaultVignette: 18,
    chromaticAberration: true,
    aliases: ["FE 85mm F1.4 GM II", "SEL85F14GM2", "85mm GM II", "85mm f/1.4"],
  },
  {
    id: "Sony FE 85mm f/1.8",
    name: "Sony FE 85mm f/1.8",
    brand: "Sony",
    mount: "Sony FE",
    series: "Standard",
    focalLength: "85mm",
    maxAperture: "f/1.8",
    defaultDistortion: -4,
    defaultVignette: 19,
    chromaticAberration: true,
    aliases: ["FE 85mm F1.8", "SEL85F18", "85mm F1.8", "85mm f/1.8"],
  },
  {
    id: "Sony FE 135mm f/1.8 GM",
    name: "Sony FE 135mm f/1.8 GM",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "135mm",
    maxAperture: "f/1.8",
    defaultDistortion: -2,
    defaultVignette: 16,
    chromaticAberration: true,
    aliases: ["FE 135mm F1.8 GM", "SEL135F18GM", "135mm GM"],
  },
  {
    id: "Sony FE 20-70mm f/4 G",
    name: "Sony FE 20-70mm f/4 G",
    brand: "Sony",
    mount: "Sony FE",
    series: "G",
    focalLength: "20-70mm",
    maxAperture: "f/4",
    defaultDistortion: -14,
    defaultVignette: 24,
    chromaticAberration: true,
    aliases: ["FE 20-70mm F4 G", "SEL2070G", "20-70mm G"],
  },
  {
    id: "Sony FE 24-105mm f/4 G OSS",
    name: "Sony FE 24-105mm f/4 G OSS",
    brand: "Sony",
    mount: "Sony FE",
    series: "G",
    focalLength: "24-105mm",
    maxAperture: "f/4",
    defaultDistortion: -13,
    defaultVignette: 25,
    chromaticAberration: true,
    aliases: ["FE 24-105mm F4 G OSS", "SEL24105G", "24-105mm G"],
  },
  {
    id: "Sony FE 90mm f/2.8 Macro G OSS",
    name: "Sony FE 90mm f/2.8 Macro G OSS",
    brand: "Sony",
    mount: "Sony FE",
    series: "G",
    focalLength: "90mm",
    maxAperture: "f/2.8",
    defaultDistortion: -2,
    defaultVignette: 15,
    chromaticAberration: true,
    aliases: ["FE 90mm F2.8 Macro G OSS", "SEL90M28G", "90mm Macro"],
  },
  {
    id: "Sony FE 200-600mm f/5.6-6.3 G OSS",
    name: "Sony FE 200-600mm f/5.6-6.3 G OSS",
    brand: "Sony",
    mount: "Sony FE",
    series: "G",
    focalLength: "200-600mm",
    maxAperture: "f/5.6-6.3",
    defaultDistortion: -5,
    defaultVignette: 18,
    chromaticAberration: true,
    aliases: ["FE 200-600mm F5.6-6.3 G OSS", "SEL200600G", "200-600mm G"],
  },
  {
    id: "Sony FE 100-400mm f/4.5-5.6 GM OSS",
    name: "Sony FE 100-400mm f/4.5-5.6 GM OSS",
    brand: "Sony",
    mount: "Sony FE",
    series: "G Master",
    focalLength: "100-400mm",
    maxAperture: "f/4.5-5.6",
    defaultDistortion: -6,
    defaultVignette: 20,
    chromaticAberration: true,
    aliases: ["FE 100-400mm F4.5-5.6 GM OSS", "SEL100400GM", "100-400mm GM"],
  },
  {
    id: "Sony FE 55mm f/1.8 ZA Sonnar T*",
    name: "Sony FE 55mm f/1.8 ZA Sonnar T*",
    brand: "Sony",
    mount: "Sony FE",
    series: "Zeiss",
    focalLength: "55mm",
    maxAperture: "f/1.8",
    defaultDistortion: -3,
    defaultVignette: 22,
    chromaticAberration: true,
    aliases: ["Sonnar T* FE 55mm F1.8 ZA", "SEL55F18Z", "55mm F1.8 ZA", "Zeiss 55mm"],
  },
  {
    id: "Sony FE 40mm f/2.5 G",
    name: "Sony FE 40mm f/2.5 G",
    brand: "Sony",
    mount: "Sony FE",
    series: "G",
    focalLength: "40mm",
    maxAperture: "f/2.5",
    defaultDistortion: -5,
    defaultVignette: 20,
    chromaticAberration: true,
    aliases: ["FE 40mm F2.5 G", "SEL40F25G", "40mm G"],
  },
  {
    id: "Sony FE 28-70mm f/3.5-5.6 OSS",
    name: "Sony FE 28-70mm f/3.5-5.6 OSS",
    brand: "Sony",
    mount: "Sony FE",
    series: "Standard",
    focalLength: "28-70mm",
    maxAperture: "f/3.5-5.6",
    defaultDistortion: -10,
    defaultVignette: 20,
    chromaticAberration: true,
    aliases: ["FE 28-70mm F3.5-5.6 OSS", "SEL2870", "28-70mm OSS"],
  },
  // --- Sony Alpha APS-C (E Mount) ---
  {
    id: "Sony E 16-55mm f/2.8 G",
    name: "Sony E 16-55mm f/2.8 G",
    brand: "Sony",
    mount: "Sony E",
    series: "G",
    focalLength: "16-55mm",
    maxAperture: "f/2.8",
    defaultDistortion: -13,
    defaultVignette: 22,
    chromaticAberration: true,
    aliases: ["E 16-55mm F2.8 G", "SEL1655G", "16-55mm F2.8 G"],
  },
  {
    id: "Sony E 70-350mm f/4.5-6.3 G OSS",
    name: "Sony E 70-350mm f/4.5-6.3 G OSS",
    brand: "Sony",
    mount: "Sony E",
    series: "G",
    focalLength: "70-350mm",
    maxAperture: "f/4.5-6.3",
    defaultDistortion: -8,
    defaultVignette: 18,
    chromaticAberration: true,
    aliases: ["E 70-350mm F4.5-6.3 G OSS", "SEL70350G", "70-350mm G"],
  },
  {
    id: "Sony E 10-20mm f/4 PZ G",
    name: "Sony E 10-20mm f/4 PZ G",
    brand: "Sony",
    mount: "Sony E",
    series: "G",
    focalLength: "10-20mm",
    maxAperture: "f/4",
    defaultDistortion: -15,
    defaultVignette: 25,
    chromaticAberration: true,
    aliases: ["E 10-20mm F4 PZ G", "SELP1020G", "10-20mm PZ G"],
  },
  {
    id: "Sony E 15mm f/1.4 G",
    name: "Sony E 15mm f/1.4 G",
    brand: "Sony",
    mount: "Sony E",
    series: "G",
    focalLength: "15mm",
    maxAperture: "f/1.4",
    defaultDistortion: -7,
    defaultVignette: 22,
    chromaticAberration: true,
    aliases: ["E 15mm F1.4 G", "SEL15F14G", "15mm F1.4 G"],
  },
  {
    id: "Sony E 16-50mm f/3.5-5.6 PZ OSS",
    name: "Sony E 16-50mm f/3.5-5.6 PZ OSS",
    brand: "Sony",
    mount: "Sony E",
    series: "Standard",
    focalLength: "16-50mm",
    maxAperture: "f/3.5-5.6",
    defaultDistortion: -16,
    defaultVignette: 26,
    chromaticAberration: true,
    aliases: ["E PZ 16-50mm F3.5-5.6 OSS", "SELP1650", "16-50mm PZ"],
  },
  // --- Other Mounts ---
  {
    id: "Canon RF 24-70mm f/2.8L IS USM",
    name: "Canon RF 24-70mm f/2.8L IS USM",
    brand: "Canon",
    mount: "Canon RF",
    series: "L-Series",
    focalLength: "24-70mm",
    maxAperture: "f/2.8",
    defaultDistortion: -10,
    defaultVignette: 22,
    aliases: ["RF 24-70mm F2.8L IS USM"],
  },
  {
    id: "Nikon NIKKOR Z 24-70mm f/2.8 S",
    name: "Nikon NIKKOR Z 24-70mm f/2.8 S",
    brand: "Nikon",
    mount: "Nikon Z",
    series: "S-Line",
    focalLength: "24-70mm",
    maxAperture: "f/2.8",
    defaultDistortion: -11,
    defaultVignette: 20,
    aliases: ["NIKKOR Z 24-70mm f/2.8 S"],
  },
  {
    id: "Fujifilm XF 16-55mm f/2.8 R LM WR",
    name: "Fujifilm XF 16-55mm f/2.8 R LM WR",
    brand: "Fujifilm",
    mount: "Fujifilm X",
    series: "Red Badge",
    focalLength: "16-55mm",
    maxAperture: "f/2.8",
    defaultDistortion: -14,
    defaultVignette: 26,
    aliases: ["XF 16-55mm F2.8 R LM WR"],
  },
  {
    id: "Leica Summilux-M 35mm f/1.4 ASPH",
    name: "Leica Summilux-M 35mm f/1.4 ASPH",
    brand: "Leica",
    mount: "Leica M",
    series: "Prime",
    focalLength: "35mm",
    maxAperture: "f/1.4",
    defaultDistortion: 5,
    defaultVignette: 30,
    aliases: ["Summilux-M 35mm f/1.4 ASPH", "28mm f/1.7"],
  },
  {
    id: "Generic 50mm Prime",
    name: "Generic 50mm F/1.8 Prime",
    brand: "Generic",
    mount: "Universal",
    series: "Standard",
    focalLength: "50mm",
    maxAperture: "f/1.8",
    defaultDistortion: -4,
    defaultVignette: 15,
  },
  {
    id: "Manual",
    name: "Manual / Custom Calibration",
    brand: "Special",
    defaultDistortion: 0,
    defaultVignette: 0,
  },
]

export function resolveLensProfile(
  model?: string,
  photoLens?: string,
  camera?: string,
): LensProfile | undefined {
  if (model && model !== "Auto (EXIF)") {
    const direct = LENS_PROFILES.find((p) => p.id === model)
    if (direct) return direct
  }

  const rawLens = (photoLens || "").trim()
  const rawCam = (camera || "").toLowerCase()
  const isSony =
    rawCam.includes("sony") ||
    rawCam.includes("ilce") ||
    rawCam.includes("α") ||
    rawCam.includes("alpha")

  if (rawLens) {
    const lower = rawLens.toLowerCase()

    // 1. Exact match on id or name
    for (const p of LENS_PROFILES) {
      if (p.id.toLowerCase() === lower || p.name.toLowerCase() === lower) return p
    }

    // 2. Exact alias match
    for (const p of LENS_PROFILES) {
      if (p.aliases?.some((a) => a.toLowerCase() === lower)) return p
    }

    // 3. Substring alias match
    for (const p of LENS_PROFILES) {
      if (p.aliases?.some((a) => lower.includes(a.toLowerCase()))) return p
    }

    // 4. Heuristics for Sony Alpha camera / lens combinations
    if (isSony || lower.includes("fe") || lower.includes("sel") || lower.includes("sony")) {
      if (lower.includes("24-70") && (lower.includes("ii") || lower.includes("gm2")))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 24-70mm f/2.8 GM II")
      if (lower.includes("24-70"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 24-70mm f/2.8 GM II")
      if (lower.includes("70-200") && (lower.includes("2.8") || lower.includes("gm")))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 70-200mm f/2.8 GM OSS II")
      if (lower.includes("70-200") && lower.includes("f/4"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 70-200mm f/4 Macro G OSS II")
      if (lower.includes("16-35"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 16-35mm f/2.8 GM II")
      if (lower.includes("12-24"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 12-24mm f/2.8 GM")
      if (lower.includes("14mm"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 14mm f/1.8 GM")
      if (lower.includes("24mm"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 24mm f/1.4 GM")
      if (lower.includes("35mm") && lower.includes("1.4"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 35mm f/1.4 GM")
      if (lower.includes("50mm") && lower.includes("1.2"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 50mm f/1.2 GM")
      if (lower.includes("50mm") && lower.includes("1.4"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 50mm f/1.4 GM")
      if (lower.includes("85mm") && lower.includes("1.4"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 85mm f/1.4 GM II")
      if (lower.includes("85mm"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 85mm f/1.8")
      if (lower.includes("135mm"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 135mm f/1.8 GM")
      if (lower.includes("20-70"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 20-70mm f/4 G")
      if (lower.includes("24-105"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 24-105mm f/4 G OSS")
      if (lower.includes("90mm") || lower.includes("macro"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 90mm f/2.8 Macro G OSS")
      if (lower.includes("200-600"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 200-600mm f/5.6-6.3 G OSS")
      if (lower.includes("100-400"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 100-400mm f/4.5-5.6 GM OSS")
      if (lower.includes("55mm"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 55mm f/1.8 ZA Sonnar T*")
      if (lower.includes("40mm"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 40mm f/2.5 G")
      if (lower.includes("28-70"))
        return LENS_PROFILES.find((p) => p.id === "Sony FE 28-70mm f/3.5-5.6 OSS")
      if (lower.includes("16-55"))
        return LENS_PROFILES.find((p) => p.id === "Sony E 16-55mm f/2.8 G")
      if (lower.includes("70-350"))
        return LENS_PROFILES.find((p) => p.id === "Sony E 70-350mm f/4.5-6.3 G OSS")
      if (lower.includes("10-20"))
        return LENS_PROFILES.find((p) => p.id === "Sony E 10-20mm f/4 PZ G")
      if (lower.includes("15mm"))
        return LENS_PROFILES.find((p) => p.id === "Sony E 15mm f/1.4 G")
      if (lower.includes("16-50"))
        return LENS_PROFILES.find((p) => p.id === "Sony E 16-50mm f/3.5-5.6 PZ OSS")
    }
  }

  return LENS_PROFILES.find((p) => p.id === "Auto (EXIF)")
}

export type ExifLensMatch = {
  profile: LensProfile
  chipId: string
  confidence: "exact" | "high" | "heuristic"
  rawLens: string
  rawCamera: string
  matchedOn: string
}

/**
 * Helper function that reads EXIF data from the selected photo to determine the matching
 * lens profile and chip identifier, enabling automatic pre-selection or highlighting.
 */
export function detectLensFromExif(
  photo?: { lens?: string; camera?: string; aperture?: string; name?: string } | null
): ExifLensMatch | undefined {
  if (!photo) return undefined
  const lens = (photo.lens || "").trim()
  const camera = (photo.camera || "").trim()

  if (!lens && !camera) return undefined

  Log.d(
    "Optics",
    `detectLensFromExif analyzing photo="${photo.name || "unnamed"}" lens="${lens}" camera="${camera}"`
  )

  const profile = resolveLensProfile(undefined, lens, camera)
  if (!profile || profile.id === "Auto (EXIF)" || profile.id === "Manual") {
    Log.d("Optics", `detectLensFromExif no specific profile matched for lens="${lens}"`)
    return undefined
  }

  const lower = lens.toLowerCase()
  const isExact =
    profile.id.toLowerCase() === lower ||
    profile.name.toLowerCase() === lower ||
    Boolean(profile.aliases?.some((a) => a.toLowerCase() === lower))

  const isAliasSub = Boolean(profile.aliases?.some((a) => lower.includes(a.toLowerCase())))

  const confidence: "exact" | "high" | "heuristic" = isExact
    ? "exact"
    : isAliasSub
      ? "high"
      : "heuristic"

  const matchedOn = isExact ? "name/id" : isAliasSub ? "alias" : "camera-lens heuristic"

  const match: ExifLensMatch = {
    profile,
    chipId: profile.id,
    confidence,
    rawLens: lens,
    rawCamera: camera,
    matchedOn,
  }

  Log.d(
    "Optics",
    `detectLensFromExif matched profile: "${profile.name}" (${profile.mount || "Generic"}) with confidence: ${confidence}`
  )
  return match
}

/**
 * Automatically determines if a lens chip should be pre-selected from photo EXIF.
 * Returns the lensModel ID if auto-preselection applies, or undefined.
 */
export function preselectLensFromExif(
  photo?: { lens?: string; camera?: string; develop?: { lensModel?: string } } | null,
  forcePreselect?: boolean
): string | undefined {
  if (!photo) return undefined
  // If already set to a specific profile and not forcing, respect existing setting
  if (!forcePreselect && photo.develop?.lensModel && photo.develop.lensModel !== "Auto (EXIF)") {
    return photo.develop.lensModel
  }
  const match = detectLensFromExif(photo)
  return match?.profile.id
}

export function getSonyAlphaLenses(): LensProfile[] {
  return LENS_PROFILES.filter((p) => p.brand === "Sony")
}

export function getProfileDistortion(model?: string, photoLens?: string, camera?: string): number {
  const match = resolveLensProfile(model, photoLens, camera)
  return match?.defaultDistortion ?? -8
}

export function getProfileVignette(model?: string, photoLens?: string, camera?: string): number {
  const match = resolveLensProfile(model, photoLens, camera)
  return match?.defaultVignette ?? 18
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
