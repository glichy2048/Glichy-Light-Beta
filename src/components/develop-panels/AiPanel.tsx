import { useState } from "react"
import { Icon, Button, Slider } from "../ui"
import {
  AI_MODELS,
  aiAutoDevelop,
  aiDescribeYourLook,
  STYLE_PROMPTS,
  getSavedAiModel,
  getSavedApiKey,
  saveAiModel,
  type AiModelId,
} from "../../app/ai"
import type { DevelopValues, Photo } from "../../app/types"

export function AiPanel({
  values,
  onChange,
  onApplyRecipe,
  photo,
}: {
  values: DevelopValues
  onChange: (key: keyof DevelopValues, value: number | boolean | string) => void
  onApplyRecipe: (recipe: Partial<DevelopValues>, reason: string) => void
  photo?: Photo
}) {
  const [model, setModel] = useState<AiModelId>(getSavedAiModel)
  const [prompt, setPrompt] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const currentModelInfo = AI_MODELS.find((m) => m.id === model) ?? AI_MODELS[0]
  const hasKey = !!getSavedApiKey()

  const handleModelChange = (id: AiModelId) => {
    setModel(id)
    saveAiModel(id)
  }

  const handleAutoTone = () => {
    const result = aiAutoDevelop(null, 0, 0, photo)
    onApplyRecipe(result.values, result.explanation)
    setStatus(result.explanation)
  }

  const handleApplyStyle = async (lookPrompt: string) => {
    if (!lookPrompt.trim()) return
    setBusy(true)
    setStatus(`Analyzing style: "${lookPrompt}"...`)
    try {
      const result = await aiDescribeYourLook(
        lookPrompt,
        values,
        getSavedApiKey(),
        model,
      )
      onApplyRecipe(result.values, `Applied look: ${result.styleName}`)
      setStatus(`${result.styleName}: ${result.description}`)
    } catch {
      setStatus("Failed to apply style. Please verify model configuration.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-panel">
      {/* Model Selection */}
      <div className="option-row" style={{ minHeight: "36px" }}>
        <span>AI Model</span>
        <select
          className="select-control native"
          value={model}
          onChange={(e) => handleModelChange(e.target.value as AiModelId)}
        >
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.badge})
            </option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "-6px" }}>
        {currentModelInfo.description}
        {currentModelInfo.requiresKey && !hasKey && (
          <span style={{ color: "var(--accent)", display: "block", marginTop: "2px" }}>
            ⚠ Cloud API Key not set. Configure in Settings &gt; AI Engine.
          </span>
        )}
      </div>

      {/* Auto Tone Action Button */}
      <button
        type="button"
        className="ai-action-btn"
        onClick={handleAutoTone}
        disabled={busy}
        title="Analyze histogram and balance exposure, highlights, and color cast"
      >
        <Icon name="aperture" size={15} />
        <span>AI Auto Tone & Scene Optimizer</span>
      </button>

      {/* Describe Your Look Input */}
      <div style={{ marginTop: "4px" }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
            display: "block",
          }}
        >
          Describe Your Look
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            className="input-control"
            style={{
              flex: 1,
              height: "30px",
              fontSize: "12px",
              padding: "0 8px",
              borderRadius: "4px",
              border: "1px solid var(--line)",
              background: "var(--canvas)",
              color: "var(--text)",
            }}
            placeholder="e.g. Moody Nordic overcast, 1970s warm film..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleApplyStyle(prompt)
              }
            }}
          />
          <Button
            className="primary-btn"
            style={{ height: "30px", padding: "0 10px", fontSize: "11px" }}
            disabled={busy || !prompt.trim()}
            onClick={() => handleApplyStyle(prompt)}
          >
            Apply
          </Button>
        </div>

        {/* Quick Style Chips */}
        <div className="ai-chip-grid">
          {STYLE_PROMPTS.map((sp) => (
            <button
              key={sp.label}
              type="button"
              className="ai-chip"
              onClick={() => {
                setPrompt(sp.prompt)
                handleApplyStyle(sp.prompt)
              }}
              title={sp.prompt}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Pill */}
      {status && <div className="ai-status-pill">{status}</div>}

      {/* Neural Enhancements Sliders */}
      <div style={{ marginTop: "6px" }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "8px",
            display: "block",
          }}
        >
          Neural Detail & Clarity
        </span>
        <Slider
          label="Smart Denoise"
          value={values.noise}
          min={0}
          max={100}
          signed={false}
          onChange={(v) => onChange("noise", v)}
        />
        <Slider
          label="Structure & Clarity"
          value={values.clarity}
          min={-100}
          max={100}
          signed={true}
          onChange={(v) => onChange("clarity", v)}
        />
      </div>
    </div>
  )
}
