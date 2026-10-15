import { DEVELOP_LABELS, migrateDevelop, NEUTRAL, isNeutral, presetDevelop } from "./develop"
import { baseOf, type NewPhoto } from "./raw"
import { initialPhotos } from "./catalog"
import { CATALOG_VERSION, type CatalogSnapshot } from "../native/contracts"
import type {
  ColorLabel,
  DevelopSnapshot,
  DevelopValues,
  Filters,
  Flag,
  HistoryEntry,
  Photo,
  PhotoHistory,
  Preferences,
  SortKey,
} from "./types"

export type SaveStatus = "saved" | "saving" | "error"

export type State = {
  photos: Photo[]
  selectedIds: number[]
  activeId: number
  compareIds: number[]
  compareWinner?: number
  filters: Filters
  sort: SortKey
  preferences: Preferences
  history: Record<number, PhotoHistory>
  snapshots: Record<number, DevelopSnapshot[]>
}

export type Action =
  | { type: "SELECT"; id: number; multiple?: boolean }
  | { type: "RATE"; id: number; rating: number }
  | { type: "FLAG"; id: number; flag: Flag }
  | { type: "LABEL"; id: number; label: ColorLabel }
  | { type: "FILTER"; patch: Partial<Filters> }
  | { type: "SORT"; sort: State["sort"] }
  | { type: "IMPORT"; photos: NewPhoto[] }
  | { type: "COMPARE_TOGGLE"; id: number }
  | { type: "COMPARE_WINNER"; id: number }
  | {
      type: "DEVELOP"
      id: number
      key: keyof DevelopValues
      value: number | boolean | string
      at: number
    }
  | { type: "RESET_DEVELOP"; id: number; at: number }
  | {
      type: "PRESET"
      id: number
      name: string
      values: Partial<DevelopValues>
      at: number
    }
  | { type: "PASTE_RECIPE"; ids: number[]; values: Partial<DevelopValues>; at: number }
  | { type: "KEYWORD"; id: number; op: "add" | "remove"; keyword: string }
  | { type: "UNDO"; id: number }
  | { type: "REDO"; id: number }
  | { type: "HISTORY_GOTO"; id: number; index: number }
  | { type: "SNAPSHOT_CREATE"; id: number; snapshotId: string; name: string; at: number }
  | { type: "SNAPSHOT_APPLY"; id: number; snapshotId: string; at: number }
  | { type: "SNAPSHOT_DELETE"; id: number; snapshotId: string }
  | { type: "HYDRATE"; snapshot: CatalogSnapshot }
  | {
      type: "PREFERENCE"
      key: keyof Preferences
      value: Preferences[keyof Preferences]
    }

export const NO_FILTERS: Filters = {
  rating: 0, flag: "all", format: "all", editedOnly: false, query: "", collection: "all",
}

export const initialState: State = {
  photos: initialPhotos,
  selectedIds: [1],
  activeId: 1,
  compareIds: [1, 3],
  filters: { ...NO_FILTERS },
  sort: "capture",
  history: {},
  snapshots: {},
  preferences: {
    groupRawJpeg: true,
    autoAdvance: true,
    cachePreviews: true,
    gpuAcceleration: true,
    importMode: "reference",
    density: "comfortable",
  },
}

const COALESCE_MS = 1000

function historyOf(state: State, photo: Photo): PhotoHistory {
  return (
    state.history[photo.id] ?? {
      entries: [{ label: "Original", at: 0, develop: photo.develop }],
      index: 0,
    }
  )
}

function withDevelop(state: State, id: number, develop: DevelopValues): State["photos"] {
  return state.photos.map((p) =>
    p.id === id ? { ...p, develop, edited: !isNeutral(develop) } : p,
  )
}

