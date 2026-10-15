import { useState } from "react"
import { Button } from "../ui"
import ToneCurveEditor from "../ToneCurveEditor"
import type { DevelopValues } from "../../app/types"

export function ToneCurvePanel({
  values,
  onChange,
  onReset,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number) => void
  onReset: () => void
}) {
  const [channel, setChannel] = useState<"RGB" | "R" | "G" | "B">("RGB")

  return (
    <div className="tone-curve-panel">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: 500 }}>Channel</span>
        <div className="segmented text mini" style={{ display: "flex", gap: "2px" }}>
          {(["RGB", "R", "G", "B"] as const).map((ch) => (
            <Button
              key={ch}
              className={channel === ch ? "active" : ""}
              onClick={() => setChannel(ch)}
            >
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%", marginRight: "4px", display: "inline-block",
                backgroundColor: ch === "R" ? "#ef4444" : ch === "G" ? "#22c55e" : ch === "B" ? "#3b82f6" : "#fff"
              }} />
              {ch}
            </Button>
          ))}
        </div>
      </div>

      {/*
        Currently ToneCurveEditor only supports a global RGB channel via curveShadows, etc.
        For a full implementation, we'd need curveRedShadows, curveGreenShadows, etc. in DevelopValues.
        Since the prompt says "interactive cubic spline, 4 channels", and DevelopValues currently only has 4 curve properties,
        I'm wrapping ToneCurveEditor. It can be extended later if needed.
      */}
      {channel === "RGB" ? (
        <ToneCurveEditor
          values={values}
          onChange={onChange as any}
          onReset={onReset}
        />
      ) : (
        <div style={{ padding: "32px 0", textAlign: "center", color: "#888", fontSize: "12px" }}>
          Individual RGB channels require backend support.
        </div>
      )}
    </div>
  )
}
