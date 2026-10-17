import { useState, useMemo } from "react"
import { Icon } from "./ui"
import { Log } from "../app/diagnostics"

export type ShortcutCategory =
  | "all"
  | "navigation"
  | "culling"
  | "develop"
  | "compare"
  | "library"

export type ShortcutItem = {
  id: string
  keys: string[]
  action: string
  description: string
  category: "navigation" | "culling" | "develop" | "compare" | "library"
  scope: string
  modifier?: string
}

export const SHORTCUTS_DATA: ShortcutItem[] = [
  // Navigation & Global
  {
    id: "nav-library",
    keys: ["G"],
    action: "Library / Grid View",
    description: "Switch to full catalog grid to organize, filter, and inspect photos",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "nav-review",
    keys: ["E"],
    action: "Review / Culling Stage",
    description: "Open single-image loupe view for rapid inspection and decisive culling",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "nav-compare",
    keys: ["C"],
    action: "Compare Mode",
    description: "Enter side-by-side or multi-candidate synchronized compare mode",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "nav-develop",
    keys: ["D"],
    action: "Develop Screen",
    description: "Open full develop tools: tone controls, curves, color grading, and optics",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "global-undo",
    keys: ["⌘ / Ctrl", "Z"],
    action: "Undo Adjustment",
    description: "Revert the latest tone, crop, rating, or flag modification",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "global-redo",
    keys: ["⌘ / Ctrl", "Y"],
    action: "Redo Adjustment",
    description: "Reapply previously undone adjustment (or ⇧ ⌘ Z)",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "global-copy",
    keys: ["⌘ / Ctrl", "C"],
    action: "Copy Recipe",
    description: "Copy all tone adjustments and develop settings from active photo",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "global-paste",
    keys: ["⌘ / Ctrl", "V"],
    action: "Paste Recipe",
    description: "Apply copied develop recipe across active or batch-selected photos",
    category: "navigation",
    scope: "Global",
  },
  {
    id: "global-reject",
    keys: ["J"],
    action: "Quick Reject",
    description: "Instantly flag active photo as rejected from any screen",
    category: "navigation",
    scope: "Global",
  },

  // Culling & Review
  {
    id: "review-pick",
    keys: ["P"],
    action: "Flag as Pick",
    description: "Mark photo as a keeper (triggers auto-advance if enabled in settings)",
    category: "culling",
    scope: "Review & Compare",
  },
  {
    id: "review-reject",
    keys: ["X"],
    action: "Flag as Reject",
    description: "Flag photo for rejection and culling (triggers auto-advance)",
    category: "culling",
    scope: "Review & Compare",
  },
  {
    id: "review-unflag",
    keys: ["U"],
    action: "Clear Flag",
    description: "Reset flag decision back to unflagged neutral state",
    category: "culling",
    scope: "Review",
  },
  {
    id: "review-rate",
    keys: ["1 – 5"],
    action: "Set Star Rating",
    description: "Directly assign 1 to 5 star rating to active photo",
    category: "culling",
    scope: "Review",
  },
  {
    id: "review-rate-zero",
    keys: ["0"],
    action: "Clear Rating",
    description: "Reset star rating to 0 (unrated)",
    category: "culling",
    scope: "Review",
  },
  {
    id: "review-next",
    keys: ["→"],
    action: "Next Photo",
    description: "Advance to the next image in the catalog filmstrip",
    category: "culling",
    scope: "Review & Develop",
  },
  {
    id: "review-prev",
    keys: ["←"],
    action: "Previous Photo",
    description: "Step backward to the previous image in collection",
    category: "culling",
    scope: "Review & Develop",
  },

  // Develop & Optics
  {
    id: "dev-before-after",
    keys: ["\\"],
    action: "Before / After Toggle",
    description: "Toggle between unprocessed RAW original and current edited state",
    category: "develop",
    scope: "Develop",
  },
  {
    id: "dev-cycle-layout",
    keys: ["Y"],
    action: "Cycle Comparison Modes",
    description: "Cycle Before/After layout: Single toggle, Split L/R, Split T/B, or Side-by-Side",
    category: "develop",
    scope: "Develop",
  },
  {
    id: "dev-zoom",
    keys: ["Z"],
    action: "Toggle 1:1 Zoom",
    description: "Toggle between Fit-in-window and 100% 1:1 pixel inspection zoom",
    category: "develop",
    scope: "Develop",
  },
  {
    id: "dev-clipping",
    keys: ["O"],
    action: "Clipping Warning Masks",
    description: "Toggle blue shadow underexposure and red highlight blowout overlays",
    category: "develop",
    scope: "Develop",
  },
  {
    id: "dev-lock-scroll",
    keys: ["L"],
    action: "Lock Center Scroll",
    description: "Lock main image stage scroll wheel to sidebar adjust controls",
    category: "develop",
    scope: "Develop",
  },
  {
    id: "dev-lens-enter",
    keys: ["Enter"],
    action: "Pre-select Filtered Lens",
    description: "In Optics search box, instantly pre-select top matching Sony lens profile",
    category: "develop",
    scope: "Develop Optics",
  },
  {
    id: "dev-lens-esc",
    keys: ["Esc"],
    action: "Reset Lens Search",
    description: "Clear active Sony lens search input and restore popular chip shortcuts",
    category: "develop",
    scope: "Develop Optics",
  },

  // Compare & Selection Mode
  {
    id: "cmp-select-winner",
    keys: ["S"],
    action: "Set Select / Winner",
    description: "Mark active candidate as chosen selection winner among candidate pool",
    category: "compare",
    scope: "Compare",
  },
  {
    id: "cmp-zoom-cycle",
    keys: ["Z"],
    action: "Cycle Candidate Zoom",
    description: "Step candidate zoom levels across synchronized candidate inspection stages",
    category: "compare",
    scope: "Compare",
  },
  {
    id: "cmp-navigate",
    keys: ["← / →"],
    action: "Step Candidate Focus",
    description: "Cycle keyboard focus across candidates in the comparison pool",
    category: "compare",
    scope: "Compare",
  },
  {
    id: "cmp-remove",
    keys: ["Delete / ⌫"],
    action: "Remove Candidate",
    description: "Exclude candidate photo from comparison pool without deleting from disk",
    category: "compare",
    scope: "Compare",
  },
  {
    id: "cmp-develop-winner",
    keys: ["Enter"],
    action: "Develop Winner",
    description: "Open the chosen select winner directly into the Develop screen",
    category: "compare",
    scope: "Compare",
  },
  {
    id: "cmp-reset-winner",
    keys: ["Esc"],
    action: "Reset Winner",
    description: "Clear the current select winner candidate designation",
    category: "compare",
    scope: "Compare",
  },

  // Library & Search
  {
    id: "lib-search",
    keys: ["⌘ / Ctrl", "K"],
    action: "Focus Catalog Search",
    description: "Instantly jump focus into the catalog search field and select query text",
    category: "library",
    scope: "Library",
  },
  {
    id: "lib-clear-search",
    keys: ["Esc"],
    action: "Clear Search Query",
    description: "Reset catalog query filter and blur search input field",
    category: "library",
    scope: "Library",
  },
  {
    id: "lib-multi-select",
    keys: ["⇧ / ⌘", "Click"],
    action: "Multi-Selection",
    description: "Select contiguous ranges (Shift) or toggle individual photos (Cmd/Ctrl) for batch recipe paste",
    category: "library",
    scope: "Library Grid",
  },
]

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  all: "All Shortcuts",
  navigation: "Navigation & Global",
  culling: "Culling & Review",
  develop: "Develop & Optics",
  compare: "Compare & Select",
  library: "Library & Search",
}

