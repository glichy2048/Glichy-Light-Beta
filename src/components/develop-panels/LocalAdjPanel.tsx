import { useState } from "react"
import { Button, Icon, Slider } from "../ui"

export function LocalAdjPanel() {
  const [activeMask, setActiveMask] = useState<"radial" | "linear" | "brush" | null>(null)

  // Local state for the selected mask's adjustments (placeholder for now)
  const [adjustments, setAdjustments] = useState({
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    clarity: 0,
  })

  const setAdj = (key: keyof typeof adjustments, val: number) => {
    setAdjustments(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="local-adj-panel">
      <div className="mask-tools" style={{ display: "flex", gap: "8px", marginBottom: "16px", justifyContent: "center" }}>
        <Button
          className={activeMask === "brush" ? "active" : ""}
          onClick={() => setActiveMask("brush")}
          title="Brush Mask"
        >
          <Icon name="mask" size={16} /> Brush
        </Button>
        <Button
          className={activeMask === "linear" ? "active" : ""}
          onClick={() => setActiveMask("linear")}
          title="Linear Gradient"
        >
          <div style={{ width: "16px", height: "16px", background: "linear-gradient(to bottom, #fff, transparent)", borderRadius: "2px" }} /> Linear
        </Button>
        <Button
          className={activeMask === "radial" ? "active" : ""}
          onClick={() => setActiveMask("radial")}
          title="Radial Gradient"
        >
          <div style={{ width: "16px", height: "16px", background: "radial-gradient(circle, #fff, transparent)", borderRadius: "50%" }} /> Radial
        </Button>
      </div>

      {activeMask ? (
        <div className="mask-adjustments">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>
              {activeMask} Adjustments
            </span>
            <Button className="mini-btn" onClick={() => setActiveMask(null)}>
              <Icon name="close" size={12} />
            </Button>
          </div>

          <Slider label="Exposure" value={adjustments.exposure} onChange={(v) => setAdj("exposure", v)} />
          <Slider label="Contrast" value={adjustments.contrast} onChange={(v) => setAdj("contrast", v)} />
          <Slider label="Highlights" value={adjustments.highlights} onChange={(v) => setAdj("highlights", v)} />
          <Slider label="Shadows" value={adjustments.shadows} onChange={(v) => setAdj("shadows", v)} />
          <Slider label="Clarity" value={adjustments.clarity} onChange={(v) => setAdj("clarity", v)} />
        </div>
      ) : (
        <div style={{ padding: "32px 0", textAlign: "center", color: "#888", fontSize: "12px" }}>
          Select a tool to add a new mask.
        </div>
      )}
    </div>
  )
}
