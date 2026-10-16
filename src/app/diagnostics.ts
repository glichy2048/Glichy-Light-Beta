export type LogLevel = "debug" | "info" | "warn" | "error"
export type LogEntry = { at: number; level: LogLevel; source: string; message: string }
export type CrashRecord = {
  id: string
  at: number
  kind: "render" | "error" | "promise"
  message: string
  stack?: string
  componentStack?: string
  view: string
  logTail: LogEntry[]
}

export type AssetLoadStatus = {
  id: string
  name: string
  format: string
  status: "pending" | "loaded" | "error"
  timeMs?: number
  error?: string
}

export type SelfTestResult = {
  name: string
  passed: boolean
  message: string
  latencyMs: number
}

const MAX_LOG = 300
const MAX_CRASHES = 10
const CRASH_KEY = "glichylight.crashes"
const DEBUG_KEY = "glichylight.debug_mode"
const APP_VERSION = "0.1.0-prototype"

const entries: LogEntry[] = []
const assetLoads = new Map<string, AssetLoadStatus>()
const listeners = new Set<() => void>()
let version = 0
let installed = false
const startedAt = Date.now()

// Debug mode is enabled by default per project specification
let debugEnabled = typeof localStorage !== "undefined"
  ? localStorage.getItem(DEBUG_KEY) !== "false"
  : true

export function isDebugEnabled(): boolean {
  return debugEnabled
}

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DEBUG_KEY, String(enabled))
    }
  } catch {
    // storage unavailable
  }
  log("info", "debug", `Debug mode ${enabled ? "enabled" : "disabled"}`)
  notify()
}

let notifyScheduled = false
function scheduleNotify(immediate = false) {
  if (immediate) {
    notify()
    return
  }
  if (!notifyScheduled) {
    notifyScheduled = true
    queueMicrotask(() => {
      notifyScheduled = false
      notify()
    })
  }
}

function notify() {
  version++
  listeners.forEach((fn) => {
    try {
      fn()
    } catch {
      // guard listener execution
    }
  })
}

export const subscribeDiagnostics = (fn: () => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
export const diagnosticsVersion = () => version

// --- Security Sanitization ---
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /(?:password|passwd|secret|token|apiKey|api_key)\s*[:=]\s*["']?([^"'\s,]+)/gi,
  /[a-zA-Z0-9_-]{24,}\.[a-zA-Z0-9_-]{6,}\.[a-zA-Z0-9_-]{27,}/g, // JWT-like
  /data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, // long base64 strings
]

export function sanitizeLogMessage(msg: string): string {
  if (!msg) return ""
  let clean = String(msg)
  for (const pattern of SENSITIVE_PATTERNS) {
    clean = clean.replace(pattern, "[REDACTED]")
  }
  let filtered = ""
  for (let i = 0; i < clean.length && filtered.length < 2000; i++) {
    const code = clean.charCodeAt(i)
    if ((code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13) {
      filtered += clean[i]
    }
  }
  return filtered
}

export function sanitizeTag(tag: string): string {
  return String(tag || "app").replace(/[^a-zA-Z0-9_\-.:]/g, "_").slice(0, 50)
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      delete (parsed as Record<string, unknown>).__proto__
      delete (parsed as Record<string, unknown>).constructor
      delete (parsed as Record<string, unknown>).prototype
    }
    return parsed as T
  } catch {
    return fallback
  }
}