export function KeyboardShortcutGuide() {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<ShortcutCategory>("all")
  const [displayMode, setDisplayMode] = useState<"cards" | "table">("cards")
  const [copiedStatus, setCopiedStatus] = useState(false)

  const handleCategoryChange = (cat: ShortcutCategory) => {
    setActiveCategory(cat)
    Log.d("SystemReference", `Shortcut category filtered: ${cat}`)
  }

  const handleQueryChange = (text: string) => {
    setQuery(text)
    if (text.length > 2) {
      Log.d("SystemReference", `Shortcut search query: "${text}"`)
    }
  }

  const filteredShortcuts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SHORTCUTS_DATA.filter((s) => {
      const matchCategory =
        activeCategory === "all" || s.category === activeCategory
      if (!matchCategory) return false

      if (!q) return true
      return (
        s.action.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.scope.toLowerCase().includes(q) ||
        s.keys.some((k) => k.toLowerCase().includes(q))
      )
    })
  }, [activeCategory, query])

  const copyCheatSheet = () => {
    const text = SHORTCUTS_DATA.map(
      (s) => `[${s.keys.join(" + ")}] - ${s.action}: ${s.description} (${s.scope})`
    ).join("\n")

    navigator.clipboard?.writeText(text).then(() => {
      setCopiedStatus(true)
      setTimeout(() => setCopiedStatus(false), 2000)
    })
  }

  return (
    <div className="shortcut-guide-container">
      {/* Intro Header */}
      <div className="shortcut-guide-header">
        <div className="shortcut-guide-header-title">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="shortcut-guide-icon-badge">
              <Icon name="keyboard" size={16} />
            </span>
            <b style={{ fontSize: "14px", color: "var(--text)" }}>
              Keyboard Workflow & Productivity Shortcuts
            </b>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "12px", lineHeight: "17px" }}>
            Designed for eyes-on-image speed. Keep hands on the keyboard during review,
            rating, develop comparisons, and lens calibration.
          </p>
        </div>

        <div className="shortcut-guide-header-actions">
          <button
            type="button"
            className="shortcut-view-toggle-btn"
            onClick={() => setDisplayMode((m) => (m === "cards" ? "table" : "cards"))}
            title="Toggle between Card Grid and Compact Table view"
          >
            {displayMode === "cards" ? "Compact Table" : "Grid Cards"}
          </button>
          <button
            type="button"
            className="shortcut-copy-btn"
            onClick={copyCheatSheet}
            title="Copy plain-text cheat sheet to clipboard"
          >
            {copiedStatus ? "Copied!" : "Copy Cheat Sheet"}
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Filter Pills */}
      <div className="shortcut-guide-toolbar">
        <div className="shortcut-search-wrap">
          <svg
            className="shortcut-search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="shortcut-search-input"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search shortcuts by key or action (e.g. pick, zoom, copy, \\, Y)..."
            aria-label="Filter keyboard shortcuts"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="shortcut-search-clear"
              onClick={() => handleQueryChange("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="shortcut-category-pills">
          {(
            [
              "all",
              "navigation",
              "culling",
              "develop",
              "compare",
              "library",
            ] as const
          ).map((cat) => {
            const count =
              cat === "all"
                ? SHORTCUTS_DATA.length
                : SHORTCUTS_DATA.filter((s) => s.category === cat).length
            const isSelected = activeCategory === cat
            return (
              <button
                key={cat}
                type="button"
                className={`shortcut-category-pill ${isSelected ? "active" : ""}`}
                onClick={() => handleCategoryChange(cat)}
              >
                <span>{CATEGORY_LABELS[cat]}</span>
                <small className="shortcut-category-count">{count}</small>
              </button>
            )
          })}
        </div>
      </div>

      {/* Result Status / Summary */}
      <div className="shortcut-result-bar">
        <span>
          Showing <strong>{filteredShortcuts.length}</strong> of{" "}
          {SHORTCUTS_DATA.length} shortcuts
        </span>
        {query && (
          <button
            type="button"
            className="shortcut-reset-filter-link"
            onClick={() => {
              setQuery("")
              setActiveCategory("all")
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Shortcuts List: Cards or Table */}
      {filteredShortcuts.length > 0 ? (
        displayMode === "cards" ? (
          <div className="shortcut-grid">
            {filteredShortcuts.map((shortcut) => (
              <div key={shortcut.id} className="shortcut-card">
                <div className="shortcut-card-top">
                  <div className="shortcut-keys">
                    {shortcut.keys.map((k, i) => (
                      <span key={i} className="shortcut-key-wrap">
                        <kbd>{k}</kbd>
                        {i < shortcut.keys.length - 1 && (
                          <span className="shortcut-key-plus">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="shortcut-scope-badge">{shortcut.scope}</span>
                </div>
                <div className="shortcut-card-body">
                  <strong className="shortcut-action-title">
                    {shortcut.action}
                  </strong>
                  <p className="shortcut-desc">{shortcut.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="shortcut-table-view">
            <div className="shortcut-table-header">
              <span>Shortcut</span>
              <span>Action & Description</span>
              <span>Scope</span>
            </div>
            {filteredShortcuts.map((shortcut) => (
              <div key={shortcut.id} className="shortcut-table-row">
                <div className="shortcut-table-keys">
                  {shortcut.keys.map((k, i) => (
                    <span key={i} className="shortcut-key-wrap">
                      <kbd>{k}</kbd>
                      {i < shortcut.keys.length - 1 && (
                        <span className="shortcut-key-plus">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="shortcut-table-action-col">
                  <strong>{shortcut.action}</strong>
                  <small>{shortcut.description}</small>
                </div>
                <div className="shortcut-table-scope-col">
                  <span className="shortcut-scope-badge">{shortcut.scope}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="shortcut-empty-state">
          <Icon name="keyboard" size={28} />
          <b>No shortcuts matching &ldquo;{query}&rdquo;</b>
          <p>Try searching by key name (e.g., &ldquo;Z&rdquo;, &ldquo;P&rdquo;, &ldquo;Esc&rdquo;) or action word.</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setQuery("")
              setActiveCategory("all")
            }}
          >
            Clear Search Filter
          </button>
        </div>
      )}

      {/* Pro-Tips Callout */}
      <div className="shortcut-protips-box">
        <b style={{ color: "var(--accent)", fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          ⚡ Pro-Tips for Maximum Velocity
        </b>
        <div className="shortcut-protips-grid">
          <div>
            <strong>1. Hands-Free Culling</strong>
            <p>Enable <em>Auto-Advance</em> in review settings, then use solely <kbd>P</kbd>, <kbd>X</kbd>, and <kbd>U</kbd> to rapidly cull a shoot without pressing arrow keys.</p>
          </div>
          <div>
            <strong>2. Quick Compare to Winner</strong>
            <p>Press <kbd>C</kbd> with multiple candidates selected, navigate with <kbd>←</kbd>/<kbd>→</kbd>, mark the keeper with <kbd>S</kbd>, and hit <kbd>Enter</kbd> to jump straight into editing.</p>
          </div>
          <div>
            <strong>3. Split Before/After</strong>
            <p>In Develop mode, press <kbd>\</kbd> for instant Before/After toggle, or <kbd>Y</kbd> to cycle side-by-side or split curtain comparison.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
