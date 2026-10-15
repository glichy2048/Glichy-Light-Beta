import {
useEffect
} from "react"
import { useAppState } from "../app/AppState"
import type { Flag } from "../app/types"
import { Icon,Button,PhotoArt,Rating,MetadataChip,StatusControls,ScreenBar,InfoSection,Filmstrip,Toggle } from "../components/ui"
import { CatalogSidebar } from "./LibraryScreen"

export function ReviewScreen() {
  const { photos, activePhoto, activeId, preferences, dispatch } = useAppState()
  const index = photos.findIndex((photo) => photo.id === activeId)
  const move = (delta: number) =>
    dispatch({
      type: "SELECT",
      id: photos[(index + delta + photos.length) % photos.length].id,
    })
  const decide = (flag: Flag) => {
    dispatch({ type: "FLAG", id: activePhoto.id, flag })
    if (preferences.autoAdvance) move(1)
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") move(1)
      if (event.key === "ArrowLeft") move(-1)
      if (event.key.toLowerCase() === "p") decide("pick")
      if (event.key.toLowerCase() === "x") decide("reject")
      if (event.key.toLowerCase() === "u") decide("unflagged")
      if (/^[0-5]$/.test(event.key))
        dispatch({
          type: "RATE",
          id: activePhoto.id,
          rating: Number(event.key),
        })
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })
  return (
    <section className="screen">
      <ScreenBar
        title="Culling / Review"
        subtitle={`${index + 1} of ${photos.length} · ${photos.filter((p) => p.flag === "unflagged").length} unreviewed`}
        actions={
          <>
            <span className="shortcut-hint">
              <kbd>P</kbd> Pick <kbd>X</kbd> Reject <kbd>1–5</kbd> Rate
            </span>
            <Button className="secondary-btn">End review</Button>
          </>
        }
      />
      <div className="workspace review-workspace">
        <CatalogSidebar review />
        <main className="review-main">
          <div className="review-stage">
            <Button className="stage-arrow left" onClick={() => move(-1)}>
              <Icon name="chevron" />
            </Button>
            <div className="review-photo">
              <PhotoArt tone={activePhoto.tone} src={activePhoto.previewUrl} label={activePhoto.name} />
              <div className="image-chips">
                <MetadataChip>{activePhoto.format}</MetadataChip>
                {activePhoto.flag !== "unflagged" && (
                  <MetadataChip tone={activePhoto.flag}>
                    {activePhoto.flag}
                  </MetadataChip>
                )}
              </div>
            </div>
            <Button className="stage-arrow right" onClick={() => move(1)}>
              <Icon name="chevron" />
            </Button>
          </div>
          <div className="stage-status">
            <span>{activePhoto.name}</span>
            <span>{activePhoto.dimensions} · Fit · 24%</span>
          </div>
          <Filmstrip activeId={activeId} />
        </main>
        <aside className="sidebar review-controls">
          <div className="panel-title">
            <span>Review decision</span>
            <div className="inline-toggle">
              <span className="caption">Auto-advance</span>
              <Toggle
                on={preferences.autoAdvance}
                onClick={() =>
                  dispatch({
                    type: "PREFERENCE",
                    key: "autoAdvance",
                    value: !preferences.autoAdvance,
                  })
                }
                label="Auto-advance after review decision"
              />
            </div>
          </div>
          <div className="decision-buttons">
            <Button
              className={`decision pick ${
                activePhoto.flag === "pick" ? "active" : ""
              }`}
              onClick={() => decide("pick")}
            >
              <Icon name="flag" />
              Pick <kbd>P</kbd>
            </Button>
            <Button
              className={`decision reject ${
                activePhoto.flag === "reject" ? "active" : ""
              }`}
              onClick={() => decide("reject")}
            >
              <Icon name="reject" />
              Reject <kbd>X</kbd>
            </Button>
            <Button
              className="clear-decision"
              onClick={() => decide("unflagged")}
            >
              Clear flag <kbd>U</kbd>
            </Button>
          </div>
          <InfoSection title="Rating">
            <Rating photo={activePhoto} />
          </InfoSection>
          <InfoSection title="Color label">
            <StatusControls photo={activePhoto} dense />
          </InfoSection>
          <InfoSection title="Metadata">
            <div className="chip-column">
              <MetadataChip icon="image">{activePhoto.camera}</MetadataChip>
              <MetadataChip>{activePhoto.lens}</MetadataChip>
              <MetadataChip>
                {activePhoto.shutter} · {activePhoto.aperture}
              </MetadataChip>
              <MetadataChip>ISO {activePhoto.iso}</MetadataChip>
            </div>
          </InfoSection>
        </aside>
      </div>
    </section>
  )
}

