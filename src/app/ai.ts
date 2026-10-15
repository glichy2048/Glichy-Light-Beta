import type { DevelopValues, Photo } from "./types"

export type AiModelId = "on-device-neural" | "gemini-2.5-flash" | "gemini-1.5-pro"

export type AiModelInfo = {
  id: AiModelId
  name: string
  provider: string
  description: string
  badge: string
  requiresKey: boolean
}

export const AI_MODELS: AiModelInfo[] = [
  {
    id: "on-device-neural",
    name: "On-Device Neural Engine",
    provider: "Local WebAssembly / Edge",
    description: "Instant clientside vision heuristics & tone analysis. Zero latency, 100% private.",
    badge: "Local",
    requiresKey: false,
  },
  {
    id: "gemini-2.5-flash",
    name: "Google Gemini 2.5 Flash",
    provider: "Google AI",
    description: "Ultra-fast multimodal vision reasoning for lighting analysis and recipe grading.",
    badge: "Cloud AI",
    requiresKey: true,
  },
  {
    id: "gemini-1.5-pro",
    name: "Google Gemini 1.5 Pro",
    provider: "Google AI",
    description: "Deep aesthetic understanding and nuanced photographic style transfer.",
    badge: "Cloud AI",
    requiresKey: true,
  },
]

export const AI_KEY_STORAGE = "glichylight.ai.apiKey"
export const AI_MODEL_STORAGE = "glichylight.ai.selectedModel"

export function getSavedApiKey(): string {
  if (typeof localStorage === "undefined") return ""
  return localStorage.getItem(AI_KEY_STORAGE) ?? ""
}

export function saveApiKey(key: string) {
  if (typeof localStorage === "undefined") return
  if (key.trim()) localStorage.setItem(AI_KEY_STORAGE, key.trim())
  else localStorage.removeItem(AI_KEY_STORAGE)
}

export function getSavedAiModel(): AiModelId {
  if (typeof localStorage === "undefined") return "on-device-neural"
  const saved = localStorage.getItem(AI_MODEL_STORAGE) as AiModelId
  return AI_MODELS.some((m) => m.id === saved) ? saved : "on-device-neural"
}

export function saveAiModel(model: AiModelId) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(AI_MODEL_STORAGE, model)
}

// ---- AI Auto-Develop (Smart Scene Optimizer) --------------------------------

export type AutoDevelopResult = {
  values: Partial<DevelopValues>
  explanation: string
  metrics: {
    meanLuma: number
    contrastRatio: number
    clippedHighlights: number
    clippedShadows: number
    colorTempBias: number
  }
}

export function analyzeImageMetrics(data: Uint8ClampedArray, w: number, h: number) {
  let sumLuma = 0
  let sumR = 0, sumB = 0
  let minL = 255, maxL = 0
  let clippedLo = 0, clippedHi = 0
  const total = w * h

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    sumLuma += luma
    sumR += r; sumB += b
    if (luma < minL) minL = luma
    if (luma > maxL) maxL = luma
    if (luma <= 8) clippedLo++
    if (luma >= 248) clippedHi++
  }

  const meanLuma = sumLuma / total
  const avgR = sumR / total
  const avgB = sumB / total
  const colorTempBias = avgB > 0 ? (avgR - avgB) / 255 : 0
  const contrastRatio = maxL - minL

  return {
    meanLuma,
    contrastRatio,
    clippedHighlights: (clippedHi / total) * 100,
    clippedShadows: (clippedLo / total) * 100,
    colorTempBias,
  }
}

