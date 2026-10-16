import {
  useEffect,
  useRef,
  useState,
} from "react"
import {
NEUTRAL,
PRESETS,approxFilter,matchesPreset,LENS_PROFILES
} from "../app/develop"
import { useAppState } from "../app/AppState"
import type { Photo,View } from "../app/types"
import { Icon, Button, PhotoArt, Histogram, ScreenBar, Filmstrip, Slider, Toggle } from "../components/ui"
import { DevelopedImage } from "../components/DevelopedImage"
import { LightPanel } from "../components/develop-panels/LightPanel"
import { ColorPanel } from "../components/develop-panels/ColorPanel"
import { ToneCurvePanel } from "../components/develop-panels/ToneCurvePanel"
import { DetailPanel } from "../components/develop-panels/DetailPanel"
import { OpticsPanel } from "../components/develop-panels/OpticsPanel"
import { LocalAdjPanel } from "../components/develop-panels/LocalAdjPanel"
import { AiPanel } from "../components/develop-panels/AiPanel"
import { RawPanel } from "../components/develop-panels/RawPanel"
import type { DevelopValues } from "../app/types"

export type AspectPreset = {
  id: string
  label: string
  shortLabel: string
  ratio: number | null
  description: string
}

export const CROP_ASPECT_PRESETS: AspectPreset[] = [
  { id: "original", label: "Original (As Shot)", shortLabel: "Original", ratio: 3 / 2, description: "Maintains camera aspect ratio" },
  { id: "1:1", label: "1:1 Square (1:1)", shortLabel: "1:1", ratio: 1, description: "Square format for social media & profile pictures" },
  { id: "4:5", label: "4:5 Portrait (8:10)", shortLabel: "4:5", ratio: 4 / 5, description: "Instagram portrait standard" },
  { id: "5:4", label: "5:4 Landscape (8:10)", shortLabel: "5:4", ratio: 5 / 4, description: "Standard 8x10 print format" },
  { id: "16:9", label: "16:9 Widescreen", shortLabel: "16:9", ratio: 16 / 9, description: "HD display & YouTube standard" },
  { id: "9:16", label: "9:16 Vertical (Stories / Reels)", shortLabel: "9:16", ratio: 9 / 16, description: "TikTok & Instagram Stories / Reels" },
  { id: "4:3", label: "4:3 Standard (Micro 4/3)", shortLabel: "4:3", ratio: 4 / 3, description: "Medium format & tablet displays" },
  { id: "3:4", label: "3:4 Vertical (Micro 4/3)", shortLabel: "3:4", ratio: 3 / 4, description: "Vertical tablet & portrait print" },
  { id: "3:2", label: "3:2 35mm DSLR", shortLabel: "3:2", ratio: 3 / 2, description: "Classic 35mm DSLR / film frame" },
  { id: "2:3", label: "2:3 35mm Vertical", shortLabel: "2:3", ratio: 2 / 3, description: "Vertical 35mm portrait" },
  { id: "7:5", label: "7:5 Print (5x7 in)", shortLabel: "7:5", ratio: 7 / 5, description: "Standard 5x7 inch print" },
  { id: "5:7", label: "5:7 Print Vertical", shortLabel: "5:7", ratio: 5 / 7, description: "Vertical 5x7 inch print" },
  { id: "2:1", label: "2:1 Univisium (Cinema)", shortLabel: "2:1", ratio: 2 / 1, description: "Cinematic widescreen banner" },
  { id: "custom", label: "Custom (Freeform)", shortLabel: "Custom", ratio: null, description: "Unconstrained aspect ratio" },
]

export const ASPECT_FLIP_MAP: Record<string, string> = {
  "4:5": "5:4",
  "5:4": "4:5",
  "16:9": "9:16",
  "9:16": "16:9",
  "4:3": "3:4",
  "3:4": "4:3",
  "3:2": "2:3",
  "2:3": "3:2",
  "7:5": "5:7",
  "5:7": "7:5",
  "original": "2:3",
}

