import { Slider } from "../ui"
import type { DevelopValues } from "../../app/types"

export function DetailPanel({
  values,
  onChange,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number) => void
}) {
  return (
    <>
      <div className="sharpening-group">
        <span style={{ fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>Sharpening</span>
        <Slider
          label="Amount"
          value={values.sharpening}
          min={0}
          max={100}
          signed={false}
          onChange={(v) => onChange("sharpening", v)}
        />
        <Slider
          label="Radius"
          value={values.sharpRadius}
          min={0}
          max={100}
          signed={false}
          onChange={(v) => onChange("sharpRadius", v)}
        />
        <Slider
          label="Detail"
          value={values.sharpDetail}
          min={0}
          max={100}
          signed={false}
          onChange={(v) => onChange("sharpDetail", v)}
        />
      </div>

      <div className="noise-group" style={{ marginTop: "16px" }}>
        <span style={{ fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>Noise Reduction</span>
        <Slider
          label="Luminance"
          value={values.noise}
          min={0}
          max={100}
          signed={false}
          onChange={(v) => onChange("noise", v)}
        />
        <Slider
          label="Color"
          value={values.noiseColor}
          min={0}
          max={100}
          signed={false}
          onChange={(v) => onChange("noiseColor", v)}
        />
      </div>
    </>
  )
}
