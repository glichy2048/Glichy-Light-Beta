import {
type CSSProperties,type ReactNode
} from "react"
import {
HIST_BINS
} from "../app/develop"
import { useAppState } from "../app/AppState"
import type { ColorLabel,Photo } from "../app/types"

export type IconName = "aperture" | "grid" | "review" | "compare" | "sliders" | "export" | "settings" | "search" | "plus" | "folder" | "chevron" | "star" | "flag" | "reject" | "check" | "image" | "crop" | "transform" | "mask" | "undo" | "redo" | "more" | "close" | "filter" | "sort" | "stack" | "info" | "keyboard" | "history" | "snapshot" | "play" | "pause" | "lock" | "unlock"

export function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  const props = {
    width: size,
    height: size,
    style,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }
  const paths: Record<IconName, ReactNode> = {
    aperture: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m12 3 4 7M20 9l-7 1m5.5 7.5-5.5-5M9 20.5l2-8M4 14l7-3" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    review: (
      <>
        <path d="M4 7h16M4 12h10M4 17h7" />
        <path d="m17 14 3 3-3 3" />
      </>
    ),
    compare: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M12 5v14" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
    export: <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z"
          transform="translate(2)"
        />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    folder: <path d="M3 7.5h6l2-2h10v13H3z" />,
    chevron: <path d="m9 7 5 5-5 5" />,
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
    ),
    flag: <path d="M6 21V4m0 1h11l-2 4 2 4H6" />,
    reject: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m4 17 5-5 4 4 2-2 5 5" />
      </>
    ),
    crop: <path d="M7 3v14h14M3 7h14v14" />,
    transform: (
      <>
        <path d="M5 8V5h3M19 8V5h-3M5 16v3h3M19 16v3h-3" />
        <path d="m9 12 3-3 3 3-3 3z" />
      </>
    ),
    mask: (
      <>
        <circle cx="9" cy="12" r="6" />
        <circle cx="15" cy="12" r="6" />
      </>
    ),
    undo: <path d="M9 8 5 12l4 4m-4-4h9a5 5 0 0 1 5 5" />,
    redo: <path d="m15 8 4 4-4 4m4-4h-9a5 5 0 0 0-5 5" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8z" />,
    sort: <path d="M8 6h12M8 12h8M8 18h4M4 4v16" />,
    stack: (
      <>
        <rect x="5" y="5" width="14" height="14" rx="2" />
        <path d="M8 2h10a4 4 0 0 1 4 4v10" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    keyboard: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10" />
      </>
    ),
    history: (
      <>
        <path d="M4 12a8 8 0 1 0 2-5.3L4 9" />
        <path d="M4 4v5h5M12 8v5l3 2" />
      </>
    ),
    snapshot: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 5V3h8v2M8 10h8M8 14h5" />
      </>
    ),
    play: <path d="m9 6 9 6-9 6z" />,
    pause: <path d="M9 6v12M15 6v12" />,
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    unlock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0a4 4 0 0 1 3.5 2" />
      </>
    ),
  }
  return <svg {...props}>{paths[name]}</svg>
}

export function Button({
  children,
  className = "",
  onClick,
  title,
  pressed,
  disabled,
  style,
}: {
  children?: ReactNode
  className?: string
  onClick?: () => void
  title?: string
  pressed?: boolean
  disabled?: boolean
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={title}
      aria-pressed={pressed}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  )
}

export function PhotoArt({
  tone,
  label,
  src,
  style,
}: {
  tone: Photo["tone"]
  label?: string
  src?: string
  style?: CSSProperties
}) {
  if (src)
    return (
      <div
        className="photo-art has-image"
        style={style}
        role="img"
        aria-label={label ?? "Photograph"}
      >
        <img src={src} alt="" draggable={false} />
      </div>
    )
  return (
    <div
      className={`photo-art photo-art--${tone}`}
      style={style}
      role="img"
      aria-label={label ?? "Landscape photograph"}
    >
      <i className="photo-sun" />
      <i className="photo-ridge far" />
      <i className="photo-ridge mid" />
      <i className="photo-ridge near" />
    </div>
  )
}

export function histPath(bins: number[], max: number) {
  const pts = bins.map(
    (v, i) =>
      `${((i * 240) / (HIST_BINS - 1)).toFixed(1)} ${(72 - Math.min(1, v / max) * 68).toFixed(1)}`,
  )
  return `M0 72 L${pts.join(" L")} L240 72Z`
}

export function Histogram({
  compact = false,
  data,
  channels = { r: true, g: true, b: true, l: false },
}: {
  compact?: boolean
  data?: number[][] | null
  channels?: { r: boolean; g: boolean; b: boolean; l: boolean }
}) {
  const shown = data
    ? data.filter((_, i) => channels[(["r", "g", "b", "l"] as const)[i]])
    : []
  const max = data
    ? Math.max(1, ...shown.flatMap((c) => c.slice(1, -1))) * 1.05
    : 1
  return (
    <div
      className={`histogram ${compact ? "compact" : ""}`}
      aria-label="RGB histogram"
    >
      <svg viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true">
        {data ? (
          <>
            {channels.l && data[3] && <path className="luma" d={histPath(data[3], max)} />}
            {channels.r && <path className="red" d={histPath(data[0], max)} />}
            {channels.g && <path className="green" d={histPath(data[1], max)} />}
            {channels.b && <path className="blue" d={histPath(data[2], max)} />}
          </>
        ) : (
          <>
            <path
              className="red"
              d="M0 69 16 66 28 57 39 61 52 40 67 44 80 22 96 35 110 12 125 27 143 15 158 38 173 31 188 51 204 48 220 64 240 66V72H0Z"
            />
            <path
              className="green"
              d="M0 68 20 63 36 50 55 57 71 31 89 18 105 28 122 8 138 33 156 23 174 40 192 36 207 56 224 60 240 67V72H0Z"
            />
            <path
              className="blue"
              d="M0 69 18 61 34 65 51 48 68 54 84 35 99 43 117 19 132 28 148 12 163 34 180 26 197 46 213 42 226 62 240 66V72H0Z"
            />
          </>
        )}
      </svg>
    </div>
  )
}

