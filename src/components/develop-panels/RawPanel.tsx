import { useState } from "react"
import { Toggle, Slider } from "../ui"
import { RAW_WB_PRESETS, type RawWbPreset, isRaw } from "../../app/raw"
import type { DevelopValues, Photo } from "../../app/types"

const CAMERA_PROFILES = [
  { id: "adobe-standard", name: "Adobe Standard", vibrance: 0, contrast: 0 },
  { id: "camera-neutral", name: "Camera Neutral", vibrance: -5, contrast: -6 },
  { id: "camera-vivid", name: "Camera Vivid", vibrance: 25, contrast: 15 },
  { id: "camera-portrait", name: "Camera Portrait", vibrance: 8, contrast: -4 },
  { id: "camera-landscape", name: "Camera Landscape", vibrance: 20, contrast: 10 },
  { id: "camera-flat", name: "Camera Flat", vibrance: -15, contrast: -20 },
]

export function RawPanel({
  values,
  onChange,
  photo,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number | boolean | string) => void
  photo?: Photo
}) {
  const [wbPreset, setWbPreset] = useState<RawWbPreset>("as-shot")
  const [cameraProfile, setCameraProfile] = useState("camera-neutral")
  const [demosaicAlgorithm, setDemosaicAlgorithm] = useState("ahd")
  const [highlightRecovery, setHighlightRecovery] = useState(false)

  const isRawFile = photo ? isRaw(photo.name) : true
  const formatBadge = photo
    ? photo.name.split(".").pop()?.toUpperCase() ?? "RAW"
    : "RAW"

  const handleWbChange = (preset: RawWbPreset) => {
    setWbPreset(preset)
    switch (preset) {
      case "as-shot":
        onChange("temperature", 0)
        onChange("tint", 0)
        break
      case "daylight":
        onChange("temperature", 4)
        onChange("tint", 0)
        break
      case "cloudy":
        onChange("temperature", 16)
        onChange("tint", 2)
        break
      case "shade":
        onChange("temperature", 28)
        onChange("tint", 4)
        break
      case "tungsten":
        onChange("temperature", -35)
        onChange("tint", -6)
        break
      case "fluorescent":
        onChange("temperature", -14)
        onChange("tint", 14)
        break
      case "flash":
        onChange("temperature", 8)
        onChange("tint", 2)
        break
    }
  }

  const handleProfileChange = (profileId: string) => {
    setCameraProfile(profileId)
    const prof = CAMERA_PROFILES.find((p) => p.id === profileId)
    if (prof) {
      onChange("vibrance", prof.vibrance)
      onChange("contrast", prof.contrast)
    }
  }

  const handleHighlightRecovery = (enabled: boolean) => {
    setHighlightRecovery(enabled)
    if (enabled) {
      onChange("highlights", Math.min(values.highlights, -30))
      onChange("whites", Math.min(values.whites, -12))
    } else {
      onChange("highlights", 0)
      onChange("whites", 0)
    }
  }

  return (
    <div className="raw-panel-content" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Sensor & CFA Format Specs */}
      <div className="raw-badge-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>{isRawFile ? `${formatBadge} Sensor Data` : "14-Bit Bayer Emulation"}</b>
          <span
            style={{
              fontSize: "9px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(232, 163, 61, 0.15)",
              color: "var(--accent)",
              fontWeight: 600,
            }}
          >
            CFA RAW
          </span>
        </div>
        <small>
          {photo?.camera || "Sony ILCE-7RM4"} · RGGB Mosaic · 14-bit Linear
        </small>
        <small style={{ color: "var(--muted)", opacity: 0.8 }}>
          Black Level: 512 · White Clip: 16383 · ISO {photo?.iso || 100}
        </small>
      </div>

      {/* RAW White Balance Preset */}
      <div className="option-row" style={{ minHeight: "36px" }}>
        <span>RAW White Balance</span>
        <select
          className="select-control native"
          value={wbPreset}
          onChange={(e) => handleWbChange(e.target.value as RawWbPreset)}
        >
          <option value="as-shot">As Shot (Camera Metadata)</option>
          <option value="daylight">Daylight (5500K)</option>
          <option value="cloudy">Cloudy (6500K)</option>
          <option value="shade">Shade (7500K)</option>
          <option value="tungsten">Tungsten (3200K)</option>
          <option value="fluorescent">Fluorescent (4000K)</option>
          <option value="flash">Flash (5500K)</option>
        </select>
      </div>

      {/* Camera Profile */}
      <div className="option-row" style={{ minHeight: "36px" }}>
        <span>Camera Profile</span>
        <select
          className="select-control native"
          value={cameraProfile}
          onChange={(e) => handleProfileChange(e.target.value)}
        >
          {CAMERA_PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Demosaic Algorithm */}
      <div className="option-row" style={{ minHeight: "36px" }}>
        <span>Demosaic Algorithm</span>
        <select
          className="select-control native"
          value={demosaicAlgorithm}
          onChange={(e) => setDemosaicAlgorithm(e.target.value)}
        >
          <option value="ahd">Gradient-Weighted Adaptive (AHD)</option>
          <option value="vng">Variable Number of Gradients (VNG)</option>
          <option value="bilinear">Bilinear Interpolation (Fast)</option>
        </select>
      </div>

      {/* RAW Highlight Recovery Toggle */}
      <div
        className="toggle-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ display: "block" }}>Highlight Reconstruction</span>
          <small style={{ color: "var(--muted)", fontSize: "10px" }}>
            Recover clipped RAW channels
          </small>
        </div>
        <Toggle
          on={highlightRecovery}
          onClick={() => handleHighlightRecovery(!highlightRecovery)}
          label="Toggle RAW Highlight Recovery"
        />
      </div>

      {/* Fine-tune RAW Temperature & Tint */}
      <div style={{ marginTop: "4px" }}>
        <Slider
          label="Temperature (K)"
          value={values.temperature}
          min={-100}
          max={100}
          signed={true}
          onChange={(v) => onChange("temperature", v)}
        />
        <Slider
          label="Tint"
          value={values.tint}
          min={-100}
          max={100}
          signed={true}
          onChange={(v) => onChange("tint", v)}
        />
      </div>
    </div>
  )
}
