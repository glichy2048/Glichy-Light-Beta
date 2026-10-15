import { Slider, Toggle } from "../ui"
import { LENS_PROFILES } from "../../app/develop"
import type { DevelopValues } from "../../app/types"

export function OpticsPanel({
  values,
  onChange,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number | boolean | string) => void
}) {
  return (
    <div className="optics-panel-content">
      <div className="option-row" style={{ minHeight: "36px", marginBottom: "12px" }}>
        <span>Lens Profile</span>
        <select
          className="select-control native"
          value={values.lensModel || "Auto (EXIF)"}
          onChange={(e) => onChange("lensModel", e.target.value)}
        >
          {LENS_PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

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
        label="Distortion"
        value={values.distortion ?? 0}
        min={-100}
        max={100}
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
