import { create } from "zustand"
import { browserCatalogGateway } from "./browserCatalogGateway"
import type { CatalogGateway } from "./catalogGateway"
import { log } from "./diagnostics"
import { isTauri } from "../native/ipc"
import { tauriCatalogGateway } from "./tauriCatalogGateway"
import { initialState, reducer, toSnapshot, type Action, type SaveStatus, type State } from "./reducer"
import type { Photo } from "./types"

type StoreState = State & {
  hydrated: boolean
  saveStatus: SaveStatus
  gateway: CatalogGateway
  dispatch: (action: Action) => void
}

export const useCatalogStore = create<StoreState>()((set) => ({
  ...initialState,
  hydrated: false,
  saveStatus: "saved",
  gateway: browserCatalogGateway,
  dispatch: (action) => set((state) => reducer(state, action)),
}))

const SAVED_KEYS = ["photos", "history", "snapshots", "compareIds", "compareWinner", "preferences", "sort", "activeId"] as const

const defaultGateway = (): CatalogGateway => (isTauri() ? tauriCatalogGateway : browserCatalogGateway)

// Loads the catalog, then persists changes (debounced) and flushes on pagehide.
export function startCatalog(gateway: CatalogGateway = defaultGateway()) {
  const store = useCatalogStore
  store.setState({ gateway, hydrated: false, saveStatus: "saved" })
  let live = true
  let timer: number | undefined
  let unsubscribe: (() => void) | undefined

  const persist = () => {
    store.setState({ saveStatus: "saving" })
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      gateway
        .save(toSnapshot(store.getState()))
        .then(() => store.setState({ saveStatus: "saved" }))
        .catch((error) => {
          log("error", "catalog", "Save failed", error)
          store.setState({ saveStatus: "error" })
        })
    }, 500)
  }
  const flush = () => void gateway.save(toSnapshot(store.getState())).catch(() => {})

  gateway
    .load()
    .then((snapshot) => {
      if (live && snapshot) store.getState().dispatch({ type: "HYDRATE", snapshot })
    })
    .catch((error) => {
      log("error", "catalog", "Hydrate failed", error)
      if (live) store.setState({ saveStatus: "error" })
    })
    .finally(() => {
      if (!live) return
      store.setState({ hydrated: true })
      unsubscribe = store.subscribe((state, prev) => {
        if (SAVED_KEYS.some((key) => state[key] !== prev[key])) persist()
      })
      window.addEventListener("pagehide", flush)
    })

  return () => {
    live = false
    window.clearTimeout(timer)
    unsubscribe?.()
    window.removeEventListener("pagehide", flush)
  }
}

export const RECENT_COUNT = 12
export const recentThreshold = (photos: Photo[]) =>
  [...photos].map((p) => p.id).sort((a, b) => b - a)[RECENT_COUNT - 1] ?? 0

let prevPhotosRef: Photo[] | null = null
let prevFiltersRef: Filters | null = null
let prevGroupRawJpeg: boolean | null = null
let prevSortRef: SortKey | null = null
let cachedVisiblePhotos: Photo[] = []

export function selectVisiblePhotos(state: State): Photo[] {
  const { filters, preferences, sort, photos } = state

  // Fast path: if state slices affecting visibility haven't changed, reuse cached array
  if (
    photos === prevPhotosRef &&
    filters === prevFiltersRef &&
    preferences.groupRawJpeg === prevGroupRawJpeg &&
    sort === prevSortRef
  ) {
    return cachedVisiblePhotos
  }

  const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean)
  const recentFloor = recentThreshold(photos)
  const visible = photos.filter((photo) => {
    if (terms.length) {
      const hay = [photo.name, photo.camera, photo.lens, photo.format, photo.tone, ...photo.keywords]
        .join(" ")
        .toLowerCase()
      if (!terms.every((t) => hay.includes(t))) return false
    }
    if (filters.collection === "recent" && photo.id < recentFloor) return false
    if (filters.collection === "unrated" && photo.rating) return false
    if (filters.rating && photo.rating < filters.rating) return false
    if (filters.flag !== "all" && photo.flag !== filters.flag) return false
    if (filters.format !== "all" && photo.format !== filters.format) return false
    if (filters.editedOnly && !photo.edited) return false
    if (preferences.groupRawJpeg && photo.groupId && !photo.isGroupLead) return false
    return true
  })
  const sorted = visible.sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating
    if (sort === "name") return a.name.localeCompare(b.name)
    return b.id - a.id
  })

  prevPhotosRef = photos
  prevFiltersRef = filters
  prevGroupRawJpeg = preferences.groupRawJpeg
  prevSortRef = sort
  cachedVisiblePhotos = sorted

  return sorted
}

export const selectActivePhoto = (state: State): Photo =>
  state.photos.find((photo) => photo.id === state.activeId) ?? state.photos[0]

// Recipe slice: the active photo's develop recipe and its undo/redo state.
export function useRecipeStore() {
  const dispatch = useCatalogStore((s) => s.dispatch)
  const activeId = useCatalogStore((s) => s.activeId)
  const history = useCatalogStore((s) => s.history[s.activeId])
  const photo = useCatalogStore(selectActivePhoto)
  return {
    dispatch,
    activeId,
    recipe: photo.develop,
    canUndo: !!history && history.index > 0,
    canRedo: !!history && history.index < history.entries.length - 1,
  }
}
