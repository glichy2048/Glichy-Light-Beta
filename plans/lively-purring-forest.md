# Plan: Close the gap between Glichylight and the "Lightroom-Style RAW Photo Editor" guide

## Context
The attached PDF is the project guide for the app (Rust/Tauri core, React UI, JSON edit recipe, 3 phases of build checklist, shortcut table, Tauri command list, component library, design tokens). I compared it to the current browser prototype. Library, Review, Compare, Export, history/snapshots/presets, RAW preview extraction, persistence and diagnostics are done. What is missing falls into two groups: **UI/feature gaps buildable now in the browser**, and **native-core work** that needs the Tauri/Rust layer.

## Gaps found (guide vs. current app)

**Develop (guide Phase 2 panels)** — currently 9 params only (`DevelopValues` in `src/app/types.ts`)
- Light: missing Whites, Blacks (and Exposure range)
- Color: missing Tint, Saturation, HSL/color mixer
- Tone Curve panel (RGB/R/G/B, draggable points): missing
- Detail: missing Sharpening (Amount/Radius/Detail) and Noise reduction (note `sharpen()` already exists in `develop.ts` for export)
- Optics: missing (profile corrections, CA removal, vignetting)
- Local adjustments (radial/linear/brush masks) and AI "Select Subject": missing
- Histogram: no R/G/B/L channel toggles or clipping overlays
- Copy/paste recipe settings (Ctrl+C/V): missing
- Before/after has modes, but no `\` shortcut

**Library / catalog**
- Real search (text, keyword, rating) and keyword editing in metadata panel (`Photo.keywords` exists, no editor; search box at App.tsx:761 is not wired)
- XMP sidecar read/write
- Filmstrip virtualization (react-window style) for 1000+ images

**Shortcuts (guide §8.1)**: `J` reject (app uses `X`), `D`/`G`/`E` view switching, `Z` fit/1:1 in Develop, `\`, Ctrl+Shift+Z redo, Ctrl+C/V, arrows in filmstrip.

**AI features (guide Phase 3)**: "Describe your look" recipe generation (needs LLM endpoint + Zod validation), subject masking, AI tagging, denoise stub — all depend on a backend/API key.

**Native core (guide Phase 1)**: Cargo workspace, libraw decode, wgpu path, rusqlite catalog, kamadak-exif, Tauri commands (`render_preview`, `import_folder`, …), 16-bit TIFF, packaging. Architecture already described in `plans/glichylight-desktop-core-architecture.md`. Constraint stays: no `rust` entry in `.mise.toml`.

**Engineering/QA**: no tests (Vitest), no ESLint, no README, `App.tsx` is a ~3,000-line monolith, no design-token doc/export (guide §6.1), no end-to-end import→edit→export test.

## Stack alignment (from your feedback: Tauri + React/TS + Zustand + Tailwind, UI talks to Rust via Tauri IPC)
- **Zustand:** add `zustand` and introduce `recipeStore` and `libraryStore` that wrap the existing reducer logic. Export the current `reducer` as pure functions so behavior (history coalescing, undo/redo, snapshots) is unchanged and the existing tsx checks still pass. Migrate screen by screen; `AppStateProvider` stays until the last screen moves. Persistence stays behind `CatalogGateway`.
- **Tailwind:** it is already installed (v4). New components use Tailwind utilities with the existing CSS variables mapped into `@theme` in `src/index.css`; existing hand-written CSS is left alone, not rewritten.
- **React version:** stay on React 19. The scaffold ships it, Zustand supports it, and downgrading to 18 gains nothing. Tell me if 18 is a hard requirement.
- **Tauri IPC:** add `src/native/ipc.ts` with typed wrappers for the guide's commands (`render_preview`, `render_full`, `import_folder`, `get_catalog`, `search_catalog`, `get_metadata`, `apply_preset`, `get_presets`, `save_preset`), extending `src/native/contracts.ts`. A `TauriCatalogGateway` implements `CatalogGateway`, and the browser gateway stays as the fallback when not running in Tauri.
- **Component names:** follow the guide (`SliderRow`, `SliderGroup`, `Panel`, `PanelStack`, `Histogram`, `ToneCurveEditor`, `ImageViewport`, `Filmstrip`, `PresetPanel`, `AppShell`, …), placed in `src/components/` as part of the `App.tsx` split.

Because the stores change shape, **split `App.tsx` and move to Zustand before the Develop parity work**, so new panels are built on the final structure.

## Recommended order (each step shippable alone)
0. **Foundation:** add Zustand stores wrapping the existing reducer, then split `App.tsx` into `screens/` and `components/`, and add `src/native/ipc.ts`. No visible behavior change.
1. **Develop parity (recipe model first):** extend `DevelopValues` + `NEUTRAL`/`toneKey`/`DEVELOP_LABELS`/`PRESETS` in `src/app/develop.ts`; add whites/blacks, tint, saturation to `applyTone`; add Detail panel (reuse `sharpen`, export `boxBlur`-based noise reduction); add a parametric Tone Curve (LUT applied in `applyTone`) with a canvas editor; HSL mixer last. Add a persisted-schema migration in `browserCatalogGateway.ts` so old catalogs default new fields.
2. **Histogram upgrade:** channel toggles and clipping overlays in `Histogram`/`DevelopedImage` (histogram data already produced by `applyTone`).
3. **Shortcuts + copy/paste recipe:** one shared key map; add Develop-scoped copy/paste (new reducer action reusing `DEVELOP`), `\` before/after, `Z` zoom, Ctrl+Shift+Z.
4. **Working catalog UI:** wire search + keyword filter into `AppState` filters, keyword editor in metadata panel, real "Recently added".
5. (Folded into step 0.)
6. **Tests + lint:** Vitest for tone pipeline, reducer, exporter (TIFF/ZIP/EXIF), raw extraction; ESLint; README.
7. **Design tokens:** export current CSS variables to `tokens.json` + docs page (guide §6.1; project to-do already lists this).
8. **Native layer:** Tauri 2 + Rust crates per the architecture plan, behind the existing `CatalogGateway`; libraw decode, rusqlite, XMP, 16-bit TIFF, wgpu later.
9. **AI features** (optional, last): describe-your-look with Zod validation, then masks/tagging — requires choosing a provider and key handling.

Out of scope for now: local adjustment masks and AI masking (need the native renderer to be worthwhile).

## Verification
- `npx tsc --noEmit`, `pnpm build` after every step.
- Pure-logic tsx/Vitest checks: neutral recipe round-trips pixels exactly; each new slider moves expected channels; old-catalog migration loads; reducer coalescing still works with new fields.
- Manual in browser (preview): Develop sliders/curve feel, histogram toggles, shortcuts, search; export a developed photo and check output.

## Start point
Step 0 (foundation), then step 1 (Develop parity), which is the largest visible gap against the guide.