function getCropBoxStyle(aspectId: string): React.CSSProperties {
  const preset = CROP_ASPECT_PRESETS.find((p) => p.id === aspectId)
  if (!preset || preset.ratio === null) {
    return {
      top: "6%",
      bottom: "6%",
      left: "6%",
      right: "6%",
    }
  }

  const baseRatio = 1.5 // 3:2 standard photo aspect ratio
  const targetRatio = preset.ratio

  if (targetRatio >= baseRatio) {
    const widthPct = 92
    const heightPct = (widthPct * baseRatio) / targetRatio
    const topBottomInset = (100 - heightPct) / 2
    const leftRightInset = (100 - widthPct) / 2
    return {
      top: `${topBottomInset.toFixed(2)}%`,
      bottom: `${topBottomInset.toFixed(2)}%`,
      left: `${leftRightInset.toFixed(2)}%`,
      right: `${leftRightInset.toFixed(2)}%`,
    }
  } else {
    const heightPct = 90
    const widthPct = (heightPct * targetRatio) / baseRatio
    const topBottomInset = (100 - heightPct) / 2
    const leftRightInset = (100 - widthPct) / 2
    return {
      top: `${topBottomInset.toFixed(2)}%`,
      bottom: `${topBottomInset.toFixed(2)}%`,
      left: `${leftRightInset.toFixed(2)}%`,
      right: `${leftRightInset.toFixed(2)}%`,
    }
  }
}