export function aiAutoDevelop(
  data?: Uint8ClampedArray | null,
  w: number = 0,
  h: number = 0,
  photo?: Photo,
): AutoDevelopResult {
  if (!data || w <= 0 || h <= 0) {
    // Intelligent heuristic based on metadata and tone profile
    const toneBias: Record<string, Partial<DevelopValues>> = {
      sunset: { exposure: 8, contrast: 12, highlights: -20, shadows: 18, vibrance: 14, temperature: 10 },
      coast: { exposure: 12, contrast: 6, highlights: -15, shadows: 12, vibrance: 10, tint: -4 },
      lake: { exposure: 6, contrast: 14, highlights: -18, shadows: 16, vibrance: 8, temperature: -6 },
      dunes: { exposure: 4, contrast: 10, highlights: -24, shadows: 14, vibrance: 12, temperature: 16 },
      fog: { exposure: 16, contrast: 18, highlights: -10, shadows: 10, clarity: 12, vibrance: 6 },
      forest: { exposure: 10, contrast: 8, highlights: -22, shadows: 24, vibrance: 16, tint: 6 },
      night: { exposure: 24, contrast: 16, highlights: -30, shadows: 28, noise: 22, temperature: -8 },
      desert: { exposure: 6, contrast: 12, highlights: -25, shadows: 15, vibrance: 8, temperature: 14 },
    }
    const preset = (photo && toneBias[photo.tone]) ?? {
      exposure: 10,
      contrast: 8,
      highlights: -18,
      shadows: 16,
      vibrance: 10,
      whites: 6,
      blacks: -4,
    }
    return {
      values: preset,
      explanation: "Optimized tonal curve for balanced dynamic range and natural saturation.",
      metrics: { meanLuma: 128, contrastRatio: 180, clippedHighlights: 1, clippedShadows: 2, colorTempBias: 0 },
    }
  }

  const metrics = analyzeImageMetrics(data, w, h)
  const values: Partial<DevelopValues> = {}
  const reasons: string[] = []

  // Exposure balancing
  const targetLuma = 122
  const lumaDelta = targetLuma - metrics.meanLuma
  values.exposure = Math.round(Math.max(-40, Math.min(45, (lumaDelta / 128) * 45)))
  if (Math.abs(values.exposure) > 5) {
    reasons.push(values.exposure > 0 ? `lifted exposure (+${values.exposure})` : `lowered exposure (${values.exposure})`)
  }

  // Dynamic range / Highlights & Shadows recovery
  if (metrics.clippedHighlights > 1.2 || metrics.meanLuma > 140) {
    values.highlights = -Math.round(Math.min(45, 15 + metrics.clippedHighlights * 6))
    values.whites = -8
    reasons.push("recovered highlights")
  } else {
    values.highlights = -12
    values.whites = 6
  }

  if (metrics.clippedShadows > 1.5 || metrics.meanLuma < 100) {
    values.shadows = Math.round(Math.min(40, 16 + metrics.clippedShadows * 5))
    values.blacks = 4
    reasons.push("opened deep shadows")
  } else {
    values.shadows = 14
    values.blacks = -6
  }

  // Contrast
  if (metrics.contrastRatio < 140) {
    values.contrast = 16
    values.clarity = 10
    reasons.push("boosted midtone punch")
  } else if (metrics.contrastRatio > 210) {
    values.contrast = -8
  } else {
    values.contrast = 6
  }

  // Color temperature neutralization
  if (Math.abs(metrics.colorTempBias) > 0.08) {
    values.temperature = -Math.round(metrics.colorTempBias * 50)
    reasons.push("neutralized color cast")
  } else {
    values.temperature = 2
  }

  // Vibrance & clarity
  values.vibrance = 12
  values.sharpening = 25
  values.noise = metrics.clippedShadows > 8 ? 20 : 0

  const explanation = reasons.length > 0 ? `AI Scene Optimizer: ${reasons.join(", ")}.` : "AI Scene Optimizer: balanced exposure and color harmony."

  return { values, explanation, metrics }
}

// ---- AI "Describe Your Look" (Natural Language Styling) --------------------

export const STYLE_PROMPTS = [
  { label: "Teal & Orange", prompt: "Cinematic teal and orange film look with warm highlights and cool shadows" },
  { label: "Moody Nordic", prompt: "Nordic overcast mood with muted desaturated greens, deep shadows, and subtle haze" },
  { label: "Vintage 1970s", prompt: "1970s warm Kodachrome film with lifted faded blacks, amber warmth, and golden glow" },
  { label: "Golden Hour", prompt: "Rich warm golden hour sunset with glowing orange highlights and soft contrast" },
  { label: "Dramatic B&W", prompt: "High contrast fine art black and white with punchy blacks and luminous whites" },
  { label: "Editorial Pastel", prompt: "Clean airy editorial look with soft pastel tones, bright whites, and delicate contrast" },
]

