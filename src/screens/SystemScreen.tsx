import {
useSyncExternalStore,useState,type ReactNode
} from "react"
import {
isNeutral
} from "../app/develop"
import {
clearCrashes,
clearLogs,
downloadReport,
getCrashes,
getLogs,
subscribeDiagnostics,
diagnosticsVersion,
type CatalogStats,
} from "../app/diagnostics"
import { useAppState } from "../app/AppState"
import type { View } from "../app/types"
import { Icon,Button,Rating,MetadataChip,StatusControls,ScreenBar } from "../components/ui"

export function SystemScreen({ navigate }: { navigate: (view: View) => void }) {
  const { activePhoto } = useAppState()
  return (
    <section className="screen system-screen">
      <ScreenBar
        title="Glichylight UI System"
        subtitle="Tokens, interaction states, and workflow rationale"
        actions={
          <Button
            className="secondary-btn"
            onClick={() => navigate("settings")}
          >
            <Icon name="chevron" size={14} />
            Back to settings
          </Button>
        }
      />
      <main className="system-content">
        <div className="system-intro">
          <div>
            <span className="system-kicker">DESKTOP PRODUCT SYSTEM · V1.0</span>
            <span className="system-display">
              Designed for decisive, eyes-on-image workflows.
            </span>
          </div>
          <p>
            Dark, quiet surfaces keep attention on photography. Warm orange is
            reserved for active tools and primary actions; green and red
            communicate irreversible review intent without borrowing the product
            accent.
          </p>
        </div>
        <SystemSection number="01" title="Color & surfaces">
          <div className="swatches">
            {[
              ["Canvas", "canvas"],
              ["Charcoal", "charcoal"],
              ["Slate", "slate"],
              ["Muted", "muted"],
              ["Accent", "accent"],
              ["Pick", "pick"],
              ["Reject", "reject"],
              ["Label", "yellow"],
            ].map(([name, token]) => (
              <div className="swatch" key={name}>
                <i className={token} />
                <span>{name}</span>
                <small>--{token}</small>
              </div>
            ))}
          </div>
        </SystemSection>
        <SystemSection number="02" title="Typography">
          <div className="type-specimens">
            <div>
              <small>TITLE · 18/24 · 600</small>
              <span className="type-title">Library / Catalog</span>
            </div>
            <div>
              <small>SECTION · 14/20 · 600</small>
              <span className="type-section">Capture metadata</span>
            </div>
            <div>
              <small>LABEL · 12/18 · 500</small>
              <span className="type-label">Original filename</span>
            </div>
            <div>
              <small>CAPTION · 10/16 · 400</small>
              <span className="type-caption">6000 × 4000 · ISO 100</span>
            </div>
          </div>
        </SystemSection>
        <SystemSection number="03" title="Spacing">
          <div className="spacing-spec">
            {[4, 8, 12, 16, 24, 32].map((value) => (
              <div key={value}>
                <i style={{ width: `${value * 2}px` }} />
                <span>{value}</span>
              </div>
            ))}
          </div>
        </SystemSection>
        <SystemSection number="04" title="Controls & states">
          <div className="control-spec">
            <Button className="primary-btn">Primary action</Button>
            <Button className="secondary-btn">Secondary</Button>
            <Button className="ghost-btn">Tertiary</Button>
            <Button className="primary-btn pressed">Pressed</Button>
            <Button className="primary-btn" disabled>
              Disabled
            </Button>
          </div>
          <div className="component-spec">
            <Rating photo={activePhoto} />
            <StatusControls photo={activePhoto} />
            <div className="chip-row">
              <MetadataChip>RAW</MetadataChip>
              <MetadataChip icon="star">5</MetadataChip>
              <MetadataChip tone="pick">Pick</MetadataChip>
              <MetadataChip tone="reject">Rejected</MetadataChip>
              <MetadataChip tone="yellow">Yellow</MetadataChip>
            </div>
          </div>
        </SystemSection>
        <SystemSection number="05" title="Information architecture">
          <div className="ia-flow">
            {["Library", "Review", "Compare", "Develop", "Export"].map(
              (item, index) => (
                <div key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{item}</b>
                  {index < 4 && <Icon name="chevron" size={14} />}
                </div>
              ),
            )}
          </div>
          <div className="rationale-grid">
            <div>
              <b>Three-pane density</b>
              <p>
                Stable navigation, a flexible image-first center, and contextual
                controls keep the desktop workflow spatially predictable.
              </p>
            </div>
            <div>
              <b>Controlled accent</b>
              <p>
                Orange marks focus and forward action. It never competes with
                pick, reject, or image-label semantics.
              </p>
            </div>
            <div>
              <b>Non-destructive by default</b>
              <p>
                Source files remain visually and conceptually separate from
                ratings, decisions, and edit instructions.
              </p>
            </div>
          </div>
        </SystemSection>
        <SystemSection number="06" title="Diagnostics & crash reporting">
          <DiagnosticsPanel />
        </SystemSection>
      </main>
    </section>
  )
}

