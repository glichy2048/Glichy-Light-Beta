import { describe, expect, it, beforeEach } from "vitest"
import {
  clearCrashes,
  clearLogs,
  getCrashes,
  getLogs,
  isDebugEnabled,
  isIgnoredNoise,
  Log,
  recordCrash,
  safeJsonParse,
  sanitizeLogMessage,
  sanitizeTag,
  setDebugEnabled,
  runSelfTest,
  buildReport,
  recordAssetLoad,
  getAssetLoads,
} from "../src/app/diagnostics"

describe("Diagnostics & Log API", () => {
  beforeEach(() => {
    clearLogs()
    clearCrashes()
    setDebugEnabled(true)
  })

  it("has debug enabled by default and supports toggling", () => {
    expect(isDebugEnabled()).toBe(true)
    setDebugEnabled(false)
    expect(isDebugEnabled()).toBe(false)
    Log.d("TestTag", "Should be muted when debug is off")
    expect(getLogs().filter((l) => l.message.includes("Should be muted"))).toHaveLength(0)

    setDebugEnabled(true)
    Log.d("TestTag", "Visible debug trace")
    expect(getLogs().some((l) => l.message.includes("Visible debug trace"))).toBe(true)
  })

  it("records structured Log.i, Log.w, and Log.e statements", () => {
    Log.i("Pipeline", "Processing started")
    Log.w("Memory", "High buffer pressure")
    Log.e("Parser", "Corrupted block")

    const logs = getLogs()
    expect(logs.some((l) => l.level === "info" && l.source === "Pipeline")).toBe(true)
    expect(logs.some((l) => l.level === "warn" && l.source === "Memory")).toBe(true)
    expect(logs.some((l) => l.level === "error" && l.source === "Parser")).toBe(true)
  })

  it("identifies and filters dev server / Vite WebSocket noise", () => {
    expect(isIgnoredNoise("WebSocket closed without opened")).toBe(true)
    expect(isIgnoredNoise("WebSocket connection to 'ws://...' failed")).toBe(true)
    expect(isIgnoredNoise("failed to connect to WebSocket")).toBe(true)
    expect(isIgnoredNoise("ResizeObserver loop completed with undelivered notifications")).toBe(true)
    expect(isIgnoredNoise("Genuine TypeError: Cannot read properties of undefined")).toBe(false)

    // Suppressed crash record for WebSocket noise
    const suppressed = recordCrash("error", new Error("WebSocket closed without opened"))
    expect(suppressed).toBeNull()
    expect(getCrashes()).toHaveLength(0)

    // Genuine crash is recorded
    const genuine = recordCrash("error", new Error("Null pointer in render engine"))
    expect(genuine).not.toBeNull()
    expect(getCrashes()).toHaveLength(1)
  })

  it("sanitizes sensitive tokens, API keys, and base64 bloat", () => {
    const raw = "Authorization: Bearer mySecretToken123456789 and apiKey='xyz-987-secret'"
    const clean = sanitizeLogMessage(raw)
    expect(clean).not.toContain("mySecretToken123456789")
    expect(clean).not.toContain("xyz-987-secret")
    expect(clean).toContain("[REDACTED]")

    const base64Data = "data:image/png;base64," + "A".repeat(200)
    expect(sanitizeLogMessage(base64Data)).toBe("[REDACTED]")
  })

  it("sanitizes source tags against illegal characters", () => {
    expect(sanitizeTag("app<script>alert(1)</script>")).toBe("app_script_alert_1___script_")
    expect(sanitizeTag("")).toBe("app")
  })

  it("safely parses JSON without Prototype Pollution", () => {
    const malicious = '{"__proto__":{"polluted":true},"valid":"data"}'
    const parsed = safeJsonParse<{ valid?: string }>(malicious, {})
    expect(parsed.valid).toBe("data")
    expect((Object.prototype as unknown as { polluted?: boolean }).polluted).toBeUndefined()
  })

  it("tracks asset loads and timing diagnostics", () => {
    recordAssetLoad({
      id: "photo-1.jpg-1024",
      name: "photo-1.jpg",
      format: "JPEG",
      status: "loaded",
      timeMs: 14,
    })
    const loads = getAssetLoads()
    expect(loads.some((a) => a.name === "photo-1.jpg" && a.status === "loaded" && a.timeMs === 14)).toBe(true)
  })

  it("executes the system self-test suite and reports diagnostic metrics", async () => {
    const results = await runSelfTest()
    expect(results.length).toBeGreaterThanOrEqual(4)
    expect(results.every((r) => typeof r.name === "string" && typeof r.latencyMs === "number")).toBe(true)
  })

  it("builds an anonymized report adhering to privacy constraints", async () => {
    const report = await buildReport({
      photos: 18,
      raw: 6,
      withPreview: 18,
      edited: 2,
      saveStatus: "saved",
    })
    expect(report.app.name).toBe("Glichylight")
    expect(report.privacy).toContain("strictly excluded")
    expect(report.catalog?.photos).toBe(18)
  })
})
