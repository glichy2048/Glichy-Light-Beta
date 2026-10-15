# SafeLight Complete Product UI System Plan

## Objective

Expand the existing four-screen SafeLight prototype into a polished, desktop-first photo catalog, culling, comparison, non-destructive editing, export, and preferences product. Preserve the current warm charcoal visual language, Instrument Sans/DM Mono typography, generated landscape artwork, and browser-only React/Vite architecture.

The result will contain six clearly labeled product screens plus a secondary in-app **System** reference view:

1. Library / Catalog
2. Culling / Review
3. Compare / Select Mode
4. Develop / Edit Workspace
5. Export / Deliver
6. Settings / Preferences
7. System Reference (accessible from Settings; not a primary workflow screen)

## Confirmed Product Decisions

- Build an **interactive product prototype**, not a filesystem-backed desktop application.
- Persist ratings, picks/rejects, labels, selection, grouping, develop adjustments, and export settings in shared React state for the current browser session.
- Keep and expand the existing generated landscape artwork rather than introducing external photography.
- Keep the interface desktop-first and optimized for 1440×900, with a usable minimum around 1180px; responsive behavior below that width may collapse secondary inspectors but will not redesign the app as mobile-first.
- Add an in-app **System** view documenting visual tokens, component states, information architecture, and layout rationale.
- Use no new runtime dependencies unless implementation reveals a concrete need; React state, CSS, and existing Vite tooling are sufficient.

## Current-State Assessment

The repository currently contains:

- A single `src/App.tsx` with Library, Develop, Compare, and Export views.
- A single `src/index.css` containing the visual tokens and all screen styles.
- Hash-based view switching.
- Generated `PhotoArt` landscapes, histogram graphics, sliders, ratings, and an animated export progress example.
- No shared catalog model: each screen currently owns isolated state.
- No dedicated Culling, Settings, System Reference, RAW/JPEG grouping, filtering, sort behavior, shared metadata chips, or cross-screen workflow state.

The implementation should preserve the recognizable current theme while refactoring the monolith into reusable product and design-system layers.

## Information Architecture and Navigation

### Global header

Use one consistent application header on all product screens:

- Left: SafeLight aperture mark and product name.
- Primary workspaces: **Library**, **Review**, **Compare**, **Develop**.
- Right-side global actions: undo/redo where relevant, background activity indicator, **Export** primary action, Settings icon, user avatar.
- Export and Settings remain full screens but are reached as actions rather than crowding the primary workflow navigation.
- The active screen is visually indicated with the warm orange underline/current state.

### Routes

Continue the lightweight hash-router approach:

- `#library`
- `#review`
- `#compare`
- `#develop`
- `#export`
- `#settings`
- `#system`

Handle `hashchange` so browser back/forward updates the visible screen. Unknown hashes fall back to Library.

### Workflow rationale

The navigation follows the photographer’s sequence:

**Ingest and organize → make fast decisions → compare finalists → edit non-destructively → deliver**.

Settings is global configuration, while the System reference is intentionally secondary and entered from Settings so it does not appear as a customer workflow destination.

## Code and File Structure

Refactor the current single-file implementation into small, explicit modules:

```text
src/
  App.tsx
  app/
    AppState.tsx
    catalog.ts
    types.ts
  components/
    AppHeader.tsx
    Button.tsx
    Icon.tsx
    MetadataChip.tsx
    PhotoArt.tsx
    PhotoCard.tsx
    RatingControl.tsx
    StatusControls.tsx
    Histogram.tsx
    Slider.tsx
    SegmentedControl.tsx
    SelectControl.tsx
    Toggle.tsx
    Panel.tsx
    Filmstrip.tsx
  screens/
    LibraryScreen.tsx
    ReviewScreen.tsx
    CompareScreen.tsx
    DevelopScreen.tsx
    ExportScreen.tsx
    SettingsScreen.tsx
    SystemScreen.tsx
  index.css
```

Keep the CSS in `src/index.css` unless it becomes difficult to navigate; use section comments and shared classes rather than introducing CSS modules or a new styling dependency.

## Shared Product State and Data Flow

### Catalog model

Define a typed `Photo` model with enough realistic data to drive every screen:

- `id`, `baseName`, `captureDate`
- `format`: `RAW | JPEG`
- `groupId` and `isGroupLead` for RAW/JPEG pairs
- `tone` for generated artwork variation
- `dimensions`, `megapixels`, `fileSize`
- `camera`, `lens`, `focalLength`, `aperture`, `shutter`, `iso`
- `rating`: `0 | 1 | 2 | 3 | 4 | 5`
- `flag`: `unflagged | pick | reject`
- `colorLabel`: `none | red | yellow | green | blue | purple`
- `keywords`
- `edited`
- `develop` adjustment object