export function DiagnosticsPanel() {
  const { photos, saveStatus } = useAppState()
  useSyncExternalStore(subscribeDiagnostics, diagnosticsVersion)
  const logs = getLogs()
  const crashes = getCrashes()
  const [level, setLevel] = useState<"all" | "warn" | "error">("all")
  const stats: CatalogStats = {
    photos: photos.length,
    raw: photos.filter((p) => p.format === "RAW").length,
    withPreview: photos.filter((p) => p.previewUrl).length,
    edited: photos.filter((p) => !isNeutral(p.develop)).length,
    saveStatus,
  }
  const shown = logs
    .filter((l) => level === "all" || (level === "warn" ? l.level !== "info" && l.level !== "debug" : l.level === "error"))
    .slice(-60)
    .reverse()
  return (
    <div className="diagnostics">
      <div className="diag-stats">
        <div><b>{stats.photos}</b><small>photos</small></div>
        <div><b>{stats.withPreview}</b><small>with preview</small></div>
        <div><b>{stats.edited}</b><small>edited</small></div>
        <div><b>{crashes.length}</b><small>crashes</small></div>
        <div><b>{saveStatus}</b><small>catalog save</small></div>
      </div>
      <div className="diag-actions">
        <Button className="primary-btn" onClick={() => void downloadReport(stats)}>
          <Icon name="export" size={14} />
          Download report
        </Button>
        <Button className="secondary-btn" onClick={clearLogs}>Clear log</Button>
        <Button className="secondary-btn" disabled={!crashes.length} onClick={clearCrashes}>Clear crashes</Button>
        <Button className="ghost-btn" onClick={() => window.setTimeout(() => { throw new Error("Test error from diagnostics panel") })}>
          Trigger test error
        </Button>
      </div>
      <p className="caption">Reports stay on this device until you export them. They never include photo names, paths or pixels.</p>
      {crashes.length > 0 && (
        <div className="diag-crashes">
          {crashes.slice(0, 3).map((c) => (
            <details key={c.id}>
              <summary>
                <b>{c.kind}</b> {c.message} <small>{new Date(c.at).toLocaleString()} · {c.view}</small>
              </summary>
              <pre>{c.stack}{c.componentStack}</pre>
            </details>
          ))}
        </div>
      )}
      <div className="diag-filter">
        {(["all", "warn", "error"] as const).map((l) => (
          <Button key={l} className={`ghost-btn ${level === l ? "pressed" : ""}`} onClick={() => setLevel(l)}>{l}</Button>
        ))}
      </div>
      <div className="diag-log" role="log">
        {shown.length === 0 && <small className="caption">No entries.</small>}
        {shown.map((l, i) => (
          <div key={`${l.at}-${i}`} className={`diag-line ${l.level}`}>
            <time>{new Date(l.at).toLocaleTimeString()}</time>
            <span>{l.source}</span>
            <p>{l.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SystemSection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="system-section">
      <div className="system-section-title">
        <span>{number}</span>
        <b>{title}</b>
      </div>
      <div>{children}</div>
    </section>
  )
}

