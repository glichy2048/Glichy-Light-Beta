import {
useEffect,useRef,
useState,type PointerEvent as ReactPointerEvent
} from "react"
import { useAppState } from "../app/AppState"
import type { Photo,View } from "../app/types"
import { Icon,Button,PhotoArt,Rating,MetadataChip,StatusControls,ScreenBar,InfoSection,Info } from "../components/ui"

export const ZOOM_STEPS = [1, 2, 4] as const

export function CompareScreen({ navigate }: { navigate: (view: View) => void }) {
  const { photos, compareIds, compareWinner, activeId, dispatch } =
    useAppState()
  const [layout, setLayout] = useState<2 | 3 | 4>(
    Math.max(2, Math.min(4, compareIds.length)) as 2 | 3 | 4,
  )
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [sync, setSync] = useState(true)
  const [localView, setLocalView] = useState<
    Record<number, { zoom: number; x: number; y: number }>
  >({})
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)

  const candidates = compareIds
    .map((id) => photos.find((photo) => photo.id === id))
    .filter(Boolean) as Photo[]
  const visible = candidates.slice(0, layout)
  const active = candidates.find((photo) => photo.id === activeId)
  const winner = candidates.find((photo) => photo.id === compareWinner)

  const viewFor = (id: number) =>
    sync ? { zoom, ...pan } : (localView[id] ?? { zoom: 1, x: 0, y: 0 })

  const setView = (id: number, next: { zoom: number; x: number; y: number }) => {
    if (sync) {
      setZoom(next.zoom)
      setPan({ x: next.x, y: next.y })
    } else setLocalView((prev) => ({ ...prev, [id]: next }))
  }

  const changeZoom = (id: number, nextZoom: number) =>
    setView(id, nextZoom === 1 ? { zoom: 1, x: 0, y: 0 } : { ...viewFor(id), zoom: nextZoom })

  const cycleZoom = (id: number) => {
    const current = viewFor(id).zoom
    const next =
      ZOOM_STEPS[(ZOOM_STEPS.indexOf(current as 1 | 2 | 4) + 1) % ZOOM_STEPS.length]
    changeZoom(id, next)
  }

  const toggleSync = () => {
    if (!sync) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
    setSync(!sync)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, id: number) => {
    dispatch({ type: "SELECT", id })
    if (viewFor(id).zoom === 1) return
    drag.current = { x: event.clientX, y: event.clientY, id }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>, id: number) => {
    const d = drag.current
    if (!d || d.id !== id) return
    const rect = event.currentTarget.getBoundingClientRect()
    const v = viewFor(id)
    const limitX = (rect.width * (v.zoom - 1)) / 2
    const limitY = (rect.height * (v.zoom - 1)) / 2
    const x = Math.max(-limitX, Math.min(limitX, v.x + event.clientX - d.x))
    const y = Math.max(-limitY, Math.min(limitY, v.y + event.clientY - d.y))
    drag.current = { ...d, x: event.clientX, y: event.clientY }
    setView(id, { zoom: v.zoom, x, y })
  }
  const onPointerUp = () => {
    drag.current = null
  }

  const stepActive = (delta: number) => {
    if (!candidates.length) return
    const i = candidates.findIndex((p) => p.id === activeId)
    const next = candidates[(i + delta + candidates.length) % candidates.length]
    dispatch({ type: "SELECT", id: next.id })
  }
  const rejectOthers = () => {
    if (!winner) return
    candidates.forEach((photo) => {
      if (photo.id !== winner.id && photo.flag !== "reject")
        dispatch({ type: "FLAG", id: photo.id, flag: "reject" })
    })
  }
  const selectBest = (photo: Photo) => {
    const clearing = compareWinner === photo.id
    dispatch({ type: "COMPARE_WINNER", id: photo.id })
    if (!clearing) dispatch({ type: "FLAG", id: photo.id, flag: "pick" })
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement
      if (el.matches("input, textarea, select") || event.metaKey || event.ctrlKey)
        return
      const key = event.key.toLowerCase()
      if (/^[1-4]$/.test(key) && visible[Number(key) - 1])
        dispatch({ type: "SELECT", id: visible[Number(key) - 1].id })
      else if (key === "arrowright") stepActive(1)
      else if (key === "arrowleft") stepActive(-1)
      else if (key === "z" && active) cycleZoom(active.id)
      else if (key === "s" && active) selectBest(active)
      else if (key === "p" && active)
        dispatch({ type: "FLAG", id: active.id, flag: "pick" })
      else if (key === "x" && active)
        dispatch({ type: "FLAG", id: active.id, flag: "reject" })
      else if ((key === "delete" || key === "backspace") && active)
        dispatch({ type: "COMPARE_TOGGLE", id: active.id })
      else if (key === "escape" && winner)
        dispatch({ type: "COMPARE_WINNER", id: winner.id })
      else if (key === "enter" && winner) navigate("develop")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })

  const bestIso = Math.min(...candidates.map((p) => p.iso))
  const bestRating = Math.max(...candidates.map((p) => p.rating))

  return (
    <section className="screen">
      <ScreenBar
        title="Compare / Select Mode"
        subtitle={`${candidates.length} candidates · ${
          sync ? "Synchronized" : "Independent"
        } zoom ${Math.round(zoom * 100)}%${
          winner ? ` · Select: ${winner.name}` : " · No select yet"
        }`}
        actions={
          <>
            <div className="segmented text" aria-label="Zoom">
              {ZOOM_STEPS.map((step) => (
                <Button
                  key={step}
                  className={
                    active && viewFor(active.id).zoom === step ? "active" : ""
                  }
                  title={step === 1 ? "Fit to cell" : `${step * 100}%`}
                  onClick={() => active && changeZoom(active.id, step)}
                >
                  {step === 1 ? "Fit" : `${step * 100}%`}
                </Button>
              ))}
            </div>
            <Button
              className="secondary-btn"
              pressed={sync}
              title="Link zoom and pan across all cells"
              onClick={toggleSync}
            >
              <Icon name="compare" size={14} />
              Sync {sync ? "on" : "off"}
            </Button>
            <div className="segmented text">
              {[2, 3, 4].map((count) => (
                <Button
                  key={count}
                  className={layout === count ? "active" : ""}
                  onClick={() => setLayout(count as 2 | 3 | 4)}
                >
                  {count}-up
                </Button>
              ))}
            </div>
            <Button
              className="primary-btn"
              onClick={() => navigate("develop")}
              disabled={!winner}
            >
              Develop select
            </Button>
          </>
        }
      />
      <div className="workspace compare-workspace">
        <aside className="sidebar compare-bucket">
          <div className="panel-title">
            <span>Candidate bucket</span>
            <b>{candidates.length}/4</b>
          </div>
          {candidates.map((photo, index) => (
            <Button
              className={`candidate-row ${
                photo.id === activeId ? "active" : ""
              } ${index >= layout ? "offscreen" : ""}`}
              key={photo.id}
              title={index >= layout ? "Not shown at this layout" : undefined}
              onClick={() => dispatch({ type: "SELECT", id: photo.id })}
            >
              <span className="candidate-thumb">
                <PhotoArt tone={photo.tone} src={photo.previewUrl} />
              </span>
              <span>
                <b>
                  {index + 1}. {photo.name}
                </b>
                <small>
                  {photo.rating} stars · {photo.format}
                  {index >= layout ? " · hidden" : ""}
                </small>
              </span>
              <i className={compareWinner === photo.id ? "winner" : ""}>
                {compareWinner === photo.id ? "S" : ""}
              </i>
            </Button>
          ))}
          <div className="bucket-note">
            <Icon name="info" size={15} />
            <span>
              Select 2–4 photos from the fast preview strip. A maximum of four
              candidates keeps detail comparisons readable.
            </span>
          </div>
          <div className="compare-keys">
            {[
              ["1–4", "Focus cell"],
              ["← →", "Step candidate"],
              ["Z", "Cycle zoom"],
              ["S", "Select best"],
              ["P / X", "Pick / reject"],
              ["Del", "Remove"],
              ["Esc", "Clear select"],
              ["Enter", "Develop select"],
            ].map(([k, label]) => (
              <div key={k}>
                <kbd>{k}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </aside>
        <main className={`compare-stage layout-${layout}`}>
          {visible.map((photo, index) => {
            const v = viewFor(photo.id)
            return (
              <div
                className={`compare-cell ${
                  photo.id === activeId ? "active" : ""
                } ${photo.id === compareWinner ? "selected" : ""} ${
                  photo.flag === "reject" ? "rejected" : ""
                }`}
                key={photo.id}
              >
                <div
                  className={`compare-image ${v.zoom > 1 ? "zoomed" : ""}`}
                  onPointerDown={(e) => onPointerDown(e, photo.id)}
                  onPointerMove={(e) => onPointerMove(e, photo.id)}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onDoubleClick={() => cycleZoom(photo.id)}
                >
                  <div
                    className="compare-zoom"
                    style={{
                      transform: `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`,
                    }}
                  >
                    <PhotoArt tone={photo.tone} src={photo.previewUrl} label={photo.name} />
                  </div>
                  <span className="compare-number">{index + 1}</span>
                  {v.zoom > 1 && (
                    <span className="zoom-badge">{v.zoom * 100}%</span>
                  )}
                  {photo.id === compareWinner && (
                    <span className="select-badge">
                      <Icon name="check" size={12} />
                      SELECT
                    </span>
                  )}
                  {photo.flag === "reject" && (
                    <span className="reject-badge">REJECT</span>
                  )}
                </div>
                <div className="compare-meta">
                  <div>
                    <span>{photo.name}</span>
                    <small>
                      {photo.shutter} · {photo.aperture} · ISO {photo.iso}
                    </small>
                  </div>
                  <Rating photo={photo} compact />
                </div>
              </div>
            )
          })}
        </main>
        <aside className="sidebar compare-details">
          <div className="panel-title">
            <span>Active candidate</span>
            <span className="caption">
              #{active ? candidates.indexOf(active) + 1 : "–"}
            </span>
          </div>
          {active ? (
            <>
              <div className="chip-row">
                <MetadataChip>{active.format}</MetadataChip>
                <MetadataChip tone={active.flag}>{active.flag}</MetadataChip>
              </div>
              <Rating photo={active} />
              <StatusControls photo={active} />
              <InfoSection title="Exposure comparison">
                <Info label="Camera" value={active.camera} />
                <Info label="Lens" value={active.lens} />
                <Info label="Shutter" value={active.shutter} />
                <Info label="Aperture" value={active.aperture} />
                <Info label="ISO" value={String(active.iso)} />
              </InfoSection>
              <Button
                className="primary-btn full"
                onClick={() => selectBest(active)}
              >
                <Icon name="check" size={15} />
                {compareWinner === active.id ? "Clear select" : "Select as best"}
              </Button>
              <Button
                className="secondary-btn full"
                onClick={() =>
                  dispatch({ type: "COMPARE_TOGGLE", id: active.id })
                }
                disabled={candidates.length <= 2}
              >
                Remove candidate
              </Button>
            </>
          ) : (
            <p className="compare-empty">
              Choose a candidate to inspect its metadata and make a decision.
            </p>
          )}
          <InfoSection title="At a glance">
            <div className="compare-table">
              {candidates.map((photo, index) => (
                <div
                  key={photo.id}
                  className={photo.id === compareWinner ? "winner" : ""}
                >
                  <span>{index + 1}</span>
                  <b className={photo.rating === bestRating ? "best" : ""}>
                    {photo.rating}★
                  </b>
                  <b className={photo.iso === bestIso ? "best" : ""}>
                    ISO {photo.iso}
                  </b>
                  <b>{photo.edited ? "Edited" : "Original"}</b>
                </div>
              ))}
            </div>
          </InfoSection>
          <Button
            className="secondary-btn full"
            onClick={rejectOthers}
            disabled={!winner}
            title={winner ? "Flag every other candidate as rejected" : "Select a best photo first"}
          >
            <Icon name="reject" size={14} />
            Reject others
          </Button>
        </aside>
      </div>
      <div className="fast-preview">
        <span>Fast preview</span>
        <div>
          {photos.map((photo) => (
            <Button
              key={photo.id}
              className={`fast-thumb ${
                compareIds.includes(photo.id) ? "selected" : ""
              }`}
              title={
                !compareIds.includes(photo.id) && compareIds.length >= 4
                  ? "Candidate bucket is full"
                  : photo.name
              }
              onClick={() => dispatch({ type: "COMPARE_TOGGLE", id: photo.id })}
            >
              <PhotoArt tone={photo.tone} src={photo.previewUrl} />
              <i>
                {compareIds.includes(photo.id) ? (
                  <Icon name="check" size={10} />
                ) : (
                  <Icon name="plus" size={10} />
                )}
              </i>
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