export function DevelopScreen({ navigate }: { navigate: (view: View) => void }) {
  const { activePhoto, photos, dispatch } = useAppState()
  const [leftTab, setLeftTab] = useState<"presets" | "history" | "snapshots">(
    "presets",
  )
  const [tool, setTool] = useState<"adjust" | "crop" | "transform" | "mask">(
    "adjust",
  )
  const [beforeView, setBeforeView] = useState<"single" | "side-by-side" | "overlaid">("single")
  const [singleTarget, setSingleTarget] = useState<"after" | "before">("after")
  const [splitPos, setSplitPos] = useState<number>(50)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
  const [beforeMenuOpen, setBeforeMenuOpen] = useState(false)
  const [cropAspect, setCropAspect] = useState<string>("original")
  const [cropLocked, setCropLocked] = useState<boolean>(true)
  const {
    history: histories,
    snapshots: allSnapshots,
    canUndo,
    canRedo,
  } = useAppState()
  const [hist, setHist] = useState<number[][] | null>(null)
  const [channels, setChannels] = useState({ r: true, g: true, b: true, l: false })
  const [clipping, setClipping] = useState(false)
  const [zoom, setZoom] = useState<"fit" | "1:1">("fit")
  const [snapName, setSnapName] = useState("")
  const [openPanels, setOpenPanels] = useState<string[]>([
    "AI Assist & Neural Look",
    "Camera RAW Engine",
    "Optics",
    "Color",
    "Detail",
  ])
  const [opticsMenuOpen, setOpticsMenuOpen] = useState(false)
  const [lockCenter, setLockCenter] = useState(true)
  const [filmstripOpen, setFilmstripOpen] = useState(true)
  const controlsRef = useRef<HTMLElement>(null)

  const cycleBeforeView = () => {
    setBeforeView((prev) =>
      prev === "single"
        ? "side-by-side"
        : prev === "side-by-side"
          ? "overlaid"
          : "single",
    )
  }

  const handleSplitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingSplit(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const updatePos = (clientX: number) => {
      const p = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      setSplitPos(Math.round(p))
    }
    updatePos(e.clientX)

    const onPointerMove = (moveEvent: PointerEvent) => {
      updatePos(moveEvent.clientX)
    }
    const onPointerUp = () => {
      setIsDraggingSplit(false)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  const handleCenterWheel = (event: React.WheelEvent) => {
    if (!lockCenter) return
    event.stopPropagation()
    if (controlsRef.current) {
      controlsRef.current.scrollBy({ top: event.deltaY, behavior: "auto" })
    }
  }

  const set = (key: keyof Photo["develop"], value: number | boolean | string) =>
    dispatch({ type: "DEVELOP", id: activePhoto.id, key, value, at: Date.now() })
  const d = activePhoto.develop
  const h = histories[activePhoto.id]
  const snaps = allSnapshots[activePhoto.id] ?? []
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input, textarea, select")) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === "z") setZoom((v) => (v === "fit" ? "1:1" : "fit"))
      else if (key === "\\") {
        if (beforeView === "single") {
          setSingleTarget((v) => (v === "before" ? "after" : "before"))
        } else {
          setBeforeView("single")
          setSingleTarget("before")
        }
      } else if (key === "y") {
        cycleBeforeView()
      } else if (key === "o") setClipping((v) => !v)
      else if (key === "l") setLockCenter((v) => !v)
      else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const i = photos.findIndex((p) => p.id === activePhoto.id)
        const next = photos[i + (event.key === "ArrowRight" ? 1 : -1)]
        if (next) dispatch({ type: "SELECT", id: next.id })
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })
  const togglePanel = (name: string) =>
    setOpenPanels((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  const ago = (at: number) => {
    if (!at) return "Import"
    const sec = Math.round((Date.now() - at) / 1000)
    if (sec < 10) return "Just now"
    if (sec < 60) return `${sec}s ago`
    if (sec < 3600) return `${Math.round(sec / 60)} min ago`
    return `${Math.round(sec / 3600)} h ago`
  }

  const renderCropOverlay = () => {
    const activePreset = CROP_ASPECT_PRESETS.find((p) => p.id === cropAspect)
    return (
      <div className="crop-overlay-wrapper">
        <div
          className={`crop-box crop-aspect-${cropAspect.replace(":", "-")}`}
          style={getCropBoxStyle(cropAspect)}
        >
          <span className="crop-handle crop-handle-tl" />
          <span className="crop-handle crop-handle-tr" />
          <span className="crop-handle crop-handle-bl" />
          <span className="crop-handle crop-handle-br" />

          <i className="crop-third-h1" />
          <i className="crop-third-h2" />
          <i className="crop-third-v1" />
          <i className="crop-third-v2" />

          <span className="crop-aspect-tag">
            <Icon name="crop" size={10} />
            <span>{activePreset ? activePreset.shortLabel : cropAspect}</span>
            {cropLocked && <Icon name="lock" size={9} style={{ opacity: 0.8 }} />}
          </span>
        </div>
      </div>
    )
  }

  return (
    <section className="screen">
      <ScreenBar
        title="Develop / Edit Workspace"
        subtitle={`${activePhoto.name} · ${
          activePhoto.edited ? "Edited" : "Original"
        }`}
        actions={
          <>
            {/* Before/After View Toggle Button & Controls */}
            <div className="before-after-toolbar-group">
              <Button
                className={`secondary-btn before-after-btn ${
                  beforeView !== "single" || singleTarget === "before" ? "active" : ""
                }`}
                onClick={() => setBeforeMenuOpen((v) => !v)}
                title="Toggle Before/After View: Single, Side-by-Side, or Overlaid (Press Y)"
              >
                <Icon name="compare" size={15} />
                <span>Before/After</span>
                <span className="mode-badge-pill">
                  {beforeView === "single"
                    ? singleTarget === "before"
                      ? "Before"
                      : "Single"
                    : beforeView === "side-by-side"
                      ? "Side-by-Side"
                      : "Overlaid"}
                </span>
                <Icon name="chevron" size={11} />
              </Button>

              {beforeMenuOpen && (
                <div className="before-after-popover">
                  <button
                    type="button"
                    className={`before-after-popover-item ${
                      beforeView === "single" && singleTarget === "after" ? "active" : ""
                    }`}
                    onClick={() => {
                      setBeforeView("single")
                      setSingleTarget("after")
                      setBeforeMenuOpen(false)
                    }}
                  >
                    <Icon
                      name="check"
                      size={12}
                      style={{ opacity: beforeView === "single" && singleTarget === "after" ? 1 : 0 }}
                    />
                    <span>Single View (Edited)</span>
                    <kbd>Y</kbd>
                  </button>
                  <button
                    type="button"
                    className={`before-after-popover-item ${
                      beforeView === "side-by-side" ? "active" : ""
                    }`}
                    onClick={() => {
                      setBeforeView("side-by-side")
                      setBeforeMenuOpen(false)
                    }}
                  >
                    <Icon
                      name="check"
                      size={12}
                      style={{ opacity: beforeView === "side-by-side" ? 1 : 0 }}
                    />
                    <span>Side-by-Side (Original & Edited)</span>
                    <kbd>Y</kbd>
                  </button>
                  <button
                    type="button"
                    className={`before-after-popover-item ${
                      beforeView === "overlaid" ? "active" : ""
                    }`}
                    onClick={() => {
                      setBeforeView("overlaid")
                      setBeforeMenuOpen(false)
                    }}
                  >
                    <Icon
                      name="check"
                      size={12}
                      style={{ opacity: beforeView === "overlaid" ? 1 : 0 }}
                    />
                    <span>Overlaid (Split Slider)</span>
                    <kbd>Y</kbd>
                  </button>
                  <hr />
                  <button
                    type="button"
                    className={`before-after-popover-item ${
                      beforeView === "single" && singleTarget === "before" ? "active" : ""
                    }`}
                    onClick={() => {
                      setBeforeView("single")
                      setSingleTarget((v) => (v === "before" ? "after" : "before"))
                      setBeforeMenuOpen(false)
                    }}
                  >
                    <Icon
                      name="check"
                      size={12}
                      style={{ opacity: beforeView === "single" && singleTarget === "before" ? 1 : 0 }}
                    />
                    <span>
                      {singleTarget === "before" ? "Viewing: Before (Original)" : "Flash Original (Before)"}
                    </span>
                    <kbd>\</kbd>
                  </button>
                </div>
              )}

              <div className="segmented text">
                <Button
                  className={beforeView === "single" && singleTarget === "after" ? "active" : ""}
                  onClick={() => {
                    setBeforeView("single")
                    setSingleTarget("after")
                  }}
                  title="Single View (After)"
                >
                  Single
                </Button>
                <Button
                  className={beforeView === "side-by-side" ? "active" : ""}
                  onClick={() => setBeforeView("side-by-side")}
                  title="Side-by-Side: View original and edited photos side-by-side (Y)"
                >
                  Side-by-Side
                </Button>
                <Button
                  className={beforeView === "overlaid" ? "active" : ""}
                  onClick={() => setBeforeView("overlaid")}
                  title="Overlaid: Interactive split slider over the photo (Y)"
                >
                  Overlaid
                </Button>
              </div>
            </div>

            {/* Lock Center Button in Develop Screen Bar */}
            <Button
              className={`secondary-btn lock-center-btn ${lockCenter ? "active" : ""}`}
              onClick={() => setLockCenter((v) => !v)}
              title="Lock photo in center while scrolling develop sliders (Press L to toggle)"
            >
              <Icon name={lockCenter ? "lock" : "unlock"} size={14} />
              <span>{lockCenter ? "Center Locked" : "Lock Center"}</span>
            </Button>

            {/* Optics Dropdown Menu in Develop Screen */}
            <div className="optics-dropdown-container">
              <Button
                className={`secondary-btn ${opticsMenuOpen ? "active" : ""}`}
                onClick={() => setOpticsMenuOpen((v) => !v)}
                title="Optics & Lens Profile Corrections"
              >
                <Icon name="aperture" size={15} />
                <span>Optics</span>
                <Icon name="chevron" size={12} />
              </Button>
              {opticsMenuOpen && (
                <div className="optics-dropdown-menu">
                  <div className="optics-dropdown-title">
                    <span>Optics & Lens Corrections</span>
                    <Button
                      className="mini-btn"
                      onClick={() => setOpticsMenuOpen(false)}
                      title="Close optics menu"
                    >
                      <Icon name="close" size={12} />
                    </Button>
                  </div>

                  <div className="option-row" style={{ minHeight: "32px" }}>
                    <span>Lens Profile</span>
                    <select
                      className="select-control native"
                      value={d.lensModel || "Auto (EXIF)"}
                      onChange={(e) => set("lensModel", e.target.value)}
                    >
                      {LENS_PROFILES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    className="toggle-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Profile Corrections</span>
                    <Toggle
                      on={d.lensProfile}
                      onClick={() => set("lensProfile", !d.lensProfile)}
                      label="Toggle profile corrections"
                    />
                  </div>

                  <div
                    className="toggle-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Remove CA</span>
                    <Toggle
                      on={d.chromaticAberration}
                      onClick={() => set("chromaticAberration", !d.chromaticAberration)}
                      label="Toggle CA removal"
                    />
                  </div>

                  <div>
                    <span className="caption" style={{ display: "block", marginBottom: "4px" }}>
                      Vignette Correction
                    </span>
                    <div className="optics-vignette-row">
                      <Button
                        className={d.vignetting === 20 ? "active" : ""}
                        onClick={() => set("vignetting", 20)}
                      >
                        +20 Lighten
                      </Button>
                      <Button
                        className={d.vignetting === 0 ? "active" : ""}
                        onClick={() => set("vignetting", 0)}
                      >
                        Neutral
                      </Button>
                      <Button
                        className={d.vignetting === -25 ? "active" : ""}
                        onClick={() => set("vignetting", -25)}
                      >
                        -25 Moody
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="ghost-btn"
                    style={{ height: "28px", fontSize: "11px", marginTop: "2px" }}
                    onClick={() => {
                      set("lensProfile", false)
                      set("chromaticAberration", false)
                      set("distortion", 0)
                      set("vignetting", 0)
                      set("defringe", 0)
                    }}
                  >
                    Reset Optics
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="icon-btn"
              title="Undo"
              disabled={!canUndo}
              onClick={() => dispatch({ type: "UNDO", id: activePhoto.id })}
            >
              <Icon name="undo" />
            </Button>
            <Button
              className="icon-btn"
              title="Redo"
              disabled={!canRedo}
              onClick={() => dispatch({ type: "REDO", id: activePhoto.id })}
            >
              <Icon name="redo" />
            </Button>
            <Button className="primary-btn" onClick={() => navigate("export")}>
              <Icon name="export" size={15} />
              Export
            </Button>
          </>
        }
      />
      <div className="workspace develop-workspace">
        <aside className="sidebar develop-left">
          <div className="tab-row">
            {(["presets", "history", "snapshots"] as const).map((tab) => (
              <Button
                className={leftTab === tab ? "active" : ""}
                key={tab}
                onClick={() => setLeftTab(tab)}
                title={tab}
              >
                <Icon
                  name={
                    tab === "presets"
                      ? "image"
                      : tab === "history"
                        ? "history"
                        : "snapshot"
                  }
                  size={16}
                />
              </Button>
            ))}
          </div>
          {leftTab === "presets" && (
            <>
              <span className="eyebrow">Recommended presets</span>
              <div className="preset-grid">
                {PRESETS.map((preset) => (
                  <Button
                    className={`preset-card ${
                      matchesPreset(d, preset.values) ? "active" : ""
                    }`}
                    key={preset.name}
                    onClick={() =>
                      dispatch({
                        type: "PRESET",
                        id: activePhoto.id,
                        name: preset.name,
                        values: preset.values,
                        at: Date.now(),
                      })
                    }
                  >
                    <PhotoArt
                      tone={activePhoto.tone}
                      src={activePhoto.previewUrl}
                      style={{
                        filter: approxFilter({ ...NEUTRAL, ...preset.values }),
                      }}
                    />
                    <span>{preset.name}</span>
                  </Button>
                ))}
              </div>
            </>
          )}
          {leftTab === "history" && (
            <div className="history-list">
              {(h?.entries ?? [{ label: "Original", at: 0 }])
                .map((entry, i) => ({ entry, i }))
                .reverse()
                .map(({ entry, i }) => (
                  <Button
                    className={`${i === (h?.index ?? 0) ? "active" : ""} ${
                      h && i > h.index ? "undone" : ""
                    }`}
                    key={i}
                    onClick={() =>
                      dispatch({ type: "HISTORY_GOTO", id: activePhoto.id, index: i })
                    }
                  >
                    <i />
                    <span>
                      {entry.label}
                      <small>{ago(entry.at)}</small>
                    </span>
                  </Button>
                ))}
            </div>
          )}
          {leftTab === "snapshots" && (
            <div className="snapshot-panel">
              <form
                className="snapshot-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  dispatch({
                    type: "SNAPSHOT_CREATE",
                    id: activePhoto.id,
                    snapshotId: crypto.randomUUID(),
                    name: snapName.trim(),
                    at: Date.now(),
                  })
                  setSnapName("")
                }}
              >
                <input
                  value={snapName}
                  onChange={(event) => setSnapName(event.target.value)}
                  placeholder={`Snapshot ${snaps.length + 1}`}
                  aria-label="Snapshot name"
                />
                <Button className="secondary-btn">Create</Button>
              </form>
              {snaps.length === 0 && (
                <div className="empty-panel">
                  <Icon name="snapshot" size={24} />
                  <span>No snapshots yet</span>
                </div>
              )}
              <div className="history-list">
                {snaps.map((snap) => (
                  <div className="snapshot-row" key={snap.id}>
                    <Button
                      onClick={() =>
                        dispatch({
                          type: "SNAPSHOT_APPLY",
                          id: activePhoto.id,
                          snapshotId: snap.id,
                          at: Date.now(),
                        })
                      }
                    >
                      <i />
                      <span>
                        {snap.name}
                        <small>{ago(snap.at)}</small>
                      </span>
                    </Button>
                    <Button
                      className="mini-btn"
                      title="Delete snapshot"
                      onClick={() =>
                        dispatch({
                          type: "SNAPSHOT_DELETE",
                          id: activePhoto.id,
                          snapshotId: snap.id,
                        })
                      }
                    >
                      <Icon name="close" size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
        <main
          className={`develop-center ${lockCenter ? "is-locked" : ""}`}
          onWheel={handleCenterWheel}
        >
          <div className="tool-rail">
            {(["adjust", "crop", "transform", "mask"] as const).map((item) => (
              <Button
                key={item}
                className={tool === item ? "active" : ""}
                onClick={() => setTool(item)}
                title={item}
              >
                <Icon name={item === "adjust" ? "sliders" : item} size={19} />
              </Button>
            ))}
            <div style={{ width: "20px", height: "1px", background: "var(--line)", margin: "4px auto" }} />
            <Button
              className={beforeView !== "single" ? "active" : ""}
              onClick={cycleBeforeView}
              title={`Before/After View: ${beforeView.toUpperCase()} (Press Y to cycle)`}
            >
              <Icon name="compare" size={18} />
            </Button>
          </div>
          <div className="develop-stage-area">
            {beforeView === "side-by-side" ? (
              <div className="develop-side-by-side">
                <div className="side-by-side-pane before-pane">
                  <div className="pane-header">
                    <span className="pane-badge before">BEFORE (ORIGINAL)</span>
                  </div>
                  <div className={`develop-photo zoom-${zoom === "fit" ? "fit" : "100"}`}>
                    <DevelopedImage photo={activePhoto} recipe={NEUTRAL} />
                  </div>
                </div>
                <div className="side-by-side-pane after-pane">
                  <div className="pane-header">
                    <span className="pane-badge after">AFTER (EDITED)</span>
                  </div>
                  <div className={`develop-photo zoom-${zoom === "fit" ? "fit" : "100"}`}>
                    <DevelopedImage
                      photo={activePhoto}
                      recipe={d}
                      onHistogram={setHist}
                      clipping={clipping}
                    />
                    {tool === "crop" && renderCropOverlay()}
                  </div>
                </div>
              </div>
            ) : beforeView === "overlaid" ? (
              <div
                className={`develop-overlaid-stage ${isDraggingSplit ? "is-dragging" : ""}`}
                onPointerDown={handleSplitPointerDown}
                title="Drag split handle or click anywhere to adjust Before/After overlay"
              >
                <div
                  className="overlaid-layer before-layer"
                  style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                >
                  <DevelopedImage photo={activePhoto} recipe={NEUTRAL} />
                </div>
                <div className="overlaid-layer after-layer">
                  <DevelopedImage
                    photo={activePhoto}
                    recipe={d}
                    onHistogram={setHist}
                    clipping={clipping}
                  />
                </div>
                <div className="overlaid-divider" style={{ left: `${splitPos}%` }}>
                  <div className="overlaid-handle" title="Drag to slide Before/After divider">
                    <Icon name="chevron" size={9} style={{ transform: "rotate(180deg)" }} />
                    <Icon name="chevron" size={9} />
                  </div>
                </div>
                <span className="overlay-label before" style={{ opacity: splitPos > 12 ? 1 : 0 }}>
                  BEFORE ({splitPos}%)
                </span>
                <span className="overlay-label after" style={{ opacity: splitPos < 88 ? 1 : 0 }}>
                  AFTER ({100 - splitPos}%)
                </span>
                <div className="overlay-quick-controls" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={splitPos === 25 ? "active" : ""}
                    onClick={() => setSplitPos(25)}
                    title="25% Before / 75% After"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    className={splitPos === 50 ? "active" : ""}
                    onClick={() => setSplitPos(50)}
                    title="50% Before / 50% After (Center Split)"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className={splitPos === 75 ? "active" : ""}
                    onClick={() => setSplitPos(75)}
                    title="75% Before / 25% After"
                  >
                    75%
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`develop-photo zoom-${
                  zoom === "fit" ? "fit" : "100"
                } ${lockCenter ? "locked-photo" : ""} ${
                  !filmstripOpen ? "no-filmstrip" : ""
                }`}
              >
                <DevelopedImage
                  key={activePhoto.id}
                  photo={activePhoto}
                  recipe={singleTarget === "before" ? NEUTRAL : d}
                  onHistogram={singleTarget === "before" ? undefined : setHist}
                  clipping={clipping && singleTarget !== "before"}
                />
                {tool === "crop" && renderCropOverlay()}
                {tool === "transform" && (
                  <div className="transform-overlay">
                    <i />
                    <i />
                    <i />
                  </div>
                )}
                <span className="mode-badge">
                  {singleTarget.toUpperCase()} · {tool.toUpperCase()}
                </span>

                <Button
                  className={`center-lock-indicator ${lockCenter ? "locked" : ""}`}
                  onClick={() => setLockCenter((v) => !v)}
                  title={
                    lockCenter
                      ? "Center is locked into place. Photo stays centered and will not scroll up or down. Develop sliders scroll independently. Click or press L to unlock."
                      : "Click or press L to lock center photo in place."
                  }
                >
                  <Icon name={lockCenter ? "lock" : "unlock"} size={12} />
                  <span>{lockCenter ? "CENTER LOCKED" : "LOCK CENTER"}</span>
                </Button>
              </div>
            )}
          </div>
          <div className="stage-status">
            <span>{activePhoto.dimensions} · 24 MP · sRGB</span>
            <div className="stage-status-actions">
              <Button
                className={`mini-status-btn ${beforeView !== "single" ? "active" : ""}`}
                onClick={cycleBeforeView}
                title="Cycle Before/After View: Single -> Side-by-Side -> Overlaid (Y)"
              >
                <Icon name="compare" size={11} />
                <span>
                  {beforeView === "single"
                    ? "Before/After (Y)"
                    : beforeView === "side-by-side"
                      ? "Side-by-Side (Y)"
                      : "Overlaid Split (Y)"}
                </span>
              </Button>
              <Button
                className={`mini-status-btn ${lockCenter ? "active" : ""}`}
                onClick={() => setLockCenter((v) => !v)}
                title="Lock image in center while scrolling develop sliders (L)"
              >
                <Icon name={lockCenter ? "lock" : "unlock"} size={11} />
                <span>{lockCenter ? "Center Locked (L)" : "Lock Center (L)"}</span>
              </Button>
              <Button
                className={`mini-status-btn ${!filmstripOpen ? "active" : ""}`}
                onClick={() => setFilmstripOpen((v) => !v)}
                title={
                  filmstripOpen
                    ? "Hide filmstrip for maximum centered image canvas"
                    : "Show filmstrip"
                }
              >
                <span>{filmstripOpen ? "Hide Strip" : "Show Strip"}</span>
              </Button>
              <span>{zoom === "fit" ? "Fit" : "1:1 · 100%"} · Z to toggle</span>
            </div>
          </div>
          {filmstripOpen && <Filmstrip activeId={activePhoto.id} />}
        </main>
        <aside ref={controlsRef} className="sidebar develop-controls">
          <div className="histogram-head">
            <span>Histogram</span>
            <span className="hist-toggles">
              {(["r", "g", "b", "l"] as const).map((c) => (
                <Button
                  key={c}
                  className={`hist-${c} ${channels[c] ? "on" : ""}`}
                  pressed={channels[c]}
                  title={`Show ${c === "l" ? "luminance" : { r: "red", g: "green", b: "blue" }[c]} channel`}
                  onClick={() => setChannels((prev) => ({ ...prev, [c]: !prev[c] }))}
                >
                  {c.toUpperCase()}
                </Button>
              ))}
              <Button
                className={`hist-clip ${clipping ? "on" : ""}`}
                pressed={clipping}
                title="Show clipped shadows (blue) and highlights (red)"
                onClick={() => setClipping((v) => !v)}
              >
                Clip
              </Button>
            </span>
          </div>
          <Histogram data={activePhoto.previewUrl ? hist : null} channels={channels} />
          <div className="capture-line">
            <span>ISO {activePhoto.iso}</span>
            <span>{activePhoto.lens.split(" ")[0]}</span>
            <span>{activePhoto.aperture}</span>
            <span>{activePhoto.shutter}</span>
          </div>
          <div className="adjust-panel">
            <div className="adjust-heading">
              <span>
                {tool === "crop"
                  ? "Crop"
                  : tool === "transform"
                    ? "Geometry"
                    : "Light"}
              </span>
              <Button
                onClick={() =>
                  dispatch({
                    type: "RESET_DEVELOP",
                    id: activePhoto.id,
                    at: Date.now(),
                  })
                }
              >
                Reset
              </Button>
            </div>
            {tool === "crop" ? (
              <div className="crop-controls-panel">
                <div className="option-row" style={{ minHeight: "36px" }}>
                  <span>Aspect Ratio</span>
                  <div className="crop-select-wrapper">
                    <select
                      className="select-control native crop-aspect-select"
                      value={cropAspect}
                      onChange={(e) => setCropAspect(e.target.value)}
                      aria-label="Aspect Ratio Presets"
                    >
                      <optgroup label="Common Presets">
                        <option value="original">Original (As Shot)</option>
                        <option value="1:1">1:1 Square</option>
                        <option value="4:5">4:5 Portrait (8:10)</option>
                        <option value="16:9">16:9 Widescreen</option>
                        <option value="9:16">9:16 Vertical (Stories/Reels)</option>
                      </optgroup>
                      <optgroup label="Photography & Print">
                        <option value="3:2">3:2 35mm DSLR</option>
                        <option value="2:3">2:3 35mm Vertical</option>
                        <option value="4:3">4:3 Standard (Micro 4/3)</option>
                        <option value="3:4">3:4 Vertical</option>
                        <option value="5:4">5:4 Landscape (8:10)</option>
                        <option value="7:5">7:5 Print (5x7 in)</option>
                        <option value="5:7">5:7 Print Vertical</option>
                      </optgroup>
                      <optgroup label="Cinematic & Free">
                        <option value="2:1">2:1 Univisium (Cinema)</option>
                        <option value="custom">Custom (Freeform)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="crop-quick-presets">
                  {[
                    { id: "original", label: "Original" },
                    { id: "1:1", label: "1:1" },
                    { id: "4:5", label: "4:5" },
                    { id: "16:9", label: "16:9" },
                    { id: "9:16", label: "9:16" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`crop-pill-btn ${cropAspect === p.id ? "active" : ""}`}
                      onClick={() => setCropAspect(p.id)}
                      title={`Select ${p.label} aspect ratio preset`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="crop-subactions-row">
                  <Button
                    className="secondary-btn crop-action-btn"
                    onClick={() => {
                      if (ASPECT_FLIP_MAP[cropAspect]) {
                        setCropAspect(ASPECT_FLIP_MAP[cropAspect])
                      }
                    }}
                    title="Flip Aspect Ratio orientation (Landscape ⇄ Portrait)"
                  >
                    <Icon name="transform" size={13} />
                    <span>Flip Ratio</span>
                  </Button>
                  <Button
                    className={`secondary-btn crop-action-btn ${cropLocked ? "active" : ""}`}
                    onClick={() => setCropLocked((v) => !v)}
                    title={cropLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                  >
                    <Icon name={cropLocked ? "lock" : "unlock"} size={13} />
                    <span>{cropLocked ? "Locked" : "Unlocked"}</span>
                  </Button>
                  <Button
                    className="ghost-btn crop-action-btn"
                    onClick={() => {
                      setCropAspect("original")
                      set("rotation", 0)
                    }}
                    title="Reset Crop to Original"
                  >
                    <span>Reset</span>
                  </Button>
                </div>

                <div className="crop-divider" />

                <Slider
                  label="Angle / Straighten"
                  value={d.rotation}
                  min={-45}
                  max={45}
                  onChange={(v) => set("rotation", v)}
                />
              </div>
            ) : tool === "transform" ? (
              <>
                <Slider
                  label="Rotate"
                  value={d.rotation}
                  min={-45}
                  max={45}
                  onChange={(v) => set("rotation", v)}
                />
                <Slider
                  label="Vertical"
                  value={d.vertical}
                  onChange={(v) => set("vertical", v)}
                />
              </>
            ) : (
              <LightPanel values={d} onChange={set} />
            )}
          </div>
          {(
            [
              ["AI Assist & Neural Look"],
              ["Camera RAW Engine"],
              ["Color"],
              ["Tone curve"],
              ["Detail"],
              ["Optics"],
              ["Geometry", [["Rotate", "rotation", -45, 45], ["Vertical", "vertical"]]],
              ["Local adjustments"],
            ] as const
          ).map(([name, sliders]) => (
            <div className="accordion" key={name}>
              <Button
                className="collapsed-panel"
                pressed={openPanels.includes(name)}
                onClick={() => togglePanel(name)}
              >
                <span>{name}</span>
                <Icon name="chevron" size={14} />
              </Button>
              {openPanels.includes(name) && (
                <div className="accordion-body">
                  {name === "AI Assist & Neural Look" && (
                    <AiPanel
                      values={d}
                      onChange={set}
                      photo={activePhoto}
                      onApplyRecipe={(recipe) => {
                        for (const [k, v] of Object.entries(recipe)) {
                          if (v !== undefined) {
                            set(k as keyof Photo["develop"], v)
                          }
                        }
                      }}
                    />
                  )}
                  {name === "Camera RAW Engine" && (
                    <RawPanel
                      values={d}
                      onChange={set}
                      photo={activePhoto}
                    />
                  )}
                  {name === "Color" && <ColorPanel values={d} onChange={set} />}
                  {name === "Tone curve" && (
                    <ToneCurvePanel
                      values={d}
                      onChange={set}
                      onReset={() => {
                        for (const k of ["curveShadows", "curveDarks", "curveLights", "curveHighlights"] as const)
                          if (d[k] !== 0) set(k, 0)
                      }}
                    />
                  )}
                  {name === "Detail" && <DetailPanel values={d} onChange={set} />}
                  {name === "Optics" && <OpticsPanel values={d} onChange={set} />}
                  {name === "Local adjustments" && <LocalAdjPanel />}

                  {sliders?.map(([label, key, min, max]) => (
                    <Slider
                      key={key as string}
                      label={label as string}
                      value={d[key as keyof DevelopValues] as number}
                      min={min as number}
                      max={max as number}
                      signed={min !== undefined ? (min as unknown as number) < 0 : true}
                      onChange={(v) => set(key as keyof DevelopValues, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>
      </div>
    </section>
  )
}