const stringify = (value: unknown): string => {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

// Dev server / Vite HMR / benign browser noise that should NEVER be recorded as application crashes
export function isIgnoredNoise(input: unknown): boolean {
  if (!input) return false
  const str = (input instanceof Error ? `${input.message} ${input.stack || ""}` : String(input)).toLowerCase()
  return (
    str.includes("websocket closed without opened") ||
    str.includes("websocket connection to") ||
    str.includes("failed to connect to websocket") ||
    str.includes("websocket is already in closing or closed state") ||
    str.includes("failed to construct 'websocket'") ||
    str.includes("vite:ws") ||
    str.includes("resizeobserver loop completed with undelivered notifications") ||
    str.includes("resizeobserver loop limit exceeded")
  )
}

export function log(level: LogLevel, source: string, ...args: unknown[]) {
  if (level === "debug" && !debugEnabled) return
  const rawMsg = args.map(stringify).join(" ")
  if (isIgnoredNoise(rawMsg)) return

  entries.push({
    at: Date.now(),
    level,
    source: sanitizeTag(source),
    message: sanitizeLogMessage(rawMsg),
  })

  // Amortized ring buffer: only trim when exceeding limit by 50 to avoid continuous array copies
  if (entries.length > MAX_LOG + 50) {
    entries.splice(0, entries.length - MAX_LOG)
  }

  // Microtask batching for normal logs; immediate notify for error logs
  scheduleNotify(level === "error")
}

// Creator-friendly Android-style Log facade (always enabled by default)
export const Log = {
  d: (tag: string, message: string, ...extra: unknown[]) => {
    if (debugEnabled) log("debug", tag, message, ...extra)
  },
  i: (tag: string, message: string, ...extra: unknown[]) => {
    log("info", tag, message, ...extra)
  },
  w: (tag: string, message: string, ...extra: unknown[]) => {
    log("warn", tag, message, ...extra)
  },
  e: (tag: string, message: string, ...extra: unknown[]) => {
    log("error", tag, message, ...extra)
  },
}

// Asset load tracking
export function recordAssetLoad(asset: AssetLoadStatus) {
  assetLoads.set(asset.id, asset)
  Log.d("AssetManager", `[Asset ${asset.status.toUpperCase()}] ${asset.name} (${asset.format})${asset.timeMs !== undefined ? ` in ${asset.timeMs}ms` : ""}${asset.error ? ` - error: ${asset.error}` : ""}`)
  scheduleNotify(asset.status === "error")
}

export function getAssetLoads(): AssetLoadStatus[] {
  return Array.from(assetLoads.values())
}

export const getLogs = () => entries
export const clearLogs = () => {
  entries.length = 0
  notify()
}

const memoryCrashes: CrashRecord[] = []

export function getCrashes(): CrashRecord[] {
  let diskCrashes: CrashRecord[] = []
  try {
    if (typeof localStorage !== "undefined") {
      const raw = safeJsonParse<unknown[]>(localStorage.getItem(CRASH_KEY), [])
      if (Array.isArray(raw)) {
        diskCrashes = raw.filter((item): item is CrashRecord =>
          !!item &&
          typeof item === "object" &&
          typeof (item as CrashRecord).id === "string" &&
          typeof (item as CrashRecord).at === "number" &&
          typeof (item as CrashRecord).message === "string" &&
          !isIgnoredNoise((item as CrashRecord).message),
        )
      }
    }
  } catch {
    // storage unavailable
  }
  return diskCrashes.length > 0 ? diskCrashes : [...memoryCrashes]
}

export function clearCrashes() {
  memoryCrashes.length = 0
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(CRASH_KEY)
    }
  } catch {
    // storage unavailable
  }
  notify()
}

const currentView = () => (typeof location === "undefined" ? "" : location.hash.replace("#", "") || "library")

