import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CATALOG_VERSION } from "../src/native/contracts"
import { isTauri } from "../src/native/ipc"
import { tauriCatalogGateway } from "../src/app/tauriCatalogGateway"
import { initialState, toSnapshot } from "../src/app/reducer"

const calls: [string, any][] = []
let stored: string | null = null

beforeEach(() => {
  calls.length = 0
  stored = null
  vi.stubGlobal("window", {
    __TAURI_INTERNALS__: {
      invoke: async (cmd: string, args: any) => {
        calls.push([cmd, args])
        if (cmd === "load_catalog") return stored
        if (cmd === "save_catalog") stored = args.snapshot
      },
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe("tauriCatalogGateway", () => {
  it("detects the native bridge", () => {
    expect(isTauri()).toBe(true)
  })

  it("saves a JSON snapshot without runtime-only preview URLs", async () => {
    const snap = toSnapshot(initialState)
    snap.photos[0] = { ...snap.photos[0], previewUrl: "blob:x" }
    await tauriCatalogGateway.save(snap)
    const saved = JSON.parse(stored!)
    expect(saved.version).toBe(CATALOG_VERSION)
    expect(saved.photos[0].previewUrl).toBeUndefined()
    expect(saved.photos).toHaveLength(snap.photos.length)
  })

  it("returns null for a catalog with a different schema version", async () => {
    stored = JSON.stringify({ ...toSnapshot(initialState), version: CATALOG_VERSION + 1 })
    expect(await tauriCatalogGateway.load()).toBeNull()
  })
})