Create 16–20 sample photos across multiple dates, folders, formats, ratings, and flags. Include at least three RAW/JPEG grouped pairs so stack behavior is visible and testable.

### Shared store

Use a typed React context backed by `useReducer`:

- Active route and selected photo IDs.
- Grid selection and compare selection bucket.
- Per-photo ratings, flags, labels, and develop values.
- Active catalog filters and sort mode.
- RAW/JPEG grouping preference.
- Review auto-advance preference.
- Export preset and settings.
- Application preferences.

Key actions:

- `selectPhoto`, `togglePhotoSelection`, `setCompareSelection`
- `setRating`, `setFlag`, `setColorLabel`
- `setFilter`, `clearFilters`, `setSort`
- `toggleGroup`, `setGroupingMode`
- `setDevelopValue`, `resetDevelopSection`, `resetAllDevelop`
- `setExportSetting`, `saveExportPreset`
- `setPreference`

Do not mutate source photos. Derive edited presentation from adjustment state, reinforcing the non-destructive workflow. Keep persistence session-only; do not add localStorage unless required later.

### Derived selectors

Centralize helper functions for:

- Filtered/sorted catalog photos.
- Visible group leads and expanded group members.
- Pick/reject/unflagged counts.
- Review queue and next photo.
- Compare candidates (2–4 only).
- Current selected photo and metadata.

## Design System Foundation

### Color tokens

Consolidate current colors into semantic CSS custom properties:

- Canvas / near-black: `#0F0E0C`
- App background / dark charcoal: `#141311`
- Sidebar and header surface: `#181714`
- Raised slate surface: approximately `#1F1E1A`
- Selected/pressed surface: `#2E2B26`
- Subtle border: `#2A2823`
- Strong border/track: `#3A3630`
- Primary text: `#ECE8E0`
- Secondary text: `#E2DDD3`
- Muted text: `#A8A196`
- Primary warm orange: `#E8A33D`
- Pick green: existing `#7FB5A0`
- Reject red: existing `#D9694F`
- Color-label yellow: a distinct yellow token separate from the orange action accent
- Supporting label colors: blue and purple tokens

Add semantic overlay tokens for selected, hover, success, danger, image scrims, and focus rings. Screen CSS should consume semantic variables instead of repeating literals.

### Typography

Keep Instrument Sans for UI and DM Mono for technical metadata.

- Product/screen title: 18px, 600, slightly tightened tracking.
- Section title: 14px, 600.
- Primary label/body: 12–14px, 400/500.
- Caption/helper: 10–11px, muted.
- Technical metadata: 10–11px DM Mono.

Represent these as shared utility/component classes rather than one-off declarations.

### Spacing

Define the required scale as CSS tokens:

- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-6: 24px`
- `--space-8: 32px`

Allow only layout-specific structural dimensions outside the spacing scale, such as header height and side-panel width.

### Surfaces and shadows

- Canvas: darkest image-review area.
- Sidebar/header: slightly elevated charcoal.
- Cards/popovers: raised slate with subtle border.
- Selected surfaces: restrained warm overlay and accent border.
- Image shadow: deep, wide shadow only around the primary photo viewport.
- Popover/menu shadow: compact dark shadow with clear border.

Avoid decorative gradients on UI chrome; reserve gradients for generated photo art and histograms.

### Component states

Every shared control must visibly support:

- Rest
- Hover
- Focus-visible
- Selected/current
- Pressed/active
- Disabled

Buttons will expose a consistent hierarchy:

1. Primary: warm orange fill for Import, Export, Done, Save.
2. Secondary: bordered dark surface for workflow actions.
3. Tertiary/ghost: text or icon actions on dark surfaces.
4. Destructive: red treatment for reject/removal/reset confirmation.
5. Success status: green treatment for picked/completed states.

## Shared Components

### MetadataChip

Create a compact component with semantic variants and optional icon:

- Rating (`5 ★`)
- Flag (`Pick`, `Rejected`, `Unflagged`)
- Color label dot and text
- Date
- Camera
- File type (`RAW`, `JPEG`, `RAW+JPEG`)

Use chips in thumbnail overlays, review details, compare captions, and inspector summaries. Dense thumbnail contexts may use icon-only or abbreviated variants; side panels use labeled variants.

### PhotoCard

Support:

- Generated image preview.
- Selected and multi-selected states.
- Hover quick actions.
- Rating, flag, label overlays.
- RAW/JPEG group stack and expand count.
- File name and compact metadata.
- Keyboard focus and Enter/Space selection.

### Rating and review controls

- Five-star control with clickable stars and keyboard shortcuts `1–5`; `0` clears rating.
- Pick/reject controls with `P`, `X`, and `U` shortcuts.
- Color-label menu or row with distinct colors and keyboard hints.
- Changes update shared state and are reflected across all screens.

### Form/control primitives

Standardize Button, IconButton, SegmentedControl, SelectControl, Toggle, Slider, field shell, chip, panel header, tooltip/keyboard hint, and progress bar. Keep accessible labels and focus states.

## Screen Specifications

### 1. Library / Catalog

**Header:** Global app header with Library active; Import primary action and background activity status.

**Left sidebar:**

- Catalog counts: All, Recent, Picks, Rejected, Unrated.
- Folder tree grouped by year/project.
- Smart collections.
- Local storage status emphasizing local-first behavior.

**Center:**

- Clearly labeled `Library / Catalog` toolbar.
- Search, active filter chips, filter popover trigger, sort selector, ascending/descending toggle, grid density control.
- Date-grouped thumbnail grid using 16–20 photos.
- RAW/JPEG grouping toggle and visible stacked-pair badges.
- Multi-selection count bar when more than one photo is selected.

**Right inspector:**

- Selected preview.
- Full metadata chip row.
- File, camera, location/keywords, and grouping details.
- Quick rating, flag, and color-label controls.

**Functional states:**

- Grid selection and multi-selection.
- Filters by rating, flag, label, type, and edited status.
- Sort by capture time, rating, file name, or edit time.
- Expand/collapse RAW/JPEG groups.
- Double-click/Enter opens Develop for the selected photo.

### 2. Culling / Review

**Header:** Global header with Review active, progress summary (`18 of 64`) and an `End review` action.

**Left sidebar:**

- Review session queue.
- Queue filters: All, Unreviewed, Picks, Rejected.
- Auto-advance toggle.
- Pick/reject/unflagged counts.

**Center:**

- Large single-photo loupe view on the darkest canvas.
- Clear `Culling / Review` label.
- Optional focus/zoom indicator and fit/100% segmented control.
- Bottom filmstrip with the active photo, picked green markers, reject red markers, ratings, and color labels.

**Right controls:**

- Prominent Pick, Reject, and Unflag actions with shortcuts.
- Star rating row.
- Color-label row.
- Compact metadata chips and exposure data.
- RAW/JPEG group switcher for paired captures.

**Functional states:**

- Previous/next arrows and keyboard navigation.
- `P` marks pick, `X` rejects, `U` clears; auto-advance moves to the next unreviewed photo.
- `1–5` rates; `0` clears.
- Selected state is immediately reflected in counts and filmstrip markers.

### 3. Compare / Select Mode

**Header:** Global header with Compare active, selected candidate count, and actions to remove all or send the winner to Develop.

**Left sidebar:**

- Candidate bucket showing 2–4 selected photos.
- Add/remove controls.
- Reference/Select designation.
- Synchronize zoom/pan toggle.

**Center:**

- Clearly labeled `Compare / Select Mode`.
- 2-up, 3-up, and 4-up layout toggles.
- Equal-sized image cells with filename, index, zoom, rating, flag, and color-label indicators.
- Active candidate gets the orange focus border; selected winner gets a green Select badge.
- Optional detail zoom mode can magnify the same region across all candidates visually.

**Right panel:**

- Active candidate metadata and exposure comparison.
- Quick rating/flag/label controls.
- Difference summary for focal length, shutter, aperture, and ISO.
- `Select as best` primary action and `Remove candidate` secondary action.

**Bottom strip:**

- Fast preview thumbnails from the current collection for replacing/adding candidates.

**Functional states:**

- Enforce minimum 2 and maximum 4 candidates.
- Active candidate navigation by number keys.
- Add/remove from fast strip.
- Pick, reject, rate, and label updates remain shared with Library and Review.

### 4. Develop / Edit Workspace

**Header:** Global header with Develop active, filename, edited status, undo/redo, Before/After control, and Export action.

**Left sidebar:**

- Tabs for Presets, History, and Snapshots.
- Preset thumbnails based on generated artwork.
- Current applied preset and history entries.

**Center:**

- Clearly labeled `Develop / Edit Workspace` through toolbar context.
- Large image viewport with fit/zoom status.
- Tool rail for Adjust, Crop, Transform, Heal, Mask.
- Before/After modes: After, Before, and split comparison.
- Crop overlay with rule-of-thirds grid and aspect-ratio selector.
- Transform overlay/control state for rotate, vertical, and horizontal correction.
- Bottom filmstrip preserving ratings and flags.

**Right controls:**

- Histogram and capture metadata.
- Expandable panels: Light, Color, Detail, Optics, Geometry, Local Adjustments.
- Functional Light controls and representative functional controls in Color and Geometry.
- Reset per section and Reset All.
- Edited values stored per photo; switching photos restores each photo’s adjustments.

**Functional states:**

- Slider drag/click and keyboard arrows.
- Before/After reflects source versus derived adjusted image styling.
- Crop/transform tools show mode-specific overlays and right-panel options.
- Reset and undo/redo operate on prototype state without modifying source metadata.

### 5. Export / Deliver

**Header:** Global header plus clearly labeled `Export / Deliver`; close returns to the prior workflow screen.

**Left sidebar:**

- Export presets: Full-size JPEG, Web 2048px, Client Proof, Archive TIFF.
- Selected and user-saved preset states.
- Add, duplicate, rename, and remove affordances represented with realistic states.

**Center settings:**

- Destination and conflict behavior.
- File naming template.
- Format, quality, color space, bit depth where applicable.
- Resize dimensions and resolution.
- Output sharpening.
- Metadata and watermark options.
- Settings update the preview summary immediately.

**Right preview/queue:**

- Large preview.
- Output name, dimensions, expected size, and format chips.
- Queue of selected photos.
- Progress, current file, completion, cancel, and retry states.

**Functional states:**

- Preset selection populates settings.
- Export action animates progress through queued items.
- Completed state turns green and offers `Show in folder` and `Export again` representative actions.
- Disabled states appear when no photos are selected or destination is unavailable.

### 6. Settings / Preferences

**Header:** Global header with Settings indicated and a clear `Settings / Preferences` title.

**Left sidebar:**

- General
- Catalog & Storage
- Import
- Editing
- Export
- Performance
- Shortcuts
- About / System

**Center content:**

- General: startup workspace, appearance fixed to SafeLight Dark, interface density.
- Catalog & Storage: local catalog path, cache size, backup cadence, storage status.
- Import: copy/reference behavior, RAW/JPEG grouping default, duplicate handling.
- Editing: default camera profile, auto-save edit history, GPU preview toggle.
- Export: default preset and completion behavior.
- Performance: cache and preview generation settings.
- Shortcuts: grouped shortcut reference for ratings, flags, navigation, and compare.

**Right contextual panel:**

- Brief explanation for the selected category.
- Current catalog status and version details where relevant.
- Link to the System Reference from About/System.

**Functional states:**

- Toggles, segmented controls, and select controls update shared preferences.
- Disabled dependent controls demonstrate hierarchy, such as cache size disabled when preview caching is off.
- Reset category and Reset all preferences actions include clear destructive styling.

### 7. System Reference

This is a secondary documentation surface, not one of the six workflow screens.

Include:

- Color swatches with semantic token names.
- Typography specimens for title, section, label, caption, and mono metadata.
- Spacing scale visualized at 4/8/12/16/24/32.
- Surface and shadow examples.
- Button hierarchy with rest, hover-described, selected, pressed, and disabled examples.
- Metadata chip variants.
- Rating, flag, label, toggle, select, slider, and progress components.
- Compact information architecture diagram: Library → Review → Compare → Develop → Export, with Settings as global.
- Short layout rationale explaining three-pane density, dark image canvas, constrained orange accent, and status color semantics.

## Interaction and Edge-Case Rules

- Ratings, flags, and labels are single sources of truth and update everywhere.
- Pick and reject are mutually exclusive; setting one replaces the other.
- Color label is single-select per photo.
- Rating `0` means unrated and renders empty stars.
- Review auto-advance skips already reviewed items when the Unreviewed queue is active.
- Compare accepts only 2–4 items. Attempting to add a fifth shows a compact inline limit message; removing below two disables compare layout actions.
- RAW/JPEG grouped cards show the lead item and count. Expanding reveals both files without losing shared capture grouping.
- Selection is distinct from pick status: selecting changes UI focus; picking records a catalog decision.
- Develop adjustments are per-photo and non-destructive. Reset returns values to defaults but does not change rating/flag metadata.
- Export progress cannot be started twice simultaneously; cancel pauses/ends the mock job cleanly; retry is only shown for a representative failed row if implemented.
- All icon-only buttons require accessible labels/tooltips.
- Keyboard focus must remain visible against all dark surfaces.

## Desktop Layout and Responsive Constraints

- Primary target: 1440×900.
- Comfortable desktop range: 1280–1920px.
- Use CSS grid for three-pane workspaces and flex for toolbars/filmstrips.
- Sidebars use stable widths around 220–300px; center content consumes remaining space with `minmax(0, 1fr)`.
- At narrower desktop/tablet widths, hide or collapse the right inspector before removing the left workflow navigation.
- Preserve minimum usable image and grid widths; use internal scrolling in panels rather than allowing the entire application shell to overflow unpredictably.
- Maintain sticky global header and independent pane scrolling.
- Existing mobile media rules may remain as graceful fallback, but mobile-specific feature parity is not a success criterion.

## Accessibility and Usability

- Use semantic buttons for actions and avoid nested interactive controls.
- Provide `aria-pressed` for toggle buttons and selected states.
- Provide slider min/max/current values and keyboard arrow behavior.
- Ensure visible focus rings use the accent token.
- Do not rely on color alone: pick/reject and color labels include icon or text labels in detailed contexts.
- Add accessible names to generated artwork and histograms.
- Preserve readable contrast for captions and disabled states against dark surfaces.
- Respect reduced motion for progress/transition effects through a media query.

## Implementation Sequence

1. **Extract foundation:** Move icons, controls, photo artwork, histogram, and metadata primitives out of `App.tsx`; add semantic tokens and spacing/type utilities.
2. **Create shared catalog state:** Add typed sample data, reducer/context, derived selectors, route synchronization, and shared metadata actions.
3. **Rebuild Library:** Add filters, sorting, grouping, metadata chips, shared state updates, and realistic multi-selection.
4. **Build Review:** Implement single-photo culling, keyboard controls, auto-advance, queue counts, and filmstrip statuses.
5. **Expand Compare:** Add 2/3/4-up modes, candidate bucket, active/winner state, metadata comparison, and candidate limits.
6. **Expand Develop:** Add history/preset/snapshot left panel, crop/transform modes, before/after split, more adjustment panels, and per-photo edit state.
7. **Expand Export:** Add preset-driven settings, preview summary, queue states, and controlled progress behavior.
8. **Build Settings:** Add category navigation, realistic preference controls, dependencies, and System entry point.
9. **Build System Reference:** Document implemented tokens, components, states, IA, and layout rationale using the actual shared components.
10. **Polish and audit:** Normalize spacing, panel scroll behavior, selected/hover/disabled states, keyboard focus, and desktop breakpoints.

## Verification Strategy

### Automated checks

Run after implementation:

- `pnpm exec tsc --noEmit`
- `pnpm build`
- `git diff --check`

Use the repository’s existing scripts and do not start a second development server.

### Manual preview checks

Verify each route directly and through navigation:

- `#library`
- `#review`
- `#compare`
- `#develop`
- `#export`
- `#settings`
- `#system`

