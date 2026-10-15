import { useState } from "react"
import { Slider, Button } from "../ui"
import type { DevelopValues } from "../../app/types"

const HSL_COLORS = [
  { key: "Red", label: "Red", color: "#ef4444" },
  { key: "Orange", label: "Orange", color: "#f97316" },
  { key: "Yellow", label: "Yellow", color: "#eab308" },
  { key: "Green", label: "Green", color: "#22c55e" },
  { key: "Aqua", label: "Aqua", color: "#06b6d4" },
  { key: "Blue", label: "Blue", color: "#3b82f6" },
  { key: "Purple", label: "Purple", color: "#a855f7" },
  { key: "Magenta", label: "Magenta", color: "#d946ef" },
] as const

export function ColorPanel({
  values,
  onChange,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number) => void
}) {
  const [hslTab, setHslTab] = useState<"hue" | "sat" | "lum" | "all">("all")

  return (
    <>
      <div className="wb-group">
        <Slider
          label="Temperature"
          value={values.temperature}
          onChange={(v) => onChange("temperature", v)}
        />
        <Slider
          label="Tint"
          value={values.tint}
          onChange={(v) => onChange("tint", v)}
        />
      </div>

      <div className="presence-group" style={{ marginTop: "16px" }}>
        <Slider
          label="Vibrance"
          value={values.vibrance}
          onChange={(v) => onChange("vibrance", v)}
        />
        <Slider
          label="Saturation"
          value={values.saturation}
          onChange={(v) => onChange("saturation", v)}
        />
      </div>

      <div className="hsl-mixer" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Color Mixer</span>
          <div className="segmented text mini" style={{ display: "flex", gap: "2px" }}>
            <Button
              className={hslTab === "hue" ? "active" : ""}
              onClick={() => setHslTab("hue")}
            >
              Hue
            </Button>
            <Button
              className={hslTab === "sat" ? "active" : ""}
              onClick={() => setHslTab("sat")}
            >
              Sat
            </Button>
            <Button
              className={hslTab === "lum" ? "active" : ""}
              onClick={() => setHslTab("lum")}
            >
              Lum
            </Button>
            <Button
              className={hslTab === "all" ? "active" : ""}
              onClick={() => setHslTab("all")}
            >
              All
            </Button>
          </div>
        </div>

        {hslTab !== "all" ? (
          <div className="hsl-grid" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {HSL_COLORS.map(({ key, label, color }) => {
              const valKey = `${hslTab}${key}` as keyof DevelopValues
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: color }} />
                  <div style={{ flex: 1 }}>
                    <Slider
                      label={label}
                      value={values[valKey] as number}
                      onChange={(v) => onChange(valKey, v)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="hsl-all" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {HSL_COLORS.map(({ key, label, color }) => (
              <div key={key} style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color }} />
                  <span style={{ fontSize: "12px", fontWeight: 500 }}>{label}</span>
                </div>
                <Slider
                  label="Hue"
                  value={values[`hue${key}` as keyof DevelopValues] as number}
                  onChange={(v) => onChange(`hue${key}` as keyof DevelopValues, v)}
                />
                <Slider
                  label="Saturation"
                  value={values[`sat${key}` as keyof DevelopValues] as number}
                  onChange={(v) => onChange(`sat${key}` as keyof DevelopValues, v)}
                />
                <Slider
                  label="Luminance"
                  value={values[`lum${key}` as keyof DevelopValues] as number}
                  onChange={(v) => onChange(`lum${key}` as keyof DevelopValues, v)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
