import { useEffect, useMemo, type ReactNode } from "react"
import type { CatalogGateway } from "./catalogGateway"
import { selectActivePhoto, selectVisiblePhotos, startCatalog, useCatalogStore } from "./store"

export { initialState, reducer } from "./reducer"
export type { SaveStatus } from "./reducer"

export function AppStateProvider({
  children,
  gateway,
}: {
  children: ReactNode
  gateway?: CatalogGateway
}) {
  const hydrated = useCatalogStore((s) => s.hydrated)
  useEffect(() => startCatalog(gateway), [gateway])
  if (!hydrated) return <div className="boot-splash">Opening catalog…</div>
  return <>{children}</>
}

// Compatibility facade over the Zustand store; new code should select slices from ./store.
export function useAppState() {
  const state = useCatalogStore()
  return useMemo(() => {
    const h = state.history[state.activeId]
    return {
      ...state,
      canUndo: !!h && h.index > 0,
      canRedo: !!h && h.index < h.entries.length - 1,
      activePhoto: selectActivePhoto(state),
      visiblePhotos: selectVisiblePhotos(state),
    }
  }, [state])
}
