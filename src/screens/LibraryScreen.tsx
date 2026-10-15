import {
useEffect,useRef,
useState
} from "react"
import { IMPORT_ACCEPT } from "../app/raw"
import { useAppState } from "../app/AppState"
import { recentThreshold } from "../app/store"
import type { Filters } from "../app/types"
import type { Photo,View } from "../app/types"
import { type IconName,Icon,Button,PhotoArt,Rating,MetadataChip,StatusControls,ScreenBar,InfoSection,Info } from "../components/ui"

export function CatalogSidebar({ review = false }: { review?: boolean }) {
  const { photos, filters, dispatch } = useAppState()
  const floor = recentThreshold(photos)
  type Row = { label: string; count: number; icon: IconName; active: boolean; patch: Partial<Filters> }
  const all: Row = {
    label: review ? "All photos" : "All photographs",
    count: photos.length,
    icon: "image",
    active:
      filters.flag === "all" && filters.collection === "all",
    patch: { flag: "all", collection: "all" },
  }
  const flagRow = (label: string, flag: Filters["flag"], icon: IconName = "image"): Row => ({
    label,
    count: photos.filter((p) => p.flag === flag).length,
    icon,
    active: filters.flag === flag && filters.collection === "all",
    patch: { flag, collection: "all" },
  })
  const rows: Row[] = review
    ? [all, flagRow("Unreviewed", "unflagged"), flagRow("Picks", "pick", "flag"), flagRow("Rejected", "reject", "reject")]
    : [
        all,
        {
          label: "Recently added",
          count: photos.filter((p) => p.id >= floor).length,
          icon: "image",
          active: filters.collection === "recent",
          patch: { flag: "all", collection: "recent" },
        },
        flagRow("Picks", "pick", "flag"),
        flagRow("Rejected", "reject", "reject"),
        {
          label: "Unrated",
          count: photos.filter((p) => !p.rating).length,
          icon: "image",
          active: filters.collection === "unrated",
          patch: { flag: "all", collection: "unrated" },
        },
      ]
  return (
    <aside className="sidebar left-sidebar">
      <div className="panel-title">
        <span>{review ? "Review session" : "Catalog"}</span>
        <Button className="mini-btn">
          <Icon name="plus" size={14} />
        </Button>
      </div>
      <span className="eyebrow">{review ? "Queue" : "Library"}</span>
      {rows.map((row) => (
        <Button
          key={row.label}
          className={`side-row ${row.active ? "active" : ""}`}
          pressed={row.active}
          onClick={() => dispatch({ type: "FILTER", patch: row.patch })}
        >
          <span>
            <Icon name={row.icon} size={15} />
            {row.label}
          </span>
          <b>{row.count}</b>
        </Button>
      ))}
      {!review && (
        <>
          <span className="eyebrow section-gap">Folders</span>
          {["2025", "Iceland", "Pacific Coast", "Dolomites"].map(
            (folder, i) => (
              <Button className="side-row" key={folder}>
                <span>
                  <Icon name="chevron" size={12} />
                  <Icon name="folder" size={15} />
                  {folder}
                </span>
                <b>{[412, 186, 243, 98][i]}</b>
              </Button>
            ),
          )}
        </>
      )}
      <div className="storage">
        <div>
          <span>{review ? "Session progress" : "Local storage"}</span>
          <span>{review ? "38%" : "68%"}</span>
        </div>
        <div className="progress">
          <i style={{ width: review ? "38%" : "68%" }} />
        </div>
        <span className="caption">
          {review ? "7 of 18 reviewed" : "68.4 GB of 100 GB"}
        </span>
      </div>
    </aside>
  )
}

