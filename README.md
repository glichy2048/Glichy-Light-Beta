# Glichylight

A local-first, non-destructive photo editor prototype in the style of Lightroom. React 19, TypeScript, Zustand and Tailwind v4 on Vite, with a planned Tauri + Rust native core (see `plans/glichylight-desktop-core-architecture.md`).

## Screens
Library, Review, Compare, Develop, Export, Settings and System, routed by URL hash.

## Develop
Edits are stored as a recipe (`DevelopValues`) per photo; the original is never touched. The tone pipeline is in `src/app/develop.ts` (`applyTone`): white balance, tint, exposure and shadows/highlights in linear light, then contrast, whites/blacks, parametric tone curve, clarity, vibrance, saturation, sharpening and noise reduction. Each photo has undo history, named snapshots and presets.

## Shortcuts
| Key | Action |
| --- | --- |
| `G` / `E` / `D` / `C` | Library / Review / Develop / Compare |
| `P` / `X` / `U`, `J` | Pick / Reject / Unflag, Reject |
| `0`-`5` | Rate (Review) |
| `Ctrl/Cmd+Z`, `Ctrl+Shift+Z` or `Ctrl+Y` | Undo, redo |
| `Ctrl/Cmd+C` / `V` | Copy / paste develop settings to the selection |
| `Z` | Fit / 1:1 (Develop) |
| `\` | Before / after (Develop) |
| `O` | Clipping overlay (Develop) |
| `Left` / `Right` | Previous / next photo |
| `Ctrl/Cmd+K` | Focus catalog search |

## Project layout
- `src/app/` pure logic: `develop.ts` (pipeline, presets), `reducer.ts` (state transitions), `store.ts` (Zustand store, persistence), `exporter.ts` (JPEG/PNG/TIFF, ZIP, EXIF), `raw.ts` (import, embedded-preview extraction), `diagnostics.ts` (logs and crash reports).
- `src/screens/`, `src/components/` UI.
- `src/native/` typed Tauri IPC contracts; the browser build uses an IndexedDB `CatalogGateway`.
- `tests/` Vitest suites for the pipeline, reducer and exporter.

## Scripts
```
pnpm dev        # dev server
pnpm build      # production build
pnpm test       # vitest
pnpm lint       # eslint
pnpm typecheck  # tsc --noEmit
pnpm tokens     # regenerate design-token export and docs
```

## Design tokens
`pnpm tokens` exports the `:root` variables in `src/index.css` to `tokens.json` and `docs/design-tokens.md` (with WCAG contrast ratios). `pnpm tokens:check` fails if they are stale.

## Desktop (Tauri)
`src-tauri/` is a Tauri 2 shell with a Rust core. It currently provides a SQLite catalog (`load_catalog`, `save_catalog`, `clear_catalog`) and presets (`get_presets`, `save_preset`) in `src-tauri/src/db.rs`. The UI picks `tauriCatalogGateway` automatically inside the desktop app and falls back to IndexedDB in a browser; on first desktop launch an existing browser catalog is copied into SQLite.

Prerequisites (not managed by `.mise.toml`): a Rust toolchain and the Tauri system libraries for your OS. Then:
```
pnpm tauri icon path/to/icon.png   # once, generates src-tauri/icons
pnpm tauri dev
cargo test --manifest-path src-tauri/Cargo.toml
```
Not built yet: LibRaw decode, filesystem import, Rust previews/export, XMP sidecars, wgpu. Preview images and file import still run in the webview.

## Limits
Imported RAW files are edited and exported from their embedded preview, not decoded sensor data. The Rust core is not built yet.