At 1440×900 and approximately 1280×800, confirm:

- No unintended page-level overflow.
- Independent side-panel and center-area scrolling.
- Screen names are clearly visible.
- Shared ratings/flags/labels update across Library, Review, Compare, and Develop.
- RAW/JPEG grouping expands/collapses correctly.
- Filters and sorts change the visible catalog.
- Review keyboard actions and auto-advance behave correctly.
- Compare enforces 2–4 candidates and switches layouts.
- Develop values persist per photo; before/after and crop/transform modes display correctly.
- Export preset changes update settings and progress reaches completion.
- Settings dependencies and disabled states are legible.
- System view accurately reflects the actual tokens and control variants.
- Focus-visible states are present for keyboard navigation.

## Completion Criteria

The work is complete when:

- All six product screens and the System reference are navigable and visually consistent.
- Every required region—header, left sidebar, center, and right controls where relevant—is represented with realistic desktop density.
- The required metadata chips, review states, filters, sort controls, grouping, ratings, flags, labels, comparison, develop tools, and export presets are visible and function through shared state.
- The design system visibly documents required colors, typography, spacing, surfaces, shadows, button hierarchy, and interaction states.
- The interface retains the existing SafeLight theme while becoming more systematic and production-ready.
- TypeScript and production build checks pass without warnings attributable to the new work.

## Explicit Non-Goals

- Real RAW decoding or image-processing pipeline.
- Real filesystem import/export.
- Database, cloud sync, authentication, or persistent catalog storage.
- Pixel-level Lightroom replication.
- Mobile-first redesign or full mobile feature parity.
- Adding external photography or third-party UI libraries.