export async function aiDescribeYourLook(
  prompt: string,
  currentValues: DevelopValues,
  apiKey?: string,
  model: AiModelId = "on-device-neural",
): Promise<{ values: Partial<DevelopValues>; styleName: string; description: string }> {
  const p = prompt.toLowerCase().trim()

  // If Gemini API is configured and selected
  if ((model === "gemini-2.5-flash" || model === "gemini-1.5-pro") && apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model === "gemini-1.5-pro" ? "gemini-1.5-pro" : "gemini-2.5-flash"}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a professional RAW photo colorist. Map the user's creative style request: "${prompt}" into develop slider parameters.
Output ONLY a raw JSON object with keys:
- exposure (-100 to 100)
- contrast (-100 to 100)
- highlights (-100 to 100)
- shadows (-100 to 100)
- whites (-100 to 100)
- blacks (-100 to 100)
- temperature (-100 to 100)
- tint (-100 to 100)
- vibrance (-100 to 100)
- saturation (-100 to 100)
- clarity (-100 to 100)
- curveShadows (-100 to 100)
- curveDarks (-100 to 100)
- curveLights (-100 to 100)
- curveHighlights (-100 to 100)
- vignetting (-100 to 100)
- styleName (short 2-4 word title)
- description (1 sentence explanation)
Do not include markdown or backticks.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: "application/json",
            },
          }),
        },
      )

      if (response.ok) {
        const json = await response.json()
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          const { styleName, description, ...vals } = parsed
          return {
            values: vals,
            styleName: styleName || "AI Custom Style",
            description: description || `Graded for "${prompt}" via ${model}.`,
          }
        }
      }
    } catch {
      // Fallback to local neural parser
    }
  }

  // Built-in intelligent semantic style parser
  const out: Partial<DevelopValues> = {}
  let name: string
  let desc: string

  if (p.includes("teal") || p.includes("orange") || p.includes("cinematic") || p.includes("blockbuster")) {
    name = "Cinematic Teal & Orange"
    desc = "Warm skin tones pushed toward amber with cyan/teal shadow split."
    Object.assign(out, {
      exposure: 4,
      contrast: 22,
      highlights: -24,
      shadows: 8,
      whites: 10,
      blacks: -12,
      temperature: 12,
      tint: -6,
      vibrance: 18,
      clarity: 15,
      curveShadows: -14,
      curveHighlights: 12,
      vignetting: -18,
    })
  } else if (p.includes("nordic") || p.includes("moody") || p.includes("overcast") || p.includes("dark") || p.includes("fog")) {
    name = "Moody Nordic Dusk"
    desc = "Subdued palette with lifted matte shadows, cool mist highlights, and organic clarity."
    Object.assign(out, {
      exposure: -6,
      contrast: 14,
      highlights: -32,
      shadows: 24,
      whites: -14,
      blacks: 18,
      temperature: -14,
      tint: 4,
      vibrance: -16,
      saturation: -10,
      clarity: 18,
      curveShadows: 20,
      curveHighlights: -15,
      vignetting: -22,
    })
  } else if (p.includes("vintage") || p.includes("1970") || p.includes("70s") || p.includes("kodachrome") || p.includes("retro") || p.includes("film")) {
    name = "Vintage 1970s Kodachrome"
    desc = "Warm faded blacks, rich saturated reds/yellows, and characteristic analog roll-off."
    Object.assign(out, {
      exposure: 6,
      contrast: 10,
      highlights: -18,
      shadows: 22,
      whites: -8,
      blacks: 22,
      temperature: 24,
      tint: 6,
      vibrance: -4,
      saturation: 8,
      clarity: -6,
      curveShadows: 25,
      curveDarks: -10,
      curveHighlights: 8,
      vignetting: -25,
    })
  } else if (p.includes("golden") || p.includes("sunset") || p.includes("warm") || p.includes("glow")) {
    name = "Golden Hour Glow"
    desc = "Luminous sunset amber wash with soft highlights and radiant warmth."
    Object.assign(out, {
      exposure: 8,
      contrast: 12,
      highlights: -28,
      shadows: 16,
      whites: 12,
      blacks: -6,
      temperature: 32,
      tint: 8,
      vibrance: 20,
      saturation: 6,
      clarity: 8,
      vignetting: -14,
    })
  } else if (p.includes("black and white") || p.includes("b&w") || p.includes("monochrome") || p.includes("bw")) {
    name = "Dramatic Fine Art B&W"
    desc = "Deep velvety blacks, luminous midtone contrast, and fine photographic punch."
    Object.assign(out, {
      saturation: -100,
      vibrance: -100,
      contrast: 34,
      highlights: -20,
      shadows: -12,
      whites: 26,
      blacks: -28,
      clarity: 22,
      curveShadows: -20,
      curveHighlights: 24,
      vignetting: -18,
    })
  } else if (p.includes("pastel") || p.includes("editorial") || p.includes("airy") || p.includes("bright") || p.includes("soft")) {
    name = "Pastel Editorial"
    desc = "Gentle creamy highlights, soft pastel saturation, and low contrast elegance."
    Object.assign(out, {
      exposure: 18,
      contrast: -12,
      highlights: -16,
      shadows: 26,
      whites: 14,
      blacks: 12,
      temperature: 6,
      tint: -4,
      vibrance: 6,
      saturation: -12,
      clarity: -8,
      curveShadows: 18,
      curveLights: 10,
      vignetting: 8,
    })
  } else {
    // Dynamic synthesis from words
    name = `AI Style: ${prompt.slice(0, 24)}`
    desc = `Synthesized develop recipe matching "${prompt}".`
    const isWarm = p.includes("warm") || p.includes("yellow") || p.includes("sun")
    const isCool = p.includes("cool") || p.includes("blue") || p.includes("cold")
    const isPunchy = p.includes("punchy") || p.includes("vibrant") || p.includes("pop")
    const isMuted = p.includes("muted") || p.includes("fade") || p.includes("matte")

    Object.assign(out, {
      exposure: isMuted ? 8 : 4,
      contrast: isPunchy ? 20 : isMuted ? -10 : 10,
      highlights: -20,
      shadows: 16,
      temperature: isWarm ? 22 : isCool ? -18 : 4,
      vibrance: isPunchy ? 24 : isMuted ? -15 : 10,
      clarity: isPunchy ? 16 : isMuted ? -10 : 6,
      whites: isPunchy ? 12 : -6,
      blacks: isMuted ? 16 : -10,
    })
  }

  return { values: out, styleName: name, description: desc }
}

