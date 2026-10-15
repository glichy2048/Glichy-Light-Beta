import {
useEffect,useState
} from "react"
import {
NEUTRAL,
PRESETS,approxFilter,matchesPreset,LENS_PROFILES
} from "../app/develop"
import { useAppState } from "../app/AppState"
import type { Photo,View } from "../app/types"
import { Icon,Button,PhotoArt,Histogram,ScreenBar,Filmstrip,Slider,OptionRow,Toggle } from "../components/ui"
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

export function DevelopScreen({ navigate }: { navigate: (view: View) => void }) {
  const { activePhoto, photos, dispatch } = useAppState()
  const [leftTab, setLeftTab] = useState<"presets" | "history" | "snapshots">(
    "presets",
  )
  const [tool, setTool] = useState<"adjust" | "crop" | "transform" | "mask">(
    "adjust",
  )
  const [before, setBefore] = useState<"after" | "before" | "split">("after")
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
      else if (key === "\\") setBefore((v) => (v === "before" ? "after" : "before"))
      else if (key === "o") setClipping((v) => !v)
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
  return (
    <section className="screen">
      <ScreenBar
        title="Develop / Edit Workspace"
        subtitle={`${activePhoto.name} · ${
          activePhoto.edited ? "Edited" : "Original"
        }`}
        actions={
          <>
            <div className="segmented text">
              <Button
                className={before === "after" ? "active" : ""}
                onClick={() => setBefore("after")}
              >
                After
              </Button>
              <Button
                className={before === "before" ? "active" : ""}
                onClick={() => setBefore("before")}
              >
                Before
              </Button>
              <Button
                className={before === "split" ? "active" : ""}
                onClick={() => setBefore("split")}
              >
                Split
              </Button>
            </div>

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
        <main className="develop-center">
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
          </div>
          <div className={`develop-photo mode-${before} zoom-${zoom === "fit" ? "fit" : "100"}`}>
            <DevelopedImage
              key={activePhoto.id}
              photo={activePhoto}
              recipe={before === "before" ? NEUTRAL : d}
              onHistogram={before === "before" ? undefined : setHist}
              clipping={clipping && before !== "before"}
            />
            {before === "split" && (
              <div className="split-before">
                <DevelopedImage photo={activePhoto} recipe={NEUTRAL} />
              </div>
            )}
            {tool === "crop" && (
              <div className="crop-overlay">
                <i />
                <i />
              </div>
            )}
            {tool === "transform" && (
              <div className="transform-overlay">
                <i />
                <i />
                <i />
              </div>
            )}
            <span className="mode-badge">
              {before.toUpperCase()} · {tool.toUpperCase()}
            </span>
          </div>
          <div className="stage-status">
            <span>{activePhoto.dimensions} · 24 MP · sRGB</span>
            <span>{zoom === "fit" ? "Fit" : "1:1 · 100%"} · Z to toggle</span>
          </div>
          <Filmstrip activeId={activePhoto.id} />
        </main>
        <aside className="sidebar develop-controls">
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
              <>
                <OptionRow label="Aspect" value="Original" />
                <Slider
                  label="Angle"
                  value={d.rotation}
                  min={-45}
                  max={45}
                  onChange={(v) => set("rotation", v)}
                />
              </>
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