export function Rating({
  photo,
  compact = false,
}: {
  photo: Photo
  compact?: boolean
}) {
  const { dispatch } = useAppState()
  return (
    <div
      className={`rating ${compact ? "compact" : ""}`}
      aria-label={`${photo.rating} star rating`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Button
          key={value}
          className={value <= photo.rating ? "star on" : "star"}
          onClick={() =>
            dispatch({
              type: "RATE",
              id: photo.id,
              rating: value === photo.rating ? 0 : value,
            })
          }
          title={`Rate ${value} stars`}
        >
          <Icon name="star" size={compact ? 12 : 15} />
        </Button>
      ))}
    </div>
  )
}

export function MetadataChip({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode
  tone?: string
  icon?: IconName
}) {
  return (
    <span className={`chip chip--${tone}`}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}

export function StatusControls({
  photo,
  dense = false,
}: {
  photo: Photo
  dense?: boolean
}) {
  const { dispatch } = useAppState()
  const labels: ColorLabel[] = ["red", "yellow", "green", "blue", "purple"]
  return (
    <div className={`status-controls ${dense ? "dense" : ""}`}>
      <Button
        className={`status-btn pick ${photo.flag === "pick" ? "active" : ""}`}
        onClick={() =>
          dispatch({
            type: "FLAG",
            id: photo.id,
            flag: photo.flag === "pick" ? "unflagged" : "pick",
          })
        }
        title="Pick (P)"
      >
        <Icon name="flag" size={15} />
        {!dense && "Pick"}
      </Button>
      <Button
        className={`status-btn reject ${
          photo.flag === "reject" ? "active" : ""
        }`}
        onClick={() =>
          dispatch({
            type: "FLAG",
            id: photo.id,
            flag: photo.flag === "reject" ? "unflagged" : "reject",
          })
        }
        title="Reject (X)"
      >
        <Icon name="reject" size={15} />
        {!dense && "Reject"}
      </Button>
      <div className="label-dots">
        {labels.map((label) => (
          <Button
            key={label}
            className={`label-dot ${label} ${
              photo.colorLabel === label ? "active" : ""
            }`}
            onClick={() =>
              dispatch({
                type: "LABEL",
                id: photo.id,
                label: photo.colorLabel === label ? "none" : label,
              })
            }
            title={`${label} label`}
          />
        ))}
      </div>
    </div>
  )
}

export function ScreenBar({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
}) {
  return (
    <div className="screen-bar">
      <div>
        <span className="screen-title">{title}</span>
        <span className="screen-subtitle">{subtitle}</span>
      </div>
      <div className="screen-actions">{actions}</div>
    </div>
  )
}

export function InfoSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="info-section">
      <span className="eyebrow">{title}</span>
      {children}
    </div>
  )
}
export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

export function Filmstrip({ activeId }: { activeId: number }) {
  const { photos, dispatch } = useAppState()
  return (
    <div className="filmstrip">
      <div className="filmstrip-label">
        <span>Current collection</span>
        <span className="caption">{photos.length} photos</span>
      </div>
      <div className="filmstrip-track">
        {photos.map((photo, index) => (
          <Button
            key={photo.id}
            className={`film-thumb ${photo.id === activeId ? "active" : ""}`}
            onClick={() => dispatch({ type: "SELECT", id: photo.id })}
          >
            <PhotoArt tone={photo.tone} src={photo.previewUrl} />
            <span>{index + 1}</span>
            {photo.flag !== "unflagged" && <i className={photo.flag} />}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function Slider({
  label,
  value,
  min = -100,
  max = 100,
  signed = true,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  signed?: boolean
  onChange: (value: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="slider-row">
      <div>
        <span>{label}</span>
        <b>
          {signed && value > 0 ? "+" : ""}
          {value}
        </b>
      </div>
      <div
        className="slider"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          onChange(
            Math.round(
              min + ((event.clientX - box.left) / box.width) * (max - min),
            ),
          )
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight")
            onChange(
              Math.max(
                min,
                Math.min(max, value + (event.key === "ArrowRight" ? 1 : -1)),
              ),
            )
        }}
      >
        <i style={{ width: `${pct}%` }} />
        <b style={{ left: `${pct}%` }} />
      </div>
    </div>
  )
}

export function OptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="option-row">
      <span>{label}</span>
      <Button className="select-control">
        <span>{value}</span>
        <Icon name="chevron" size={12} />
      </Button>
    </div>
  )
}
export function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean
  onClick: () => void
  label: string
}) {
  return (
    <Button
      className={`toggle ${on ? "on" : ""}`}
      onClick={onClick}
      pressed={on}
      title={label}
    >
      <i />
    </Button>
  )
}

export function SettingsBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="settings-block">
      <span className="section-title">{title}</span>
      {children}
    </div>
  )
}

