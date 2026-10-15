export type View = "library" | "review" | "compare" | "develop" | "export" | "settings" | "system"
export type Flag = "unflagged" | "pick" | "reject"
export type ColorLabel = "none" | "red" | "yellow" | "green" | "blue" | "purple"
export type PhotoFormat = "RAW" | "JPEG"
export type Tone = "sunset" | "coast" | "lake" | "dunes" | "fog" | "forest" | "night" | "desert"

export type DevelopValues = {
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  whites: number
  blacks: number

  temperature: number
  tint: number
  vibrance: number
  saturation: number

  hueRed: number
  satRed: number
  lumRed: number
  hueOrange: number
  satOrange: number
  lumOrange: number
  hueYellow: number
  satYellow: number
  lumYellow: number
  hueGreen: number
  satGreen: number
  lumGreen: number
  hueAqua: number
  satAqua: number
  lumAqua: number
  hueBlue: number
  satBlue: number
  lumBlue: number
  huePurple: number
  satPurple: number
  lumPurple: number
  hueMagenta: number
  satMagenta: number
  lumMagenta: number

  curveHighlights: number
  curveLights: number
  curveDarks: number
  curveShadows: number

  clarity: number
  sharpening: number
  sharpRadius: number
  sharpDetail: number
  noise: number
  noiseColor: number

  lensProfile: boolean
  lensModel: string
  chromaticAberration: boolean
  defringe: number
  distortion: number
  vignetting: number
  vignetteMidpoint: number

  rotation: number
  vertical: number
}

export type Photo = {
  id: number
  name: string
  tone: Tone
  format: PhotoFormat
  groupId?: string
  isGroupLead?: boolean
  date: string
  camera: string
  lens: string
  dimensions: string
  fileSize: string
  aperture: string
  shutter: string
  iso: number
  rating: number
  flag: Flag
  colorLabel: ColorLabel
  edited: boolean
  keywords: string[]
  develop: DevelopValues
  previewUrl?: string
}

export type Filters = {
  rating: number
  flag: Flag | "all"
  format: PhotoFormat | "all"
  editedOnly: boolean
  query: string
  collection: "all" | "recent" | "unrated"
}

export type Preferences = {
  groupRawJpeg: boolean
  autoAdvance: boolean
  cachePreviews: boolean
  gpuAcceleration: boolean
  importMode: "reference" | "copy"
  density: "compact" | "comfortable"
}

export type SortKey = "capture" | "rating" | "name"

export type HistoryEntry = {
  label: string
  key?: string
  at: number
  develop: DevelopValues
}
export type PhotoHistory = { entries: HistoryEntry[]; index: number }
export type DevelopSnapshot = {
  id: string
  name: string
  at: number
  develop: DevelopValues
}