export function PhotoGridCard({
  photo,
  navigate,
}: {
  photo: Photo
  navigate: (view: View) => void
}) {
  const { selectedIds, dispatch, preferences, photos } = useAppState()
  const selected = selectedIds.includes(photo.id)
  const groupCount = photo.groupId
    ? photos.filter((p) => p.groupId === photo.groupId).length
    : 0
  return (
    <div
      className={`photo-card ${selected ? "selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={(event) =>
        dispatch({
          type: "SELECT",
          id: photo.id,
          multiple: event.metaKey || event.ctrlKey,
        })
      }
      onDoubleClick={() => navigate("develop")}
      onKeyDown={(event) => {
        if (event.key === "Enter") navigate("develop")
      }}
    >
      <div className="photo-frame">
        <PhotoArt tone={photo.tone} src={photo.previewUrl} label={photo.name} />
        {photo.flag !== "unflagged" && (
          <span className={`corner-flag ${photo.flag}`}>
            <Icon name={photo.flag === "pick" ? "flag" : "reject"} size={12} />
          </span>
        )}
        {photo.colorLabel !== "none" && (
          <i className={`label-strip ${photo.colorLabel}`} />
        )}
        {preferences.groupRawJpeg && groupCount > 1 && (
          <span className="stack-badge">
            <Icon name="stack" size={11} />
            RAW+JPEG
          </span>
        )}
      </div>
      <div className="card-copy">
        <div>
          <span>{photo.name}</span>
          <span className="caption">
            {photo.camera} · {photo.format}
          </span>
        </div>
        <Rating photo={photo} compact />
      </div>
    </div>
  )
}

export function Inspector({ photo }: { photo: Photo }) {
  const { dispatch } = useAppState()
  const [draft, setDraft] = useState("")
  const addKeywords = () => {
    for (const kw of draft.split(",")) dispatch({ type: "KEYWORD", id: photo.id, op: "add", keyword: kw })
    setDraft("")
  }
  return (
    <aside className="sidebar right-sidebar">
      <div className="panel-title">
        <span>Photo details</span>
        <Button className="mini-btn">
          <Icon name="more" size={15} />
        </Button>
      </div>
      <div className="inspector-preview">
        <PhotoArt tone={photo.tone} src={photo.previewUrl} label={photo.name} />
      </div>
      <div className="inspector-name">
        <div>
          <span>{photo.name}</span>
          <span className="caption">
            {photo.edited
              ? "Non-destructive edits applied"
              : "Original capture"}
          </span>
        </div>
        <span className={`status-led ${photo.edited ? "edited" : ""}`} />
      </div>
      <div className="chip-row">
        <MetadataChip>{photo.format}</MetadataChip>
        <MetadataChip icon="star">{photo.rating || "—"}</MetadataChip>
        <MetadataChip tone={photo.flag}>{photo.flag}</MetadataChip>
      </div>
      <Rating photo={photo} />
      <StatusControls photo={photo} />
      <InfoSection title="Capture">
        <Info label="Date" value={photo.date} />
        <Info label="Camera" value={photo.camera} />
        <Info label="Lens" value={photo.lens} />
        <Info label="Exposure" value={`${photo.shutter} · ${photo.aperture}`} />
        <Info label="ISO" value={String(photo.iso)} />
      </InfoSection>
      <InfoSection title="Keywords">
        <div className="keyword-list">
          {photo.keywords.map((kw) => (
            <span className="keyword" key={kw}>
              <button
                type="button"
                title={`Search “${kw}”`}
                onClick={() => dispatch({ type: "FILTER", patch: { query: kw } })}
              >
                {kw}
              </button>
              <button
                type="button"
                aria-label={`Remove ${kw}`}
                onClick={() => dispatch({ type: "KEYWORD", id: photo.id, op: "remove", keyword: kw })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="keyword-input"
          value={draft}
          placeholder="Add keyword…"
          aria-label="Add keyword"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              addKeywords()
            }
          }}
          onBlur={() => draft.trim() && addKeywords()}
        />
      </InfoSection>
      <InfoSection title="File">
        <Info label="Dimensions" value={photo.dimensions} />
        <Info label="Size" value={photo.fileSize} />
        <Info
          label="Pairing"
          value={photo.groupId ? "RAW + JPEG" : "Single file"}
        />
      </InfoSection>
    </aside>
  )
}

export function LibraryScreen({ navigate }: { navigate: (view: View) => void }) {
  const {
    activePhoto,
    visiblePhotos,
    filters,
    sort,
    preferences,
    selectedIds,
    dispatch,
    gateway,
  } = useAppState()
  const [density, setDensity] = useState<"large" | "compact">("large")
  const searchInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchInput.current?.focus()
        searchInput.current?.select()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])
  const importInput = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState("")
  const runImport = async (files: File[]) => {
    setImportStatus(`Importing 0 of ${files.length}…`)
    const result = await gateway.importFiles(files, (done, total) =>
      setImportStatus(`Importing ${Math.min(done + 1, total)} of ${total}…`),
    )
    dispatch({ type: "IMPORT", photos: result.photos })
    const notes = [
      `Imported ${result.photos.length}`,
      result.noPreview.length && `${result.noPreview.length} without embedded preview`,
      result.skipped.length && `${result.skipped.length} skipped`,
    ].filter(Boolean)
    setImportStatus(notes.join(" · "))
  }
  return (
    <section className="screen">
      <ScreenBar
        title="Library / Catalog"
        subtitle={`${visiblePhotos.length} photos · ${importStatus || "Local catalog"}`}
        actions={
          <>
            <label className="search">
              <Icon name="search" size={15} />
              <input
                ref={searchInput}
                value={filters.query}
                placeholder="Search catalog"
                aria-label="Search catalog"
                onChange={(event) =>
                  dispatch({ type: "FILTER", patch: { query: event.target.value } })
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    dispatch({ type: "FILTER", patch: { query: "" } })
                    event.currentTarget.blur()
                  }
                }}
              />
              <kbd>⌘ K</kbd>
            </label>
            <input
              ref={importInput}
              type="file"
              multiple
              hidden
              accept={IMPORT_ACCEPT}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ""
                if (files.length) runImport(files)
              }}
            />
            <Button
              className="secondary-btn"
              disabled={importStatus.startsWith("Importing")}
              title="Import RAW and JPEG files"
              onClick={() => importInput.current?.click()}
            >
              <Icon name="plus" size={15} />
              Import
            </Button>
          </>
        }
      />
      <div className="workspace library-workspace">
        <CatalogSidebar />
        <main className="content-grid">
          <div className="filter-bar">
            <div className="filter-group">
              <Button
                className={`filter-chip ${filters.rating ? "active" : ""}`}
                onClick={() =>
                  dispatch({
                    type: "FILTER",
                    patch: { rating: filters.rating ? 0 : 4 },
                  })
                }
              >
                <Icon name="star" size={13} />
                {filters.rating ? "4+ stars" : "Rating"}
              </Button>
              <Button
                className={`filter-chip ${
                  filters.flag !== "all" ? "active" : ""
                }`}
                onClick={() =>
                  dispatch({
                    type: "FILTER",
                    patch: { flag: filters.flag === "pick" ? "all" : "pick" },
                  })
                }
              >
                <Icon name="flag" size={13} />
                {filters.flag === "pick" ? "Picks" : "Flag"}
              </Button>
              <Button
                className={`filter-chip ${
                  filters.format !== "all" ? "active" : ""
                }`}
                onClick={() =>
                  dispatch({
                    type: "FILTER",
                    patch: { format: filters.format === "RAW" ? "all" : "RAW" },
                  })
                }
              >
                {filters.format === "RAW" ? "RAW" : "File type"}
              </Button>
              <Button
                className={`filter-chip ${filters.editedOnly ? "active" : ""}`}
                onClick={() =>
                  dispatch({
                    type: "FILTER",
                    patch: { editedOnly: !filters.editedOnly },
                  })
                }
              >
                Edited
              </Button>
            </div>
            <div className="filter-group">
              <Button
                className={`filter-chip ${
                  preferences.groupRawJpeg ? "active" : ""
                }`}
                onClick={() =>
                  dispatch({
                    type: "PREFERENCE",
                    key: "groupRawJpeg",
                    value: !preferences.groupRawJpeg,
                  })
                }
              >
                <Icon name="stack" size={13} />
                Group pairs
              </Button>
              <Button
                className="filter-chip"
                onClick={() =>
                  dispatch({
                    type: "SORT",
                    sort:
                      sort === "capture"
                        ? "rating"
                        : sort === "rating"
                          ? "name"
                          : "capture",
                  })
                }
              >
                <Icon name="sort" size={13} />
                {sort}
              </Button>
              <div className="segmented">
                <Button
                  className={density === "large" ? "active" : ""}
                  onClick={() => setDensity("large")}
                >
                  <Icon name="grid" size={14} />
                </Button>
                <Button
                  className={density === "compact" ? "active" : ""}
                  onClick={() => setDensity("compact")}
                >
                  <Icon name="image" size={14} />
                </Button>
              </div>
            </div>
          </div>
          {selectedIds.length > 1 && (
            <div className="selection-bar">
              <span>{selectedIds.length} photos selected</span>
              <div>
                <Button
                  className="ghost-btn"
                  onClick={() => navigate("compare")}
                >
                  Compare
                </Button>
                <Button className="ghost-btn">Add to collection</Button>
              </div>
            </div>
          )}
          <div className={`photo-grid ${density}`}>
            <div className="date-heading">
              <span>June 2025</span>
              <span>{visiblePhotos.length} visible</span>
            </div>
            {visiblePhotos.map((photo) => (
              <PhotoGridCard key={photo.id} photo={photo} navigate={navigate} />
            ))}
          </div>
        </main>
        <Inspector photo={activePhoto} />
      </div>
    </section>
  )
}

