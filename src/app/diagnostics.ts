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

const MAX_LOG = 300
const MAX_CRASHES = 10
const CRASH_KEY = "glichylight.crashes"
const APP_VERSION = "0.1.0-prototype"

const entries: LogEntry[] = []
const listeners = new Set<() => void>()
let version = 0
let installed = false
const startedAt = Date.now()

function notify() {
  version++
  listeners.forEach((fn) => fn())
}

export const subscribeDiagnostics = (fn: () => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
export const diagnosticsVersion = () => version

const stringify = (value: unknown): string => {
  if (value instanceof Error) return value.message
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export function log(level: LogLevel, source: string, ...args: unknown[]) {
  entries.push({ at: Date.now(), level, source, message: args.map(stringify).join(" ").slice(0, 2000) })
  if (entries.length > MAX_LOG) entries.splice(0, entries.length - MAX_LOG)
  notify()
}

export const getLogs = () => entries
export const clearLogs = () => {
  entries.length = 0
  notify()
}

export function getCrashes(): CrashRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CRASH_KEY) ?? "[]")
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function clearCrashes() {
  try {
    localStorage.removeItem(CRASH_KEY)
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
): CrashRecord {
  const err = error instanceof Error ? error : new Error(stringify(error))
  const record: CrashRecord = {
    id: crypto.randomUUID(),
    at: Date.now(),
    kind,
    message: err.message,
    stack: err.stack?.slice(0, 4000),
    componentStack: componentStack?.slice(0, 2000),
    view: currentView(),
    logTail: entries.slice(-40),
  }
  log("error", `crash:${kind}`, err.message)
  try {
    localStorage.setItem(CRASH_KEY, JSON.stringify([record, ...getCrashes()].slice(0, MAX_CRASHES)))
  } catch {
    // storage full or unavailable: the crash is still in the in-memory log
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
    if (event.error) recordCrash("error", event.error)
    else log("error", "window", event.message)
  })
  window.addEventListener("unhandledrejection", (event) => recordCrash("promise", event.reason))
  log("info", "app", `Diagnostics started · v${APP_VERSION}`)
}

export type CatalogStats = { photos: number; raw: number; withPreview: number; edited: number; saveStatus: string }

export async function buildReport(catalog?: CatalogStats) {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const perf = performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }
  let storage: { usage?: number; quota?: number } = {}
  try {
    storage = (await navigator.storage?.estimate?.()) ?? {}
  } catch {
    // unsupported
  }
  const dbs = await (indexedDB as IDBFactory & { databases?: () => Promise<IDBDatabaseInfo[]> })
    .databases?.()
    .catch(() => undefined)
  return {
    app: { name: "Glichylight", version: APP_VERSION, uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), view: currentView() },
    generatedAt: new Date().toISOString(),
    environment: {
      userAgent: nav.userAgent,
      platform: nav.platform,
      language: nav.language,
      online: nav.onLine,
      cores: nav.hardwareConcurrency,
      deviceMemoryGB: nav.deviceMemory,
      screen: `${screen.width}x${screen.height} @${window.devicePixelRatio}x`,
      viewport: `${innerWidth}x${innerHeight}`,
      colorScheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
    capabilities: {
      indexedDB: "indexedDB" in window,
      directoryPicker: "showDirectoryPicker" in window,
      offscreenCanvas: typeof OffscreenCanvas !== "undefined",
      createImageBitmap: "createImageBitmap" in window,
    },
    memory: perf.memory
      ? { usedMB: Math.round(perf.memory.usedJSHeapSize / 1048576), limitMB: Math.round(perf.memory.jsHeapSizeLimit / 1048576) }
      : null,
    storage: { usedMB: storage.usage ? Math.round(storage.usage / 1048576) : null, quotaMB: storage.quota ? Math.round(storage.quota / 1048576) : null, databases: dbs?.map((d) => d.name) },
    catalog: catalog ?? null,
    crashes: getCrashes(),
    logs: entries.slice(-MAX_LOG),
    privacy: "No photo names, paths or pixel data are included in this report.",
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
