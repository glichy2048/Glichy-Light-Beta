import { useState, useMemo, useEffect } from "react"
import { Slider, Toggle } from "../ui"
import {
  LENS_PROFILES,
  resolveLensProfile,
  detectLensFromExif,
} from "../../app/develop"
import { Log } from "../../app/diagnostics"
import type { DevelopValues, Photo } from "../../app/types"

const POPULAR_SONY_CHIPS = [
  { id: "Sony FE 24-70mm f/2.8 GM II", short: "24-70 GM II" },
  { id: "Sony FE 70-200mm f/2.8 GM OSS II", short: "70-200 GM II" },
  { id: "Sony FE 16-35mm f/2.8 GM II", short: "16-35 GM II" },
  { id: "Sony FE 35mm f/1.4 GM", short: "35 GM" },
  { id: "Sony FE 50mm f/1.2 GM", short: "50 F1.2 GM" },
  { id: "Sony FE 85mm f/1.4 GM II", short: "85 GM II" },
  { id: "Sony FE 200-600mm f/5.6-6.3 G OSS", short: "200-600 G" },
  { id: "Sony E 16-55mm f/2.8 G", short: "E 16-55 G" },
]

export function OpticsPanel({
  values,
  onChange,
  photo,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number | boolean | string) => void
  photo?: Photo
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const activeProfile = resolveLensProfile(values.lensModel, photo?.lens, photo?.camera)
  const isAuto = !values.lensModel || values.lensModel === "Auto (EXIF)"
  const isSonyLens = activeProfile?.brand === "Sony"

  // Helper: Detect lens from selected photo's EXIF data
  const exifMatch = useMemo(() => detectLensFromExif(photo), [photo])

  // Automatic pre-selection: If lensModel is empty, pre-select detected lens chip
  useEffect(() => {
    if (photo && exifMatch && (!values.lensModel || values.lensModel === "")) {
      Log.d(
        "OpticsPanel",
        `Auto-preselecting EXIF lens chip: ${exifMatch.profile.id} for photo "${photo.name}"`
      )
      onChange("lensModel", exifMatch.profile.id)
      if (!values.lensProfile) {
        onChange("lensProfile", true)
      }
    }
  }, [photo, exifMatch, values.lensModel, values.lensProfile, onChange])

  // Build chips list ensuring the detected EXIF lens has an accessible chip
  const sonyChipsList = useMemo(() => {
    const list = [...POPULAR_SONY_CHIPS]
    if (exifMatch?.profile && exifMatch.profile.brand === "Sony") {
      const exists = list.some((c) => c.id === exifMatch.profile.id)
      if (!exists) {
        list.unshift({
          id: exifMatch.profile.id,
          short: exifMatch.profile.name.replace(/^Sony\s+/, ""),
        })
      }
    }
    return list
  }, [exifMatch])

  const allSonyProfiles = useMemo(() => {
    return LENS_PROFILES.filter((p) => p.brand === "Sony")
  }, [])

  const filteredSonyLenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allSonyProfiles
    return allSonyProfiles.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q)
      const matchId = p.id.toLowerCase().includes(q)
      const matchSeries = p.series ? p.series.toLowerCase().includes(q) : false
      const matchMount = p.mount ? p.mount.toLowerCase().includes(q) : false
      const matchFocal = p.focalLength ? p.focalLength.toLowerCase().includes(q) : false
      const matchAperture = p.maxAperture ? p.maxAperture.toLowerCase().includes(q) : false
      const matchAliases = p.aliases ? p.aliases.some((a) => a.toLowerCase().includes(q)) : false
      return (
        matchName ||
        matchId ||
        matchSeries ||
        matchMount ||
        matchFocal ||
        matchAperture ||
        matchAliases
      )
    })
  }, [allSonyProfiles, searchQuery])

  const sonyFEProfiles = useMemo(
    () => LENS_PROFILES.filter((p) => p.brand === "Sony" && p.mount === "Sony FE"),
    []
  )
  const sonyEProfiles = useMemo(
    () => LENS_PROFILES.filter((p) => p.brand === "Sony" && p.mount === "Sony E"),
    []
  )
  const canonProfiles = useMemo(() => LENS_PROFILES.filter((p) => p.brand === "Canon"), [])
  const nikonProfiles = useMemo(() => LENS_PROFILES.filter((p) => p.brand === "Nikon"), [])
  const fujiProfiles = useMemo(() => LENS_PROFILES.filter((p) => p.brand === "Fujifilm"), [])
  const leicaProfiles = useMemo(() => LENS_PROFILES.filter((p) => p.brand === "Leica"), [])
  const otherProfiles = useMemo(
    () =>
      LENS_PROFILES.filter(
        (p) => p.brand === "Generic" || (p.brand === "Special" && p.id !== "Auto (EXIF)")
      ),
    []
  )

  const selectLens = (lensId: string) => {
    Log.d("OpticsPanel", `Selected lens chip: ${lensId}`)
    onChange("lensModel", lensId)
    // If selecting a profile, enable profile corrections automatically
    if (!values.lensProfile) {
      onChange("lensProfile", true)
    }
  }

  return (
    <div className="optics-panel-content">
      {/* Lens Profile Select */}
      <div className="option-row" style={{ minHeight: "36px", marginBottom: "8px" }}>
        <span>Lens Profile</span>
        <select
          className="select-control native"
          value={values.lensModel || "Auto (EXIF)"}
          onChange={(e) => onChange("lensModel", e.target.value)}
        >
          <optgroup label="Auto Detection">
            <option value="Auto (EXIF)">Auto (Detected from Lens EXIF)</option>
          </optgroup>
          <optgroup label="Sony Alpha Full-Frame (FE Mount - GM / G / Zeiss)">
            {sonyFEProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Sony Alpha APS-C (E Mount)">
            {sonyEProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Canon RF Mount">
            {canonProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Nikon Z Mount">
            {nikonProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Fujifilm X Mount">
            {fujiProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Leica M Mount">
            {leicaProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Generic & Manual">
            {otherProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Quick Lens Search Input Field above the lens chips container */}
      <div className="sony-lens-search-box">
        <label htmlFor="sony-lens-search-input" className="sony-lens-search-label">
          Search Sony Lenses
        </label>
        <div className="sony-lens-search-input-wrap">
          <svg
            className="sony-search-icon"
            width="13"
            height="13"
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
            id="sony-lens-search-input"
            type="text"
            className="sony-lens-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredSonyLenses.length > 0) {
                selectLens(filteredSonyLenses[0].id)
              } else if (e.key === "Escape") {
                setSearchQuery("")
              }
            }}
            placeholder="Search Sony lenses by model name (e.g. 24-70, 35mm, GM)..."
            aria-label="Search Sony lenses by model name"
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              className="sony-lens-search-clear"
              onClick={() => setSearchQuery("")}
              title="Clear search"
              aria-label="Clear lens search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Sony Alpha lens presets / chips container */}
      <div className="sony-chips-container">
        <div className="sony-chips-title">
          <span>
            {searchQuery.trim()
              ? `Sony Alpha Matches (${filteredSonyLenses.length})`
              : "Sony Alpha Fast Select"}
          </span>
          {isSonyLens && !searchQuery.trim() && (
            <span className="sony-alpha-badge">α E-MOUNT</span>
          )}
          {searchQuery.trim() && (
            <button
              type="button"
              className="sony-search-reset-link"
              onClick={() => setSearchQuery("")}
            >
              Reset
            </button>
          )}
        </div>

        {/* EXIF Detection Banner */}
        {exifMatch && (
          <div className="sony-exif-banner">
            <div className="sony-exif-banner-left">
              <span className="sony-exif-tag-icon">✦</span>
              <span className="sony-exif-label">EXIF Detected:</span>
              <strong className="sony-exif-lens-name" title={exifMatch.profile.id}>
                {exifMatch.profile.name.replace(/^Sony\s+/, "")}
              </strong>
              <span className="sony-exif-confidence-badge">{exifMatch.confidence}</span>
            </div>
            {values.lensModel !== exifMatch.profile.id && (
              <button
                type="button"
                className="sony-exif-preselect-btn"
                onClick={() => selectLens(exifMatch.profile.id)}
                title={`Pre-select ${exifMatch.profile.name} chip explicitly`}
              >
                Pre-select Chip
              </button>
            )}
          </div>
        )}

        <div className="sony-chips-row">
          {!searchQuery.trim() ? (
            <>
              <button
                type="button"
                className={`sony-lens-chip ${isAuto ? "active" : ""}`}
                onClick={() => onChange("lensModel", "Auto (EXIF)")}
                title={`Auto-detect from EXIF${exifMatch ? ` (resolves to ${exifMatch.profile.name})` : ""}`}
              >
                Auto EXIF
              </button>
              {sonyChipsList.map((chip) => {
                const isSelected = values.lensModel === chip.id
                const isExifDetected = exifMatch?.profile.id === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    className={`sony-lens-chip ${isSelected ? "active" : ""} ${
                      isExifDetected ? "exif-detected-chip" : ""
                    }`}
                    onClick={() => selectLens(chip.id)}
                    title={`${chip.id}${
                      isExifDetected
                        ? ` · Auto-detected from Photo EXIF ("${photo?.lens || ""}")`
                        : ""
                    }`}
                  >
                    <span>{chip.short}</span>
                    {isExifDetected && (
                      <span className="chip-exif-pill" title="Detected from photo EXIF data">
                        EXIF
                      </span>
                    )}
                  </button>
                )
              })}
            </>
          ) : filteredSonyLenses.length > 0 ? (
            filteredSonyLenses.map((lens) => {
              const isSelected = values.lensModel === lens.id
              const isExifDetected = exifMatch?.profile.id === lens.id
              const displayLabel = lens.name.replace(/^Sony\s+/, "")
              return (
                <button
                  key={lens.id}
                  type="button"
                  className={`sony-lens-chip ${isSelected ? "active" : ""} ${
                    isExifDetected ? "exif-detected-chip" : ""
                  }`}
                  onClick={() => selectLens(lens.id)}
                  title={`${lens.name} (${lens.mount || "E-mount"})${
                    isExifDetected ? ` · EXIF Match` : ""
                  } - Click to apply calibration`}
                >
                  <span>{displayLabel}</span>
                  {isExifDetected && (
                    <span className="chip-exif-pill" title="Detected from photo EXIF data">
                      EXIF
                    </span>
                  )}
                </button>
              )
            })
          ) : (
            <div className="sony-search-empty-state">
              <span>No Sony Alpha lenses matching &ldquo;{searchQuery}&rdquo;</span>
              <button
                type="button"
                className="sony-search-clear-inline"
                onClick={() => setSearchQuery("")}
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Details & Diagnostics Card */}
      {activeProfile && activeProfile.id !== "Manual" && (
        <div className="lens-profile-card">
          <div className="lens-profile-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isSonyLens && <span className="sony-alpha-badge">α SONY</span>}
              <span className="lens-profile-name">{activeProfile.name}</span>
            </div>
            {activeProfile.series && (
              <span
                className={`lens-series-pill ${
                  activeProfile.series === "G Master"
                    ? "g-master"
                    : activeProfile.series === "G"
                      ? "g-lens"
                      : activeProfile.series === "Zeiss"
                        ? "zeiss"
                        : ""
                }`}
              >
                {activeProfile.series}
              </span>
            )}
          </div>
          <div className="lens-profile-specs">
            <span>
              Mount: <strong>{activeProfile.mount || "Universal"}</strong>
            </span>
            {activeProfile.focalLength && (
              <span>
                Focal: <strong>{activeProfile.focalLength}</strong>
              </span>
            )}
            {activeProfile.maxAperture && (
              <span>
                Aperture: <strong>{activeProfile.maxAperture}</strong>
              </span>
            )}
          </div>
          <div className="lens-profile-calib">
            <span>
              Distortion Correction: <strong>{activeProfile.defaultDistortion}%</strong>
            </span>
            <span>
              Vignette Gain: <strong>+{activeProfile.defaultVignette}%</strong>
            </span>
            {isAuto && photo?.lens && (
              <div className="lens-detected-hint">
                EXIF: &ldquo;{photo.lens}&rdquo; ({photo.camera || "Sony Camera"})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enable Profile Corrections */}
      <div
        className="toggle-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span>Enable Profile Corrections</span>
        <Toggle
          on={values.lensProfile}
          onClick={() => onChange("lensProfile", !values.lensProfile)}
          label="Toggle profile corrections"
        />
      </div>

      <Slider
        label="Manual Distortion"
        value={values.distortion ?? 0}
        min={-50}
        max={50}
        signed={true}
        onChange={(v) => onChange("distortion", v)}
      />

      <div
        className="toggle-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "12px",
          marginBottom: "12px",
        }}
      >
        <span>Remove Chromatic Aberration</span>
        <Toggle
          on={values.chromaticAberration}
          onClick={() => onChange("chromaticAberration", !values.chromaticAberration)}
          label="Toggle chromatic aberration removal"
        />
      </div>

      <Slider
        label="Defringe"
        value={values.defringe ?? 0}
        min={0}
        max={100}
        signed={false}
        onChange={(v) => onChange("defringe", v)}
      />

      <div style={{ marginTop: "12px" }}>
        <Slider
          label="Vignetting"
          value={values.vignetting}
          min={-100}
          max={100}
          signed={true}
          onChange={(v) => onChange("vignetting", v)}
        />
      </div>

      <Slider
        label="Vignette Midpoint"
        value={values.vignetteMidpoint ?? 50}
        min={0}
        max={100}
        signed={false}
        onChange={(v) => onChange("vignetteMidpoint", v)}
      />
    </div>
  )
}
