import type { TauriCommands } from "./contracts"

type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>

declare global {
  interface Window {
    __TAURI_INTERNALS__?: { invoke: Invoke }
  }
}

export const isTauri = () => typeof window !== "undefined" && !!window.__TAURI_INTERNALS__

// Typed wrapper over Tauri's invoke. The browser build has no native core, so calls reject.
export function invoke<C extends keyof TauriCommands>(
  command: C,
  args: TauriCommands[C]["args"],
): Promise<TauriCommands[C]["result"]> {
  const bridge = typeof window !== "undefined" ? window.__TAURI_INTERNALS__ : undefined
  if (!bridge) return Promise.reject(new Error(`Native command "${command}" needs the desktop app`))
  return bridge.invoke(command, args as Record<string, unknown>) as Promise<TauriCommands[C]["result"]>
}
