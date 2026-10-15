import { CATALOG_VERSION, type CatalogSnapshot } from "../native/contracts"
import { invoke } from "../native/ipc"
import {
  browserCatalogGateway,
  importAndStorePreviews,
  restorePreviews,
} from "./browserCatalogGateway"
import type { CatalogGateway } from "./catalogGateway"
import { log } from "./diagnostics"

// SQLite (via the Rust core) is authoritative for the catalog. Preview blobs and file
// import still use the webview's IndexedDB until the Rust import/preview pipeline exists.
export const tauriCatalogGateway: CatalogGateway = {
  async load() {
    const json = await invoke("load_catalog", {})
    if (json) {
      const snapshot = JSON.parse(json) as CatalogSnapshot
      if (snapshot.version !== CATALOG_VERSION) return null
      return restorePreviews(snapshot)
    }
    // First desktop launch: adopt a catalog left behind by the browser build, if any.
    const legacy = await browserCatalogGateway.load().catch(() => null)
    if (legacy) {
      log("info", "catalog", "migrating browser catalog into SQLite")
      await tauriCatalogGateway.save(legacy)
    }
    return legacy
  },

  async save(snapshot) {
    const clean: CatalogSnapshot = {
      ...snapshot,
      version: CATALOG_VERSION,
      photos: snapshot.photos.map((p) => ({ ...p, previewUrl: undefined })),
    }
    await invoke("save_catalog", { snapshot: JSON.stringify(clean) })
  },

  importFiles: importAndStorePreviews,

  async reset() {
    await invoke("clear_catalog", {})
    await browserCatalogGateway.reset()
  },
}
