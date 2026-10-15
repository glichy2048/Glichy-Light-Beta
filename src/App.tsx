import { useEffect, useMemo, useRef, useState } from "react"
import { AppStateProvider, useAppState } from "./app/AppState"
import type { DevelopValues, View } from "./app/types"
import { TONE_KEYS } from "./app/develop"
import { AppHeader } from "./components/AppHeader"
import { LibraryScreen } from "./screens/LibraryScreen"
import { ReviewScreen } from "./screens/ReviewScreen"
import { CompareScreen } from "./screens/CompareScreen"
import { DevelopScreen } from "./screens/DevelopScreen"
import { ExportScreen } from "./screens/ExportScreen"
import { SettingsScreen } from "./screens/SettingsScreen"
import { SystemScreen } from "./screens/SystemScreen"

const valid: View[] = [
  "library",
  "review",
  "compare",
  "develop",
  "export",
  "settings",
  "system",
]

function GlichylightApp() {
  const initial = useMemo(() => {
    const hash = window.location.hash.slice(1) as View
    return valid.includes(hash) ? hash : "library"
  }, [])
  const [view, setView] = useState<View>(initial)
  const navigate = (next: View) => {
    setView(next)
    window.location.hash = next
  }
  const { dispatch, activeId, activePhoto, selectedIds } = useAppState()
  const copied = useRef<Partial<DevelopValues> | null>(null)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement
      if (el.matches("input, textarea, select")) return
      const key = event.key.toLowerCase()
      if (event.metaKey || event.ctrlKey) {
        if (key === "z" || key === "y") {
          event.preventDefault()
          dispatch({ type: key === "y" || event.shiftKey ? "REDO" : "UNDO", id: activeId })
        } else if (key === "c" && !event.shiftKey && !window.getSelection()?.toString()) {
          event.preventDefault()
          copied.current = Object.fromEntries(TONE_KEYS.map((k) => [k, activePhoto.develop[k]]))
        } else if (key === "v" && !event.shiftKey && copied.current) {
          event.preventDefault()
          const ids = selectedIds.length ? selectedIds : [activeId]
          dispatch({ type: "PASTE_RECIPE", ids, values: copied.current, at: Date.now() })
        }
        return
      }
      if (event.altKey) return
      const views: Record<string, View> = { g: "library", e: "review", d: "develop", c: "compare" }
      if (views[key]) navigate(views[key])
      else if (key === "j") dispatch({ type: "FLAG", id: activeId, flag: "reject" })
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.slice(1) as View
      if (valid.includes(hash)) setView(hash)
    }
    window.addEventListener("hashchange", handler)
    return () => window.removeEventListener("hashchange", handler)
  }, [])
  return (
    <div className="app-shell">
      <AppHeader view={view} navigate={navigate} />
      {view === "library" && <LibraryScreen navigate={navigate} />}
      {view === "review" && <ReviewScreen />}
      {view === "compare" && <CompareScreen navigate={navigate} />}
      {view === "develop" && <DevelopScreen navigate={navigate} />}
      {view === "export" && <ExportScreen />}
      {view === "settings" && <SettingsScreen navigate={navigate} />}
      {view === "system" && <SystemScreen navigate={navigate} />}
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <GlichylightApp />
    </AppStateProvider>
  )
}