function commit(
  state: State,
  id: number,
  develop: DevelopValues,
  label: string,
  at: number,
  key?: string,
): State {
  const photo = state.photos.find((p) => p.id === id)
  if (!photo) return state
  const h = historyOf(state, photo)
  const top = h.entries[h.index]
  if (JSON.stringify(top.develop) === JSON.stringify(develop)) return state
  const atTop = h.index === h.entries.length - 1
  let entries: HistoryEntry[]
  if (key && atTop && h.index > 0 && top.key === key && at - top.at < COALESCE_MS)
    entries = [...h.entries.slice(0, h.index), { label, key, at, develop }]
  else entries = [...h.entries.slice(0, h.index + 1), { label, key, at, develop }]
  return {
    ...state,
    photos: withDevelop(state, id, develop),
    history: { ...state.history, [id]: { entries, index: entries.length - 1 } },
  }
}

function jump(state: State, id: number, index: number): State {
  const photo = state.photos.find((p) => p.id === id)
  if (!photo) return state
  const h = historyOf(state, photo)
  if (index < 0 || index >= h.entries.length || index === h.index) return state
  return {
    ...state,
    photos: withDevelop(state, id, h.entries[index].develop),
    history: { ...state.history, [id]: { ...h, index } },
  }
}

export function reducer(state: State, action: Action): State {

  switch (action.type) {
    case "HYDRATE": {
      const s = action.snapshot
      return {
        ...state,
        photos: s.photos.map((p) => ({ ...p, develop: migrateDevelop(p.develop) })),
        history: Object.fromEntries(
          Object.entries(s.history ?? {}).map(([id, h]) => [
            id,
            { ...h, entries: h.entries.map((e) => ({ ...e, develop: e.develop && migrateDevelop(e.develop) })) },
          ]),
        ),
        snapshots: Object.fromEntries(
          Object.entries(s.snapshots ?? {}).map(([id, list]) => [
            id,
            list.map((x) => ({ ...x, develop: migrateDevelop(x.develop) })),
          ]),
        ),
        compareIds: s.compareIds,
        compareWinner: s.compareWinner,
        preferences: { ...state.preferences, ...s.preferences },
        sort: s.sort,
        activeId: s.photos.some((p) => p.id === s.activeId)
          ? s.activeId
          : (s.photos[0]?.id ?? state.activeId),
        selectedIds: [s.photos.some((p) => p.id === s.activeId) ? s.activeId : (s.photos[0]?.id ?? state.activeId)],
      }
    }
    case "DEVELOP": {
      const photo = state.photos.find((p) => p.id === action.id)
      if (!photo) return state
      const value = typeof action.value === "number" ? Math.round(action.value) : action.value
      const formatted =
        typeof value === "number"
          ? `${value > 0 ? "+" : ""}${value}`
          : typeof value === "boolean"
            ? value
              ? "On"
              : "Off"
            : String(value)
      return commit(
        state,
        action.id,
        { ...photo.develop, [action.key]: value },
        `${DEVELOP_LABELS[action.key] ?? String(action.key)}: ${formatted}`,
        action.at,
        action.key,
      )
    }
    case "RESET_DEVELOP":
      return commit(state, action.id, { ...NEUTRAL }, "Reset all", action.at)
    case "PRESET": {
      const photo = state.photos.find((p) => p.id === action.id)
      if (!photo) return state
      return commit(
        state,
        action.id,
        presetDevelop(photo.develop, action.values),
        `Preset: ${action.name}`,
        action.at,
      )
    }
    case "KEYWORD": {
      const kw = action.keyword.trim().toLowerCase()
      if (!kw) return state
      return {
        ...state,
        photos: state.photos.map((p) => {
          if (p.id !== action.id) return p
          const rest = p.keywords.filter((k) => k !== kw)
          return { ...p, keywords: action.op === "add" ? [...rest, kw] : rest }
        }),
      }
    }
    case "PASTE_RECIPE": {
      return action.ids.reduce((acc, id) => {
        const photo = acc.photos.find((p) => p.id === id)
        if (!photo) return acc
        return commit(acc, id, presetDevelop(photo.develop, action.values), "Paste settings", action.at)
      }, state)
    }
    case "UNDO":
    case "REDO": {
      const photo = state.photos.find((p) => p.id === action.id)
      if (!photo) return state
      return jump(state, action.id, historyOf(state, photo).index + (action.type === "UNDO" ? -1 : 1))
    }
    case "HISTORY_GOTO":
      return jump(state, action.id, action.index)
    case "SNAPSHOT_CREATE": {
      const photo = state.photos.find((p) => p.id === action.id)
      if (!photo) return state
      const list = state.snapshots[action.id] ?? []
      return {
        ...state,
        snapshots: {
          ...state.snapshots,
          [action.id]: [
            { id: action.snapshotId, name: action.name || `Snapshot ${list.length + 1}`, at: action.at, develop: photo.develop },
            ...list,
          ],
        },
      }
    }
    case "SNAPSHOT_DELETE":
      return {
        ...state,
        snapshots: {
          ...state.snapshots,
          [action.id]: (state.snapshots[action.id] ?? []).filter((x) => x.id !== action.snapshotId),
        },
      }
    case "SNAPSHOT_APPLY": {
      const snap = (state.snapshots[action.id] ?? []).find((x) => x.id === action.snapshotId)
      return snap
        ? commit(state, action.id, { ...snap.develop }, `Snapshot: ${snap.name}`, action.at)
        : state
    }
    case "SELECT": {
      const selectedIds = action.multiple
        ? state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id]
        : [action.id]
      return { ...state, activeId: action.id, selectedIds }
    }
    case "FILTER":
      return { ...state, filters: { ...state.filters, ...action.patch } }
    case "SORT":
      return { ...state, sort: action.sort }
    case "IMPORT": {
      const existing = new Set(state.photos.map((p) => `${p.name}|${p.fileSize}`))
      let nextId = Math.max(0, ...state.photos.map((p) => p.id)) + 1
      const added: Photo[] = action.photos
        .filter((p) => !existing.has(`${p.name}|${p.fileSize}`))
        .map((p) => ({ ...p, id: nextId++ }))
      if (!added.length) return state
      const all = [...state.photos, ...added]
      const byBase = new Map<string, Photo[]>()
      all.forEach((p) => {
        const key = baseOf(p.name)
        byBase.set(key, [...(byBase.get(key) ?? []), p])
      })
      const grouped = new Map<number, Photo>()
      byBase.forEach((members, key) => {
        const raw = members.find((m) => m.format === "RAW")
        const jpeg = members.find((m) => m.format === "JPEG")
        if (!raw || !jpeg || raw.groupId || jpeg.groupId) return
        if (!added.includes(raw) && !added.includes(jpeg)) return
        const groupId = `capture-imp-${key}`
        grouped.set(raw.id, { ...raw, groupId, isGroupLead: true })
        grouped.set(jpeg.id, { ...jpeg, groupId, isGroupLead: false })
      })
      return {
        ...state,
        photos: all.map((p) => grouped.get(p.id) ?? p),
        activeId: added[0].id,
        selectedIds: [added[0].id],
      }
    }
    case "COMPARE_TOGGLE": {
      if (state.compareIds.includes(action.id)) {
        if (state.compareIds.length <= 2) return state
        return {
          ...state,
          compareIds: state.compareIds.filter((id) => id !== action.id),
          compareWinner:
            state.compareWinner === action.id ? undefined : state.compareWinner,
        }
      }
      if (state.compareIds.length >= 4) return state
      return { ...state, compareIds: [...state.compareIds, action.id] }
    }
    case "COMPARE_WINNER":
      return {
        ...state,
        compareWinner: state.compareWinner === action.id ? undefined : action.id,
      }
    case "PREFERENCE":
      return {
        ...state,
        preferences: { ...state.preferences, [action.key]: action.value },
      }
    case "RATE":
    case "FLAG":
    case "LABEL":
      return {
        ...state,
        photos: state.photos.map((photo) => {
          if (photo.id !== action.id) return photo
          if (action.type === "RATE") return { ...photo, rating: action.rating }
          if (action.type === "FLAG") return { ...photo, flag: action.flag }
          if (action.type === "LABEL") return { ...photo, colorLabel: action.label }
          return photo
        }),
      }
    default:
      return state
  }

}

export const toSnapshot = (state: State): CatalogSnapshot => ({
  version: CATALOG_VERSION,
  photos: state.photos,
  history: state.history,
  snapshots: state.snapshots,
  compareIds: state.compareIds,
  compareWinner: state.compareWinner,
  preferences: state.preferences,
  sort: state.sort,
  activeId: state.activeId,
})
