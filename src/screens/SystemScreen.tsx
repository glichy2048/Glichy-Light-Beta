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
isDebugEnabled,
setDebugEnabled,
runSelfTest,
getAssetLoads,
type SelfTestResult,
} from "../app/diagnostics"
import { useAppState } from "../app/AppState"
import type { View } from "../app/types"
import { Icon,Button,Rating,MetadataChip,StatusControls,ScreenBar,Toggle } from "../components/ui"
import { KeyboardShortcutGuide } from "../components/KeyboardShortcutGuide"

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
        <SystemSection number="06" title="Keyboard shortcut reference guide">
          <KeyboardShortcutGuide />
        </SystemSection>
        <SystemSection number="07" title="Diagnostics & crash reporting">
          <DiagnosticsPanel />
        </SystemSection>
        <SystemSection number="08" title="Android creator & modding architecture">
          <CreatorGuideSection />
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
  const assetLoads = getAssetLoads()
  const [level, setLevel] = useState<"all" | "warn" | "error" | "debug">("all")
  const [selfTestRunning, setSelfTestRunning] = useState(false)
  const [selfTestResults, setSelfTestResults] = useState<SelfTestResult[] | null>(null)
  const debugActive = isDebugEnabled()

  const handleRunSelfTest = async () => {
    setSelfTestRunning(true)
    try {
      const results = await runSelfTest()
      setSelfTestResults(results)
    } finally {
      setSelfTestRunning(false)
    }
  }

  const stats: CatalogStats = {
    photos: photos.length,
    raw: photos.filter((p) => p.format === "RAW").length,
    withPreview: photos.filter((p) => p.previewUrl).length,
    edited: photos.filter((p) => !isNeutral(p.develop)).length,
    saveStatus,
  }
  const shown = logs
    .filter((l) => {
      if (level === "all") return true
      if (level === "debug") return l.level === "debug"
      if (level === "warn") return l.level === "warn" || l.level === "error"
      return l.level === "error"
    })
    .slice(-80)
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

      <div className="debug-toggle-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", margin: "10px 0" }}>
        <div>
          <b style={{ display: "block", fontSize: "13px" }}>Debug Logging (Log.d)</b>
          <small style={{ color: "var(--muted, #888)", fontSize: "11px" }}>
            {debugActive ? "Active: Detailed internal lifecycle, asset load, and reducer traces enabled" : "Paused: Debug-level logs muted to reduce noise"}
          </small>
        </div>
        <Toggle
          on={debugActive}
          onClick={() => setDebugEnabled(!debugActive)}
          label="Toggle debug logging"
        />
      </div>

      <div className="diag-actions">
        <Button className="primary-btn" onClick={() => void downloadReport(stats)}>
          <Icon name="export" size={14} />
          Download report
        </Button>
        <Button className="secondary-btn" disabled={selfTestRunning} onClick={() => void handleRunSelfTest()}>
          <Icon name="check" size={14} />
          {selfTestRunning ? "Testing..." : "Run self-test suite"}
        </Button>
        <Button className="secondary-btn" onClick={clearLogs}>Clear log</Button>
        <Button className="secondary-btn" disabled={!crashes.length} onClick={clearCrashes}>Clear crashes</Button>
        <Button className="ghost-btn" onClick={() => window.setTimeout(() => { throw new Error("Test error from diagnostics panel") })}>
          Trigger test error
        </Button>
      </div>

      {selfTestResults && (
        <div className="self-test-results" style={{ margin: "14px 0", padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <b style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Self-Test & Security Diagnostics</b>
            <small style={{ color: selfTestResults.every(r => r.passed) ? "#4caf50" : "#f44336", fontWeight: "bold" }}>
              {selfTestResults.filter(r => r.passed).length}/{selfTestResults.length} Checks Passed
            </small>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
            {selfTestResults.map((r) => (
              <div key={r.name} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: "4px", borderLeft: `3px solid ${r.passed ? "#4caf50" : "#f44336"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b style={{ fontSize: "11px" }}>{r.name}</b>
                  <small style={{ color: "#aaa" }}>{r.latencyMs}ms</small>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--muted, #999)" }}>{r.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {assetLoads.length > 0 && (
        <details style={{ margin: "10px 0", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "4px" }}>
          <summary style={{ cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
            Asset Load Diagnostics ({assetLoads.length} assets tracked)
          </summary>
          <div style={{ marginTop: "8px", maxHeight: "150px", overflowY: "auto", fontSize: "11px" }}>
            {assetLoads.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span>{a.name} ({a.format})</span>
                <span style={{ color: a.status === "error" ? "#f44336" : "#4caf50" }}>
                  {a.status} {a.timeMs ? `· ${a.timeMs}ms` : ""}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="caption">Reports stay on this device until you export them. Dev server noise (e.g. WebSocket drops) is filtered out; photo names, filesystem paths, and pixels are never included.</p>
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
        {(["all", "warn", "error", "debug"] as const).map((l) => (
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

export function CreatorGuideSection() {
  return (
    <div className="creator-guide" style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "12px", lineHeight: "1.6" }}>
      <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <b style={{ color: "var(--accent, #ff6600)", display: "block", marginBottom: "6px", fontSize: "13px" }}>
          1. Art, Assets & Resource Folder Structure
        </b>
        <p style={{ margin: "0 0 8px 0" }}>
          In an Android creator project, assets must follow strict naming (lowercase letters, numbers, and underscores only; e.g. <code>ic_photo_thumbnail.png</code>):
        </p>
        <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>
          <li><code>app/src/main/res/drawable/</code> - Vectors (XML/SVG) and bitmaps (PNG, JPG, WebP) for UI icons, badges, and illustrations.</li>
          <li><code>app/src/main/res/mipmap/</code> - App launcher icons across density buckets (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi).</li>
          <li><code>app/src/main/res/font/</code> - Custom TTF and OTF typography files.</li>
          <li><code>app/src/main/res/raw/</code> - Bundled raw assets, sample profiles, calibration LUTs, or sound bites.</li>
        </ul>
        <pre style={{ background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "4px", overflowX: "auto", fontSize: "11px" }}>
{`// Jetpack Compose Image Resource Reference:
Image(
    painter = painterResource(id = R.drawable.ic_camera_lens),
    contentDescription = "Camera Lens Icon",
    modifier = Modifier.size(24.dp)
)`}
        </pre>
      </div>

      <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <b style={{ color: "var(--accent, #ff6600)", display: "block", marginBottom: "6px", fontSize: "13px" }}>
          2. Global Typography & Fallback Fonts
        </b>
        <p style={{ margin: "0 0 8px 0" }}>
          Always configure custom fonts through <code>Typography</code> in Compose with fallbacks to avoid crashes when custom fonts fail to load:
        </p>
        <pre style={{ background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "4px", overflowX: "auto", fontSize: "11px" }}>
{`val AppFontFamily = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold)
)

val AppTypography = Typography(
    titleLarge = TextStyle(
        fontFamily = AppFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = AppFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    )
)`}
        </pre>
      </div>

      <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <b style={{ color: "var(--accent, #ff6600)", display: "block", marginBottom: "6px", fontSize: "13px" }}>
          3. Safe Android Modding & Code Editing Workflow
        </b>
        <p style={{ margin: "0 0 8px 0" }}>
          When modding or tailoring functionality:
        </p>
        <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>
          <li><b>Mod-Safe Files:</b> UI components, color palettes (<code>Theme.kt</code>), asset drawables, and strings.</li>
          <li><b>Preserve Core Architecture:</b> Keep ViewModels, database models, and repository contracts intact; pass custom callbacks or modifier extensions.</li>
          <li><b>Diagnostics Always On:</b> Use <code>Log.d(TAG, "...")</code> for state transitions and null checks so mod errors can be diagnosed in Logcat.</li>
        </ul>
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

