import {
useRef,
useState
} from "react"
import {
BUILTIN_PRESETS,
canPickDirectory,
outputName,
pickDirectory,
runExport,
type Destination,
type ExportSettings,
type ExportSummary,
type ItemStatus,
} from "../app/exporter"
import { useAppState } from "../app/AppState"
import { Icon,Button,PhotoArt,MetadataChip,ScreenBar,Slider,Toggle,SettingsBlock } from "../components/ui"

export const USER_PRESETS_KEY = "glichylight.exportPresets"

export function loadUserPresets(): { name: string; settings: ExportSettings }[] {
  try {
    const raw = JSON.parse(localStorage.getItem(USER_PRESETS_KEY) ?? "[]")
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export const formatBytes = (n: number) =>
  n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

export function SelectRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (value: T) => void
}) {
  return (
    <label className="option-row">
      <span>{label}</span>
      <select
        className="select-control native"
        value={value}
        onChange={(event) => {
          const match = options.find(([v]) => String(v) === event.target.value)
          if (match) onChange(match[0])
        }}
      >
        {options.map(([v, text]) => (
          <option key={String(v)} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ExportScreen() {
  const { selectedIds, photos } = useAppState()
  const selected = photos.filter((photo) => selectedIds.includes(photo.id))
  const queue = selected.length ? selected : photos.slice(0, 8)
  const [preset, setPreset] = useState(BUILTIN_PRESETS[1].name)
  const [settings, setSettings] = useState<ExportSettings>(BUILTIN_PRESETS[1].settings)
  const [userPresets, setUserPresets] = useState(loadUserPresets)
  const [dest, setDest] = useState<Destination>({ kind: "download" })
  const [items, setItems] = useState<ItemStatus[]>([])
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<ExportSummary | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const patch = (next: Partial<ExportSettings>) => {
    setSettings((current) => ({ ...current, ...next }))
    setPreset("Custom")
  }
  const choosePreset = (name: string, next: ExportSettings) => {
    setPreset(name)
    setSettings(next)
  }
  const savePreset = () => {
    const name = window.prompt("Name this export preset")?.trim()
    if (!name) return
    const next = [...userPresets.filter((p) => p.name !== name), { name, settings }]
    setUserPresets(next)
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(next))
    setPreset(name)
  }
  const deletePreset = (name: string) => {
    const next = userPresets.filter((p) => p.name !== name)
    setUserPresets(next)
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(next))
  }
  const choose = async () => {
    const handle = await pickDirectory()
    if (handle) setDest({ kind: "directory", handle })
  }
  const start = async () => {
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setSummary(null)
    const batch = queue
    setItems(batch.map(() => ({ state: "waiting" })))
    const result = await runExport(batch, settings, dest, {
      signal: controller.signal,
      onItem: (index, status) =>
        setItems((current) => {
          const next = current.slice()
          next[index] = status
          return next
        }),
    })
    setSummary(result)
    setRunning(false)
  }
  const finished = items.filter((i) => i.state === "done" || i.state === "error").length
  const percent = items.length ? Math.round((finished / items.length) * 100) : 0
  const sample = items.find((i) => i.state === "done")
  const previewName = outputName(queue[0], 0, settings, new Set())
  const destLabel =
    dest.kind === "directory" ? dest.handle.name : "Browser downloads"
  const headline = running
    ? `Exporting ${Math.min(finished + 1, items.length)} of ${items.length}`
    : summary
      ? summary.cancelled
        ? `Cancelled · ${summary.exported} exported`
        : summary.failed
          ? `${summary.exported} exported · ${summary.failed} failed`
          : "Export complete"
      : "Ready to export"
  const deliveryNote =
    summary?.delivery === "directory"
      ? `Saved to ${destLabel}`
      : summary?.delivery === "zip"
        ? "Downloaded as a ZIP archive"
        : summary?.delivery === "download"
          ? "Downloaded"
          : ""
  return (
    <section className="screen">
      <ScreenBar
        title="Export / Deliver"
        subtitle={`${queue.length} photos queued · ${preset}`}
        actions={
          <Button className="secondary-btn" onClick={choose} disabled={!canPickDirectory()}>
            <Icon name="folder" size={15} />
            Choose folder
          </Button>
        }
      />
      <div className="workspace export-workspace">
        <aside className="sidebar export-presets">
          <div className="panel-title">
            <span>Export presets</span>
            <Button className="mini-btn" onClick={savePreset} title="Save current settings as preset">
              <Icon name="plus" size={14} />
            </Button>
          </div>
          <span className="eyebrow">Built in</span>
          {BUILTIN_PRESETS.map((p) => (
            <Button
              key={p.name}
              className={`preset-row ${preset === p.name ? "active" : ""}`}
              onClick={() => choosePreset(p.name, p.settings)}
            >
              <span>
                <Icon name="export" size={14} />
                {p.name}
              </span>
              <Icon name="chevron" size={12} />
            </Button>
          ))}
          <span className="eyebrow section-gap">User presets</span>
          {userPresets.length === 0 && (
            <small className="caption">Use + to save the current settings.</small>
          )}
          {userPresets.map((p) => (
            <div key={p.name} className="preset-with-delete">
              <Button
                className={`preset-row ${preset === p.name ? "active" : ""}`}
                onClick={() => choosePreset(p.name, p.settings)}
              >
                <span>
                  <Icon name="export" size={14} />
                  {p.name}
                </span>
              </Button>
              <Button className="mini-btn" title={`Delete ${p.name}`} onClick={() => deletePreset(p.name)}>
                <Icon name="close" size={12} />
              </Button>
            </div>
          ))}
        </aside>
        <main className="export-settings">
          <SettingsBlock title="Destination">
            <div className="destination-card">
              <span>
                <Icon name="folder" />
              </span>
              <div>
                <b>{destLabel}</b>
                <small>
                  {dest.kind === "directory"
                    ? "Files are written directly to this folder"
                    : canPickDirectory()
                      ? "Several photos download as one ZIP"
                      : "Several photos download as one ZIP · folder picking needs Chrome or Edge"}
                </small>
              </div>
              {dest.kind === "directory" ? (
                <Button className="secondary-btn" onClick={() => setDest({ kind: "download" })}>
                  Use downloads
                </Button>
              ) : (
                <Button className="secondary-btn" onClick={choose} disabled={!canPickDirectory()}>
                  Choose
                </Button>
              )}
            </div>
          </SettingsBlock>
          <SettingsBlock title="File settings">
            <SelectRow
              label="Format"
              value={settings.format}
              options={[["jpeg", "JPEG"], ["png", "PNG"], ["tiff", "TIFF · 8-bit"]]}
              onChange={(format) => patch({ format })}
            />
            {settings.format === "jpeg" && (
              <Slider
                label="Quality"
                value={settings.quality}
                min={40}
                max={100}
                signed={false}
                onChange={(quality) => patch({ quality })}
              />
            )}
            <SelectRow
              label="File naming"
              value={settings.naming}
              options={[
                ["original", "Original name"],
                ["sequence", "Original + sequence"],
                ["custom", "Custom prefix + sequence"],
              ]}
              onChange={(naming) => patch({ naming })}
            />
            {settings.naming === "custom" && (
              <label className="option-row">
                <span>Prefix</span>
                <input
                  className="select-control native"
                  value={settings.prefix}
                  placeholder="export"
                  onChange={(event) => patch({ prefix: event.target.value })}
                />
              </label>
            )}
          </SettingsBlock>
          <SettingsBlock title="Image sizing">
            <SelectRow
              label="Resize"
              value={settings.resize}
              options={[["original", "Original dimensions"], ["long-edge", "Long edge"]]}
              onChange={(resize) => patch({ resize })}
            />
            {settings.resize === "long-edge" && (
              <SelectRow
                label="Long edge"
                value={settings.longEdge}
                options={[[1024, "1024 px"], [1600, "1600 px"], [2048, "2048 px"], [3000, "3000 px"], [4096, "4096 px"]]}
                onChange={(longEdge) => patch({ longEdge })}
              />
            )}
            <SelectRow
              label="Output sharpening"
              value={settings.sharpen}
              options={[["none", "None"], ["standard", "Screen · Standard"], ["high", "Screen · High"]]}
              onChange={(sharpen) => patch({ sharpen })}
            />
            <small className="caption">
              Imported RAW files export from their embedded preview, never smaller than it.
            </small>
          </SettingsBlock>
          <SettingsBlock title="Copyright watermark">
            <div className="toggle-row">
              <div>
                <span>Watermark image</span>
                <small>Embed a visible copyright or attribution watermark on export</small>
              </div>
              <Toggle
                on={!!settings.watermark}
                onClick={() => patch({ watermark: !settings.watermark })}
                label="Toggle watermark"
              />
            </div>
            {settings.watermark && (
              <>
                <label className="option-row" style={{ marginTop: "8px" }}>
                  <span>Watermark text</span>
                  <input
                    className="select-control native"
                    value={settings.watermarkText ?? "© Glichylight"}
                    placeholder="© Your Name"
                    onChange={(event) => patch({ watermarkText: event.target.value })}
                  />
                </label>
                <SelectRow
                  label="Position"
                  value={settings.watermarkPosition ?? "bottom-right"}
                  options={[
                    ["bottom-right", "Bottom right"],
                    ["bottom-left", "Bottom left"],
                    ["top-right", "Top right"],
                    ["top-left", "Top left"],
                    ["center", "Center overlay"],
                  ]}
                  onChange={(watermarkPosition) => patch({ watermarkPosition })}
                />
                <SelectRow
                  label="Size"
                  value={settings.watermarkSize ?? "medium"}
                  options={[
                    ["small", "Small · Subtle"],
                    ["medium", "Medium · Standard"],
                    ["large", "Large · Bold"],
                  ]}
                  onChange={(watermarkSize) => patch({ watermarkSize })}
                />
                <SelectRow
                  label="Style"
                  value={settings.watermarkStyle ?? "shadow"}
                  options={[
                    ["shadow", "Drop shadow"],
                    ["pill", "Translucent pill badge"],
                    ["clean", "Clean white text"],
                  ]}
                  onChange={(watermarkStyle) => patch({ watermarkStyle })}
                />
                <Slider
                  label="Opacity"
                  value={settings.watermarkOpacity ?? 80}
                  min={10}
                  max={100}
                  signed={false}
                  onChange={(watermarkOpacity) => patch({ watermarkOpacity })}
                />
              </>
            )}
          </SettingsBlock>
          <SettingsBlock title="Metadata & Copyright encoding">
            <SelectRow
              label="Metadata policy"
              value={settings.metadataPolicy ?? (settings.metadata ? "all" : "copyright")}
              options={[
                ["all", "All metadata (EXIF + Copyright)"],
                ["copyright", "Copyright & Creator only"],
                ["none", "Strip all metadata (Private)"],
              ]}
              onChange={(metadataPolicy) => patch({ metadataPolicy, metadata: metadataPolicy !== "none" })}
            />
            {settings.metadataPolicy !== "none" && (
              <>
                <label className="option-row">
                  <span>Artist / Creator</span>
                  <input
                    className="select-control native"
                    value={settings.creator ?? ""}
                    placeholder="Photographer name"
                    onChange={(event) => patch({ creator: event.target.value })}
                  />
                </label>
                <label className="option-row">
                  <span>Copyright notice</span>
                  <input
                    className="select-control native"
                    value={settings.copyrightNotice ?? "© 2026 Glichylight. All rights reserved."}
                    placeholder="© 2026 Your Name. All rights reserved."
                    onChange={(event) => patch({ copyrightNotice: event.target.value })}
                  />
                </label>
                <div className={`toggle-row ${settings.format === "jpeg" ? "" : "disabled"}`}>
                  <div>
                    <span>Include camera EXIF</span>
                    <small>
                      {settings.format === "jpeg"
                        ? "Embed camera, lens, exposure, shutter, and capture date"
                        : "Only embedded in JPEG format"}
                    </small>
                  </div>
                  <Toggle
                    on={settings.metadata && settings.format === "jpeg"}
                    onClick={() => patch({ metadata: !settings.metadata })}
                    label="Include metadata"
                  />
                </div>
              </>
            )}
          </SettingsBlock>
        </main>
        <aside className="export-delivery">
          <div className="panel-title">
            <span>Output preview</span>
            <span className="caption">
              {sample?.bytes ? `${settings.format.toUpperCase()} · ${formatBytes(sample.bytes)}` : settings.format.toUpperCase()}
            </span>
          </div>
          <div className="export-image" style={{ position: "relative", overflow: "hidden" }}>
            <PhotoArt tone={queue[0].tone} src={queue[0].previewUrl} />
            {settings.watermark && (
              <div
                style={{
                  position: "absolute",
                  padding: "5px 10px",
                  pointerEvents: "none",
                  fontSize:
                    settings.watermarkSize === "small"
                      ? "10px"
                      : settings.watermarkSize === "large"
                        ? "14px"
                        : "12px",
                  fontWeight: 600,
                  color: "#ffffff",
                  opacity: (settings.watermarkOpacity ?? 80) / 100,
                  ...((() => {
                    const pos = settings.watermarkPosition ?? "bottom-right"
                    if (pos === "bottom-left") return { bottom: "10px", left: "10px" }
                    if (pos === "top-right") return { top: "10px", right: "10px" }
                    if (pos === "top-left") return { top: "10px", left: "10px" }
                    if (pos === "center") return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
                    return { bottom: "10px", right: "10px" }
                  })()),
                  ...(settings.watermarkStyle === "pill"
                    ? {
                        background: "rgba(15, 14, 12, 0.72)",
                        borderRadius: "14px",
                        border: "1px solid rgba(232, 163, 61, 0.45)",
                      }
                    : settings.watermarkStyle === "shadow"
                      ? { textShadow: "0 2px 6px rgba(0,0,0,0.95)" }
                      : {}),
                }}
              >
                {settings.watermarkText || "© Glichylight"}
              </div>
            )}
          </div>
          <div className="output-summary">
            <div>
              <b>{sample?.name ?? previewName}</b>
              <span className="caption">
                {sample?.width ? `${sample.width} × ${sample.height} px · sRGB` : "sRGB"}
              </span>
            </div>
            <MetadataChip>{settings.format.toUpperCase()}</MetadataChip>
          </div>
          <div className="queue-list">
            {queue.slice(0, 6).map((photo, index) => {
              const item = items[index]
              return (
                <div className="queue-row" key={photo.id}>
                  <span>
                    <PhotoArt tone={photo.tone} src={photo.previewUrl} />
                  </span>
                  <div>
                    <b>{item?.name ?? photo.name}</b>
                    <small>
                      {item?.state === "error"
                        ? item.error
                        : item?.state === "rendering"
                          ? "Rendering…"
                          : item?.state === "done"
                            ? "Done"
                            : "Waiting"}
                    </small>
                  </div>
                  {item?.state === "done" ? (
                    <i className="queue-check">
                      <Icon name="check" size={12} />
                    </i>
                  ) : (
                    <span className="caption">{item?.state === "error" ? "Failed" : ""}</span>
                  )}
                </div>
              )
            })}
            {queue.length > 6 && <small className="caption">+ {queue.length - 6} more</small>}
          </div>
          <div className="export-progress">
            <div>
              <span>{headline}</span>
              <b>{percent}%</b>
            </div>
            <div className="progress large">
              <i style={{ width: `${percent}%` }} />
            </div>
            {summary && (
              <small className="caption">
                {formatBytes(summary.bytes)} total{deliveryNote ? ` · ${deliveryNote}` : ""}
              </small>
            )}
          </div>
          {running ? (
            <Button className="secondary-btn full" onClick={() => abortRef.current?.abort()}>
              <Icon name="close" size={16} />
              Cancel export
            </Button>
          ) : (
            <Button
              className={`primary-btn full deliver-btn ${summary && !summary.cancelled && !summary.failed ? "success" : ""}`}
              onClick={start}
            >
              <Icon name={summary && !summary.failed && !summary.cancelled ? "check" : "export"} size={16} />
              {summary ? "Export again" : `Export ${queue.length} photos`}
            </Button>
          )}
        </aside>
      </div>
    </section>
  )
}

