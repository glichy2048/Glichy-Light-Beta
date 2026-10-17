import { NEUTRAL } from "./develop"
import type { Photo, Tone } from "./types"

const defaults = { ...NEUTRAL }

const tones: Tone[] = [
  "sunset",
  "coast",
  "lake",
  "dunes",
  "fog",
  "forest",
  "night",
  "desert",
]
const names = [
  "dusk-ridge",
  "cliff-path",
  "alpine-lake",
  "quiet-dunes",
  "fog-valley",
  "cedar-trail",
  "blue-hour",
  "desert-road",
  "north-shore",
  "first-light",
  "granite-pass",
  "still-water",
  "wind-carved",
  "rain-line",
  "amber-field",
  "last-camp",
  "silver-falls",
  "high-plain",
]

export const initialPhotos: Photo[] = names.map((name, index) => {
  const pair = index < 6
  const groupIndex = Math.floor(index / 2)
  const format = pair && index % 2 === 1 ? "JPEG" : "RAW"
  const rating = [5, 4, 0, 3, 4, 0, 2, 5, 0, 4, 3, 0, 5, 2, 4, 0, 3, 5][index]
  const flag =
    index % 7 === 0 ? "reject" : index % 4 === 0 ? "pick" : "unflagged"
  const labels = [
    "yellow",
    "none",
    "green",
    "none",
    "red",
    "blue",
    "none",
    "purple",
  ] as const
  return {
    id: index + 1,
    name: `${name}.${format === "RAW" ? "raw" : "jpg"}`,
    tone: tones[index % tones.length],
    format,
    groupId: pair ? `capture-${groupIndex + 1}` : undefined,
    isGroupLead: pair ? index % 2 === 0 : undefined,
    date:
      index < 8
        ? "June 14, 2025"
        : index < 14
          ? "June 12, 2025"
          : "June 08, 2025",
    camera:
      index % 3 === 0
        ? "Leica Q3"
        : index % 3 === 1
          ? "Sony α7R V"
          : "Fujifilm GFX100S",
    lens:
      index % 3 === 0
        ? "28mm f/1.7"
        : index % 3 === 1
          ? (index % 6 === 1
              ? "Sony FE 35mm f/1.4 GM"
              : index % 6 === 4
                ? "Sony FE 24-70mm f/2.8 GM II"
                : "Sony FE 70-200mm f/2.8 GM OSS II")
          : "45mm f/2.8",
    dimensions: format === "RAW" ? "6000 × 4000" : "4000 × 2667",
    fileSize: format === "RAW" ? `${38 + index}.8 MB` : `${8 + index}.2 MB`,
    aperture: index % 2 ? "f/5.6" : "f/4.0",
    shutter: index % 3 ? "1/320" : "1/125",
    iso: index % 4 === 0 ? 400 : 100,
    rating,
    flag,
    colorLabel: labels[index % labels.length],
    edited: index % 3 === 0,
    keywords: [
      "landscape",
      tones[index % tones.length],
      index % 2 ? "travel" : "personal",
    ],
    develop:
      index === 0
        ? {
            ...defaults,
            exposure: 18,
            contrast: 10,
            highlights: -20,
            shadows: 25,
            vibrance: 12,
          }
        : { ...defaults },
  }
})
