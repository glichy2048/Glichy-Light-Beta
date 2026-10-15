import { useRef } from "react"
import { CURVE_BUMPS,curveLut } from "../app/develop"
import type { DevelopValues } from "../app/types"

const KEYS = ["curveShadows", "curveDarks", "curveLights", "curveHighlights"] as const
const S = 200

export default function ToneCurveEditor({
  values,
  onChange,
  onReset,
}: {
  values: DevelopValues
  onChange: (key: (typeof KEYS)[number], value: number) => void
  onReset: () => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const lut = curveLut(values)
  const at = (x: number) => {
    if (!lut) return x
    const f = x * 255
    const i = Math.min(254, f | 0)
    return lut[i] + (lut[i + 1] - lut[i]) * (f - i)
  }
  const path = Array.from({ length: 65 }, (_, i) => {
    const x = i / 64
    const y = Math.min(1, Math.max(0, at(x)))
    return `${i ? "L" : "M"}${(x * S).toFixed(1)} ${((1 - y) * S).toFixed(1)}`
  }).join(" ")

  const drag = (k: number, event: React.PointerEvent) => {
    const box = svg.current!.getBoundingClientRect()
    const move = (e: PointerEvent | React.PointerEvent) => {
      const y = 1 - (e.clientY - box.top) / box.height
      const base = CURVE_BUMPS[k]
      // Point sits at base + 0.2 * param at its centre (bump = 1), ignoring neighbours.
      onChange(KEYS[k], Math.round(Math.max(-100, Math.min(100, ((y - base) / 0.2) * 100))))
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    move(event)
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  return (
    <div className="curve-editor">
      <svg ref={svg} viewBox={`0 0 ${S} ${S}`} role="group" aria-label="Tone curve">
        {[0.25, 0.5, 0.75].map((g) => (
          <g key={g}>
            <line x1={g * S} x2={g * S} y1={0} y2={S} />
            <line y1={g * S} y2={g * S} x1={0} x2={S} />
          </g>
        ))}
        <line className="diag" x1={0} y1={S} x2={S} y2={0} />
        <path d={path} />
        {KEYS.map((key, k) => (
          <circle
            key={key}
            cx={CURVE_BUMPS[k] * S}
            cy={(1 - at(CURVE_BUMPS[k])) * S}
            r={6}
            tabIndex={0}
            role="slider"
            aria-label={key.replace("curve", "Curve ")}
            aria-valuemin={-100}
            aria-valuemax={100}
            aria-valuenow={values[key]}
            onPointerDown={(e) => drag(k, e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") onChange(key, Math.min(100, values[key] + 5))
              if (e.key === "ArrowDown") onChange(key, Math.max(-100, values[key] - 5))
            }}
          />
        ))}
      </svg>
      <button type="button" className="curve-reset" onClick={onReset}>
        Reset curve
      </button>
    </div>
  )
}
