import type {
  DevelopSnapshot,
  Photo,
  PhotoHistory,
  Preferences,
  SortKey,
} from "../app/types"

export const CATALOG_VERSION = 1

// Serializable catalog state exchanged with a gateway. `Photo.previewUrl` is
// runtime-only: gateways persist preview bytes separately and restore the URL on load.
export type CatalogSnapshot = {
  version: number
  photos: Photo[]
  history: Record<number, PhotoHistory>
  snapshots: Record<number, DevelopSnapshot[]>
  compareIds: number[]
  compareWinner?: number
  preferences: Preferences
  sort: SortKey
  activeId: number
}

// ---- Tauri IPC command contracts (guide §8.2) ----
export type ImageId = string
export type Recipe = import("../app/types").DevelopValues
export type ImportOptions = { mode: "reference" | "copy"; recursive?: boolean }
export type ImportResult = { imported: number; skipped: number; failed: string[] }
export type SearchQuery = { text?: string; keywords?: string[]; minRating?: number; page: number; pageSize: number }
export type CatalogPage = { photos: import("../app/types").Photo[]; total: number; page: number }
export type ImageMetadata = {
  camera: string
  lens: string
  aperture: string
  shutter: string
  iso: number
  capturedAt: string
  keywords: string[]
}
export type Preset = { id: string; name: string; category: string; recipe: Recipe }

export type TauriCommands = {
  load_catalog: { args: Record<string, never>; result: string | null }
  save_catalog: { args: { snapshot: string }; result: void }
  clear_catalog: { args: Record<string, never>; result: void }
  render_preview: { args: { image_id: ImageId; recipe: Recipe; scale: number }; result: Uint8Array }
  render_full: { args: { image_id: ImageId; recipe: Recipe; format: "jpeg" | "tiff" }; result: string }
  import_folder: { args: { folder_path: string; options: ImportOptions }; result: ImportResult }
  get_catalog: { args: { page: number; page_size: number }; result: CatalogPage }
  search_catalog: { args: { query: SearchQuery }; result: CatalogPage }
  get_metadata: { args: { image_id: ImageId }; result: ImageMetadata }
  apply_preset: { args: { image_id: ImageId; preset_id: string }; result: Recipe }
  get_presets: { args: { category?: string }; result: Preset[] }
  save_preset: { args: { name: string; category: string; recipe: Recipe }; result: Preset }
}