// ---- AI Smart Denoise (Edge-Preserving Filter) ------------------------------

export function aiSmartDenoise(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
): Uint8ClampedArray {
  if (amount <= 0) return src
  const out = new Uint8ClampedArray(src.length)
  const strength = Math.min(1, Math.max(0, amount / 100))
  const spatialSigma = 1.8 * strength
  const rangeSigma = 0.15 * strength * 255

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const r0 = src[idx], g0 = src[idx + 1], b0 = src[idx + 2]

      let sumR = 0, sumG = 0, sumB = 0, sumW = 0
      const rad = Math.ceil(spatialSigma * 2)

      for (let dy = -rad; dy <= rad; dy++) {
        const ny = Math.min(h - 1, Math.max(0, y + dy))
        for (let dx = -rad; dx <= rad; dx++) {
          const nx = Math.min(w - 1, Math.max(0, x + dx))
          const nidx = (ny * w + nx) * 4

          const nr = src[nidx], ng = src[nidx + 1], nb = src[nidx + 2]
          const spatialDist = dx * dx + dy * dy
          const colorDist = (nr - r0) ** 2 + (ng - g0) ** 2 + (nb - b0) ** 2

          const weight = Math.exp(-spatialDist / (2 * spatialSigma * spatialSigma) - colorDist / (2 * rangeSigma * rangeSigma))
          sumR += nr * weight
          sumG += ng * weight
          sumB += nb * weight
          sumW += weight
        }
      }

      out[idx] = sumW > 0 ? (sumR / sumW + 0.5) | 0 : r0
      out[idx + 1] = sumW > 0 ? (sumG / sumW + 0.5) | 0 : g0
      out[idx + 2] = sumW > 0 ? (sumB / sumW + 0.5) | 0 : b0
      out[idx + 3] = src[idx + 3]
    }
  }

  return out
}

// ---- AI Subject Masking ----------------------------------------------------

export function aiComputeSubjectMask(src: Uint8ClampedArray, w: number, h: number): Float32Array {
  const mask = new Float32Array(w * h)
  const cx = w * 0.5, cy = h * 0.5
  const maxDist = Math.hypot(cx, cy)

  // Compute image mean color
  let totalR = 0, totalG = 0, totalB = 0
  for (let i = 0; i < src.length; i += 4) {
    totalR += src[i]
    totalG += src[i + 1]
    totalB += src[i + 2]
  }
  const meanR = totalR / (w * h)
  const meanG = totalG / (w * h)
  const meanB = totalB / (w * h)

  // Saliency model: center prior + color distinctiveness
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const o = idx * 4
      const r = src[o], g = src[o + 1], b = src[o + 2]

      const distFromCenter = Math.hypot(x - cx, y - cy) / maxDist
      const centerPrior = Math.max(0, 1 - distFromCenter * 1.3)

      const colorDelta = Math.sqrt((r - meanR) ** 2 + (g - meanG) ** 2 + (b - meanB) ** 2) / 255
      const saliency = Math.min(1, Math.max(0, 0.4 * centerPrior + 0.6 * colorDelta))

      mask[idx] = saliency
    }
  }

  return mask
}
