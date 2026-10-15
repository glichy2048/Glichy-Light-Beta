import { CATALOG_VERSION, type CatalogSnapshot } from "../native/contracts"
import type { CatalogGateway } from "./catalogGateway"
import { importFiles } from "./raw"
import type { Photo } from "./types"

const DB_NAME = "glichylight"
const CATALOG = "catalog"
const PREVIEWS = "previews"

const previewKey = (p: Pick<Photo, "name" | "fileSize">) =>
  `${p.name}|${p.fileSize}`

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("IndexedDB unavailable"))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(CATALOG)
      req.result.createObjectStore(PREVIEWS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode)
      const req = fn(tx.objectStore(store))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const browserCatalogGateway: CatalogGateway = {
  async load() {
    const snapshot = await run<CatalogSnapshot | undefined>(CATALOG, "readonly", (s) =>
      s.get("snapshot"),
    )
    if (!snapshot || snapshot.version !== CATALOG_VERSION) return null
    return restorePreviews(snapshot)
  },

  save: saveSnapshot,

  async importFiles(files, onProgress) {
    return importAndStorePreviews(files, onProgress)
  },

  async reset() {
    await run(CATALOG, "readwrite", (s) => s.clear())
    await run(PREVIEWS, "readwrite", (s) => s.clear())
  },
}

// Reattaches preview blob URLs (kept in IndexedDB) to a loaded snapshot.
export async function restorePreviews(snapshot: CatalogSnapshot): Promise<CatalogSnapshot> {
  {
    const keys = new Set(
      await run<IDBValidKey[]>(PREVIEWS, "readonly", (s) => s.getAllKeys()),
    )
    const urls = new Map<string, string>()
    for (const photo of snapshot.photos) {
      const key = previewKey(photo)
      if (!keys.has(key)) continue
      if (!urls.has(key)) {
        const blob = await run<Blob | undefined>(PREVIEWS, "readonly", (s) => s.get(key))
        if (blob) urls.set(key, URL.createObjectURL(blob))
      }
      photo.previewUrl = urls.get(key)
    }
    return snapshot
  }
}

export async function saveSnapshot(snapshot: CatalogSnapshot) {
    const clean: CatalogSnapshot = {
      ...snapshot,
      version: CATALOG_VERSION,
      photos: snapshot.photos.map((p) => ({ ...p, previewUrl: undefined })),
    }
    await run(CATALOG, "readwrite", (s) => s.put(clean, "snapshot"))
  }

export async function importAndStorePreviews(
  files: File[],
  onProgress?: (done: number, total: number) => void,
) {
    const result = await importFiles(files, onProgress)
    for (const photo of result.photos) {
      if (!photo.previewUrl) continue
      try {
        const blob = await (await fetch(photo.previewUrl)).blob()
        await run(PREVIEWS, "readwrite", (s) => s.put(blob, previewKey(photo)))
      } catch {
        // Preview stays usable this session even if it can't be persisted.
      }
    }
    return result
  }
