import { Slider } from "../ui"
import type { DevelopValues } from "../../app/types"

export function LightPanel({
  values,
  onChange,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number) => void
}) {
  return (
    <>
      <Slider
        label="Exposure"
        value={values.exposure}
        onChange={(v) => onChange("exposure", v)}
      />
      <Slider
        label="Contrast"
        value={values.contrast}
        onChange={(v) => onChange("contrast", v)}
      />
      <Slider
        label="Highlights"
        value={values.highlights}
        onChange={(v) => onChange("highlights", v)}
      />
      <Slider
        label="Shadows"
        value={values.shadows}
        onChange={(v) => onChange("shadows", v)}
      />
      <Slider
        label="Whites"
        value={values.whites}
        onChange={(v) => onChange("whites", v)}
      />
      <Slider
        label="Blacks"
        value={values.blacks}
        onChange={(v) => onChange("blacks", v)}
      />
    </>
  )
}
