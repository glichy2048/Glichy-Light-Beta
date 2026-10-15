import {
useState,type ReactNode
} from "react"
import { useAppState } from "../app/AppState"
import type { View } from "../app/types"
import { Icon,Button,MetadataChip,ScreenBar,Toggle } from "../components/ui"
import {
  AI_MODELS,
  getSavedAiModel,
  saveAiModel,
  getSavedApiKey,
  saveApiKey,
  type AiModelId,
} from "../app/ai"

export const settingsCategories = [
  "General",
  "Catalog & Storage",
  "Import",
  "Editing",
  "Export",
  "Performance",
  "AI Engine & Models",
  "Shortcuts",
  "About / System",
]
export function SettingsScreen({ navigate }: { navigate: (view: View) => void }) {
  const { preferences, dispatch } = useAppState()
  const [category, setCategory] = useState("General")
  const [activeAiModel, setActiveAiModel] = useState<AiModelId>(getSavedAiModel)
  const [apiKeyInput, setApiKeyInput] = useState(getSavedApiKey)
  const [savedKeyMessage, setSavedKeyMessage] = useState<string | null>(null)
  const [aiAutoDevelopOnImport, setAiAutoDevelopOnImport] = useState(true)
  const [neuralAcceleration, setNeuralAcceleration] = useState(true)

  const toggle = (
    key: "groupRawJpeg" | "autoAdvance" | "cachePreviews" | "gpuAcceleration",
  ) => dispatch({ type: "PREFERENCE", key, value: !preferences[key] })
  return (
    <section className="screen">
      <ScreenBar
        title="Settings / Preferences"
        subtitle="Application, catalog, and workflow defaults"
        actions={<Button className="primary-btn">Save changes</Button>}
      />
      <div className="workspace settings-workspace">
        <aside className="sidebar settings-nav">
          {settingsCategories.map((item) => (
            <Button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              <Icon
                name={
                  item === "Shortcuts"
                    ? "keyboard"
                    : item === "About / System"
                      ? "info"
                      : item === "AI Engine & Models"
                        ? "aperture"
                        : "settings"
                }
                size={15}
              />
              {item}
            </Button>
          ))}
        </aside>
        <main className="preferences">
          <span className="preferences-title">{category}</span>
          <span className="preferences-copy">
            {category === "General"
              ? "Choose how Glichylight looks and behaves when you begin a session."
              : category === "Shortcuts"
                ? "Keyboard controls for fast, eyes-on-image workflows."
                : category === "About / System"
                  ? "Version information and the Glichylight interface system."
                  : `Configure ${category.toLowerCase()} defaults for your local workflow.`}
          </span>
          {category === "General" && (
            <>
              <PreferenceRow
                title="Startup workspace"
                description="Open this workspace when Glichylight launches"
              >
                <Button className="select-control wide">
                  <span>Library</span>
                  <Icon name="chevron" size={12} />
                </Button>
              </PreferenceRow>
              <PreferenceRow
                title="Interface density"
                description="Adjust spacing throughout panels and lists"
              >
                <div className="segmented text">
                  <Button
                    className={
                      preferences.density === "compact" ? "active" : ""
                    }
                    onClick={() =>
                      dispatch({
                        type: "PREFERENCE",
                        key: "density",
                        value: "compact",
                      })
                    }
                  >
                    Compact
                  </Button>
                  <Button
                    className={
                      preferences.density === "comfortable" ? "active" : ""
                    }
                    onClick={() =>
                      dispatch({
                        type: "PREFERENCE",
                        key: "density",
                        value: "comfortable",
                      })
                    }
                  >
                    Comfortable
                  </Button>
                </div>
              </PreferenceRow>
              <PreferenceRow
                title="Appearance"
                description="Designed for color-accurate editing"
              >
                <MetadataChip>Glichylight Dark</MetadataChip>
              </PreferenceRow>
            </>
          )}
          {category === "Catalog & Storage" && (
            <>
              <PreferenceRow
                title="Catalog location"
                description="Stored locally on this Mac"
              >
                <Button className="secondary-btn">Choose folder</Button>
              </PreferenceRow>
              <PreferenceRow
                title="Cache previews"
                description="Keep standard previews available offline"
              >
                <Toggle
                  on={preferences.cachePreviews}
                  onClick={() => toggle("cachePreviews")}
                  label="Cache previews"
                />
              </PreferenceRow>
              <PreferenceRow
                title="Preview cache size"
                description="Maximum local preview storage"
              >
                <Button
                  className={`select-control wide ${
                    !preferences.cachePreviews ? "disabled" : ""
                  }`}
                  disabled={!preferences.cachePreviews}
                >
                  <span>20 GB</span>
                  <Icon name="chevron" size={12} />
                </Button>
              </PreferenceRow>
            </>
          )}
          {category === "Import" && (
            <>
              <PreferenceRow
                title="Import behavior"
                description="Reference files in place or copy into catalog"
              >
                <div className="segmented text">
                  <Button
                    className={
                      preferences.importMode === "reference" ? "active" : ""
                    }
                    onClick={() =>
                      dispatch({
                        type: "PREFERENCE",
                        key: "importMode",
                        value: "reference",
                      })
                    }
                  >
                    Reference
                  </Button>
                  <Button
                    className={
                      preferences.importMode === "copy" ? "active" : ""
                    }
                    onClick={() =>
                      dispatch({
                        type: "PREFERENCE",
                        key: "importMode",
                        value: "copy",
                      })
                    }
                  >
                    Copy
                  </Button>
                </div>
              </PreferenceRow>
              <PreferenceRow
                title="Group RAW + JPEG"
                description="Stack matching captures by default"
              >
                <Toggle
                  on={preferences.groupRawJpeg}
                  onClick={() => toggle("groupRawJpeg")}
                  label="Group RAW and JPEG"
                />
              </PreferenceRow>
            </>
          )}
          {category === "Editing" && (
            <>
              <PreferenceRow
                title="GPU acceleration"
                description="Use graphics hardware for live previews"
              >
                <Toggle
                  on={preferences.gpuAcceleration}
                  onClick={() => toggle("gpuAcceleration")}
                  label="GPU acceleration"
                />
              </PreferenceRow>
              <PreferenceRow
                title="Default camera profile"
                description="Applied non-destructively on import"
              >
                <Button className="select-control wide">
                  <span>Camera neutral</span>
                  <Icon name="chevron" size={12} />
                </Button>
              </PreferenceRow>
            </>
          )}
          {category === "Performance" && (
            <>
              <PreferenceRow
                title="GPU acceleration"
                description="Accelerate image rendering and masks"
              >
                <Toggle
                  on={preferences.gpuAcceleration}
                  onClick={() => toggle("gpuAcceleration")}
                  label="GPU acceleration"
                />
              </PreferenceRow>
              <PreferenceRow
                title="Build previews in background"
                description="Continue while organizing the catalog"
              >
                <Toggle
                  on={preferences.cachePreviews}
                  onClick={() => toggle("cachePreviews")}
                  label="Background previews"
                />
              </PreferenceRow>
            </>
          )}
          {category === "Shortcuts" && (
            <div className="shortcut-table">
              {[
                ["P / X / U", "Pick, reject, or clear flag"],
                ["1–5 / 0", "Set or clear rating"],
                ["← / →", "Previous or next photo"],
                ["C", "Add to compare"],
                ["D", "Open in Develop"],
                ["\\", "Show before / after"],
              ].map(([keys, action]) => (
                <div key={keys}>
                  <kbd>{keys}</kbd>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          )}
          {category === "About / System" && (
            <div className="about-card">
              <span className="brand-mark large">
                <Icon name="aperture" size={32} />
              </span>
              <div>
                <b>Glichylight 1.0</b>
                <span>Local-first, non-destructive photo workflow</span>
              </div>
              <Button
                className="secondary-btn"
                onClick={() => navigate("system")}
              >
                Open system reference
              </Button>
            </div>
          )}
          {category === "AI Engine & Models" && (
            <>
              <PreferenceRow
                title="Active AI Model"
                description="Engine used for auto scene optimization and style interpretation"
              >
                <select
                  className="select-control native"
                  style={{ width: "230px", height: "32px" }}
                  value={activeAiModel}
                  onChange={(e) => {
                    const m = e.target.value as AiModelId
                    setActiveAiModel(m)
                    saveAiModel(m)
                  }}
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.badge})
                    </option>
                  ))}
                </select>
              </PreferenceRow>

              <PreferenceRow
                title="Google Gemini API Key"
                description="Required for Gemini 2.5 Flash and Gemini 1.5 Pro cloud models"
              >
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input
                    type="password"
                    placeholder="Enter API key (AIza...)"
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value)
                      setSavedKeyMessage(null)
                    }}
                    style={{
                      height: "30px",
                      width: "180px",
                      padding: "0 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--line)",
                      background: "var(--canvas)",
                      color: "var(--text)",
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                  />
                  <Button
                    className="secondary-btn"
                    style={{ height: "30px", padding: "0 10px", fontSize: "11px" }}
                    onClick={() => {
                      saveApiKey(apiKeyInput)
                      setSavedKeyMessage("Saved")
                      setTimeout(() => setSavedKeyMessage(null), 2500)
                    }}
                  >
                    {savedKeyMessage ? "Saved ✓" : "Save Key"}
                  </Button>
                </div>
              </PreferenceRow>

              <PreferenceRow
                title="Neural WebAssembly Acceleration"
                description="Run bilinear & CFA neural operations using SIMD WebAssembly"
              >
                <Toggle
                  on={neuralAcceleration}
                  onClick={() => setNeuralAcceleration((v) => !v)}
                  label="Neural WebAssembly Acceleration"
                />
              </PreferenceRow>

              <PreferenceRow
                title="Auto Scene Tone on Import"
                description="Compute initial exposure & highlight curves automatically"
              >
                <Toggle
                  on={aiAutoDevelopOnImport}
                  onClick={() => setAiAutoDevelopOnImport((v) => !v)}
                  label="Auto Scene Tone on Import"
                />
              </PreferenceRow>
            </>
          )}
          {["Export"].includes(category) && (
            <>
              <PreferenceRow
                title="Default preset"
                description="Used when opening Export"
              >
                <Button className="select-control wide">
                  <span>Web 2048px</span>
                  <Icon name="chevron" size={12} />
                </Button>
              </PreferenceRow>
              <PreferenceRow
                title="Show completed files"
                description="Reveal destination after export"
              >
                <Toggle on={true} onClick={() => {}} label="Show files" />
              </PreferenceRow>
            </>
          )}
        </main>
        <aside className="sidebar settings-help">
          <div className="help-icon">
            <Icon name="info" />
          </div>
          <span>{category}</span>
          <p>
            {category === "About / System"
              ? "View the visual language, component states, information architecture, and layout rationale used throughout Glichylight."
              : category === "AI Engine & Models"
                ? "Configure local neural vision heuristics or cloud-powered Gemini models for intelligent scene analysis, dynamic range recovery, and creative look grading."
                : "These preferences are stored with your local catalog. Photo originals and edit instructions remain on this device."}
          </p>
          <div className="catalog-health">
            <span>Catalog health</span>
            <b>
              <i />
              All changes saved
            </b>
            <small>18 photos · 742 MB · Local</small>
          </div>
        </aside>
      </div>
    </section>
  )
}

export function PreferenceRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="preference-row">
      <div>
        <span>{title}</span>
        <small>{description}</small>
      </div>
      {children}
    </div>
  )
}