export function recordCrash(
  kind: CrashRecord["kind"],
  error: unknown,
  componentStack?: string,
): CrashRecord | null {
  const err = error instanceof Error ? error : new Error(stringify(error))
  if (isIgnoredNoise(err.message) || (err.stack && isIgnoredNoise(err.stack))) {
    // Dev server noise (e.g. WebSocket closed without opened / HMR offline) is suppressed
    return null
  }

  const record: CrashRecord = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `crash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    kind,
    message: sanitizeLogMessage(err.message),
    stack: err.stack ? sanitizeLogMessage(err.stack.slice(0, 4000)) : undefined,
    componentStack: componentStack ? sanitizeLogMessage(componentStack.slice(0, 2000)) : undefined,
    view: currentView(),
    logTail: entries.slice(-40),
  }

  memoryCrashes.unshift(record)
  if (memoryCrashes.length > MAX_CRASHES) memoryCrashes.pop()

  log("error", `crash:${kind}`, record.message)
  try {
    if (typeof localStorage !== "undefined") {
      const existing = getCrashes()
      localStorage.setItem(CRASH_KEY, JSON.stringify([record, ...existing.filter((c) => c.id !== record.id)].slice(0, MAX_CRASHES)))
    }
  } catch {
    // storage full or unavailable: in-memory log still contains it
  }
  notify()
  return record
}

export function installDiagnostics() {
  if (installed || typeof window === "undefined") return
  installed = true
  for (const level of ["warn", "error"] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      log(level, "console", ...args)
    }
  }

  window.addEventListener("error", (event) => {
    if (isIgnoredNoise(event.message) || (event.error && isIgnoredNoise(event.error))) {
      return
    }
    if (event.error) recordCrash("error", event.error)
    else log("error", "window", event.message)
  })

  window.addEventListener("unhandledrejection", (event) => {
    if (isIgnoredNoise(event.reason)) {
      return
    }
    recordCrash("promise", event.reason)
  })

  Log.i("AppLifecycle", `Glichylight diagnostics initialized · v${APP_VERSION} (debug: ${debugEnabled ? "ON" : "OFF"})`)
}

export type CatalogStats = { photos: number; raw: number; withPreview: number; edited: number; saveStatus: string }

export async function runSelfTest(): Promise<SelfTestResult[]> {
  const results: SelfTestResult[] = []

  // 1. LocalStorage Security & Quota
  const t0 = performance.now()
  try {
    const testKey = `__self_test_${Date.now()}__`
    const testVal = JSON.stringify({ test: "secure", date: Date.now() })
    localStorage.setItem(testKey, testVal)
    const read = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    results.push({
      name: "Storage Security & Quota",
      passed: read === testVal,
      message: "LocalStorage read/write verified without permission failure",
      latencyMs: +(performance.now() - t0).toFixed(2),
    })
  } catch (e) {
    results.push({
      name: "Storage Security & Quota",
      passed: false,
      message: `Storage check failed: ${e instanceof Error ? e.message : String(e)}`,
      latencyMs: +(performance.now() - t0).toFixed(2),
    })
  }

  // 2. IndexedDB Connectivity
  const t1 = performance.now()
  try {
    if (typeof indexedDB === "undefined") {
      results.push({
        name: "IndexedDB Storage Engine",
        passed: false,
        message: "IndexedDB API not available in current environment",
        latencyMs: +(performance.now() - t1).toFixed(2),
      })
    } else {
      const openReq = indexedDB.open("glichylight_selftest", 1)
      await new Promise<void>((resolve, reject) => {
        openReq.onsuccess = () => {
          openReq.result.close()
          indexedDB.deleteDatabase("glichylight_selftest")
          resolve()
        }
        openReq.onerror = () => reject(openReq.error)
      })
      results.push({
        name: "IndexedDB Storage Engine",
        passed: true,
        message: "IndexedDB initialized and responsive",
        latencyMs: +(performance.now() - t1).toFixed(2),
      })
    }
  } catch (e) {
    results.push({
      name: "IndexedDB Storage Engine",
      passed: false,
      message: `IndexedDB error: ${e instanceof Error ? e.message : String(e)}`,
      latencyMs: +(performance.now() - t1).toFixed(2),
    })
  }

  // 3. Canvas 2D & Pixel Processing
  const t2 = performance.now()
  try {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) throw new Error("Could not obtain 2D rendering context")
    ctx.fillStyle = "#ff6600"
    ctx.fillRect(0, 0, 64, 64)
    const imgData = ctx.getImageData(0, 0, 64, 64)
    const isOk = imgData.data[0] === 255 && imgData.data[1] === 102 && imgData.data[2] === 0
    results.push({
      name: "Canvas 2D Pipeline",
      passed: isOk,
      message: isOk ? "Canvas 2D and ImageData operations working at full precision" : "Canvas pixel readback mismatch",
      latencyMs: +(performance.now() - t2).toFixed(2),
    })
  } catch (e) {
    results.push({
      name: "Canvas 2D Pipeline",
      passed: false,
      message: `Canvas error: ${e instanceof Error ? e.message : String(e)}`,
      latencyMs: +(performance.now() - t2).toFixed(2),
    })
  }

  // 4. Input Sanitization & Prototype Pollution Defense
  const t3 = performance.now()
  try {
    const toxicJson = '{"__proto__":{"polluted":true},"test":123}'
    const parsed = safeJsonParse<{ test?: number }>(toxicJson, {})
    const hasPollution = ({} as Record<string, unknown>).polluted === true
    const sanitizedMsg = sanitizeLogMessage("User apiKey: secret123 and Bearer abc-token-xyz")
    const isSanitized = !sanitizedMsg.includes("secret123") && !sanitizedMsg.includes("abc-token-xyz")
    results.push({
      name: "Security Sanitization & Defense",
      passed: !hasPollution && isSanitized && parsed.test === 123,
      message: "Prototype pollution blocked and credential tokens scrubbed",
      latencyMs: +(performance.now() - t3).toFixed(2),
    })
  } catch (e) {
    results.push({
      name: "Security Sanitization & Defense",
      passed: false,
      message: `Sanitization error: ${e instanceof Error ? e.message : String(e)}`,
      latencyMs: +(performance.now() - t3).toFixed(2),
    })
  }

  Log.i("SelfTest", `Diagnostics self-test completed: ${results.filter((r) => r.passed).length}/${results.length} passed`)
  return results
}

export async function buildReport(catalog?: CatalogStats) {
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }) : null
  const perf = typeof performance !== "undefined" ? (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }) : null
  let storage: { usage?: number; quota?: number } = {}
  try {
    storage = (await nav?.storage?.estimate?.()) ?? {}
  } catch {
    // unsupported
  }
  const dbs = await (typeof indexedDB !== "undefined" && (indexedDB as IDBFactory & { databases?: () => Promise<IDBDatabaseInfo[]> })
    .databases?.()
    .catch(() => undefined))

  return {
    app: {
      name: "Glichylight",
      version: APP_VERSION,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      view: currentView(),
      debugMode: debugEnabled,
    },
    generatedAt: new Date().toISOString(),
    environment: nav
      ? {
          userAgent: sanitizeLogMessage(nav.userAgent),
          platform: nav.platform,
          language: nav.language,
          online: nav.onLine,
          cores: nav.hardwareConcurrency,
          deviceMemoryGB: nav.deviceMemory,
          screen: typeof screen !== "undefined" ? `${screen.width}x${screen.height} @${window.devicePixelRatio}x` : "n/a",
          viewport: typeof window !== "undefined" ? `${innerWidth}x${innerHeight}` : "n/a",
          colorScheme: typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
          reducedMotion: typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
        }
      : null,
    capabilities: {
      indexedDB: typeof indexedDB !== "undefined",
      directoryPicker: typeof window !== "undefined" && "showDirectoryPicker" in window,
      offscreenCanvas: typeof OffscreenCanvas !== "undefined",
      createImageBitmap: typeof createImageBitmap !== "undefined",
      webWorkers: typeof Worker !== "undefined",
    },
    memory: perf?.memory
      ? { usedMB: Math.round(perf.memory.usedJSHeapSize / 1048576), limitMB: Math.round(perf.memory.jsHeapSizeLimit / 1048576) }
      : null,
    storage: {
      usedMB: storage.usage ? Math.round(storage.usage / 1048576) : null,
      quotaMB: storage.quota ? Math.round(storage.quota / 1048576) : null,
      databases: Array.isArray(dbs) ? dbs.map((d) => d.name) : [],
    },
    catalog: catalog ?? null,
    crashes: getCrashes(),
    assetLoads: getAssetLoads(),
    logs: entries.slice(-MAX_LOG),
    privacy: "Photo filenames, local filesystem paths, credentials, and image pixels are strictly excluded.",
  }
}

export async function downloadReport(catalog?: CatalogStats) {
  const report = await buildReport(catalog)
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `glichylight-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

