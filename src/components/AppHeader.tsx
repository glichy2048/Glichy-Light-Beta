import { useAppState } from "../app/AppState"
import type { View } from "../app/types"
import { type IconName,Icon,Button } from "./ui"

export function AppHeader({
  view,
  navigate,
}: {
  view: View
  navigate: (view: View) => void
}) {
  const { dispatch, activeId, canUndo, canRedo, saveStatus } = useAppState()
  const items: { id: View; label: string; icon: IconName }[] = [
    { id: "library", label: "Library", icon: "grid" },
    { id: "review", label: "Review", icon: "review" },
    { id: "compare", label: "Compare", icon: "compare" },
    { id: "develop", label: "Develop", icon: "sliders" },
  ]
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <Icon name="aperture" size={24} />
        </span>
        <span
          className={`brand-name ${view === "export" ? "brand-name--export-edit" : ""}`}
        >
          Glichy Light
        </span>
      </div>
      <nav className="main-nav" aria-label="Primary workspace">
        {items.map((item) => (
          <Button
            key={item.id}
            className={`nav-item ${view === item.id ? "active" : ""}`}
            onClick={() => navigate(item.id)}
            pressed={view === item.id}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Button>
        ))}
      </nav>
      <div className="header-actions">
        <span className="sync-state">
          <i className={saveStatus} />
          {saveStatus === "saved"
            ? "Catalog saved"
            : saveStatus === "saving"
              ? "Saving…"
              : "Save failed"}
        </span>
        <Button
          className="icon-btn"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => dispatch({ type: "UNDO", id: activeId })}
        >
          <Icon name="undo" />
        </Button>
        <Button
          className="icon-btn"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={() => dispatch({ type: "REDO", id: activeId })}
        >
          <Icon name="redo" />
        </Button>
        <Button
          className="primary-btn export-action"
          onClick={() => navigate("export")}
        >
          <Icon name="export" size={15} />
          Export
        </Button>
        <Button
          className={`icon-btn ${
            view === "settings" || view === "system" ? "active" : ""
          }`}
          onClick={() => navigate("settings")}
          title="Settings"
        >
          <Icon name="settings" />
        </Button>
        <span className="avatar">AR</span>
      </div>
    </header>
  )
}

