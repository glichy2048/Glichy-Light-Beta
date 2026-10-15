# Glichylight Desktop Core Architecture Plan

## 1. Objective

Convert the existing React/Vite browser prototype into a production-oriented desktop photo catalog, culling, non-destructive editing, and export application using Tauri 2 and Rust. Preserve the existing seven-screen UI and visual language while replacing generated sample data and session-only reducer state with filesystem-backed media, durable catalog state, background jobs, and native desktop capabilities.

The first-class targets are Windows and Linux. macOS remains buildable where practical, but packaging, signing, updater validation, and platform-specific polish are deferred until the Windows/Linux path is stable.

## 2. Confirmed Decisions

- Product name: **Glichylight**. Normalize the remaining `Glichy Light` header text during implementation.
- Desktop shell: **Tauri 2** around the existing React 19 + Vite 8 frontend.
- Native core: **Rust** owns filesystem access, catalog persistence, image metadata/decode, preview generation, export, and background work.
- Persistence: **SQLite** is authoritative for the catalog. Optional **XMP sidecars** provide metadata/develop interoperability and recovery, but are not the primary database.
- Import modes: support both **reference in place** and **managed copy**. The default remains reference mode.
- RAW decoding: use **LibRaw** behind a narrow Rust adapter so the decoder can be replaced or upgraded without changing IPC or UI domain models.
- Distribution: signed direct downloads with Tauri’s signed updater artifacts. Windows and Linux are first-class; macOS is second-class initially.
- Licensing: release the application source under **GPL-3.0-or-later**, retain third-party notices, and complete a dependency/license audit before the first public binary. Do not introduce incompatible proprietary codecs or SDKs into the default build.
- Network behavior: local-first. No account or cloud dependency is required for catalog, edit, or export workflows. Network access is limited to explicit update checks unless a future feature is separately approved.
- Preserve the current design system, routes, and workflow order rather than redesigning the product during the architecture migration.

## 3. Current-State Baseline

The repository currently contains:

- A browser-only React/Vite app with no Tauri or Rust files.
- Seven hash-navigated views implemented in `src/App.tsx`: Library, Review, Compare, Develop, Export, Settings, and System.
- A typed `useReducer` store in `src/app/AppState.tsx` containing photos, selection, ratings, flags, labels, filters, compare candidates, develop values, and preferences.
- Mock catalog records in `src/app/catalog.ts` and generated CSS landscape art instead of real image files.
- Shared types in `src/app/types.ts`, but identifiers are numeric and metadata fields are presentation strings.
- No durable persistence, filesystem permissions, job model, native dialogs, real thumbnail/decode path, sidecars, or export encoder.

The existing UI remains the behavioral reference. Migration must be incremental so it continues to run while native capabilities replace mocks.

## 4. Scope

### Included in the desktop-core program

- Tauri application shell, permissions, native dialogs, single-instance behavior, and lifecycle handling.
- Catalog creation/opening, SQLite schema, migrations, recovery, and backups.
- Reference and managed-copy import with duplicate detection.
- EXIF/file metadata extraction, RAW/JPEG pairing, thumbnail and preview generation.
- Persistent ratings, flags, color labels, keywords, selection-relevant metadata, preferences, and non-destructive develop recipes.
- Background job scheduling, progress, cancellation, and recoverable errors.
- Missing-file detection and relinking for reference catalogs.
- Real-image Review, Compare, and Develop preview delivery.
- Export to JPEG initially, with recipe application, resize, quality, metadata policy, naming, collision handling, and destination selection.
- Optional XMP read/write with conflict tracking.
- Signed packaging and updater artifacts for Windows and Linux.

### Deferred

- Cloud sync, collaboration, accounts, subscriptions, and hosted storage.
- Mobile or web deployment parity.
- Photoshop-style pixel editing, layers, compositing, or destructive source modification.
- Video catalog support.
- Full DAM features such as face recognition, geospatial search, and AI tagging.
- Print, books, tethered capture, plugins, and third-party preset marketplaces.
- First-class macOS notarization and App Store distribution.
- Advanced local masks and AI selections; the data model may reserve versioned recipe sections, but they are not required for the first release.

## 5. Target Repository Structure

Keep frontend and native boundaries explicit:

```text
src/
  App.tsx
  app/
    AppState.tsx              # UI/session state composition
    types.ts                  # frontend domain/view models
    catalogGateway.ts         # interface used by React features
    tauriCatalogGateway.ts    # Tauri invoke/event implementation
    mockCatalogGateway.ts     # browser fallback during migration/tests
    queries.ts                # frontend derived selectors
  components/
  screens/
  native/
    contracts.ts              # serializable IPC request/response types
    events.ts
src-tauri/
  Cargo.toml
  tauri.conf.json
  capabilities/
    default.json
  migrations/
    0001_initial.sql
  src/
    main.rs
    lib.rs
    commands/
      catalog.rs
      import.rs
      photos.rs
      develop.rs
      export.rs
      preferences.rs
      sidecars.rs
    domain/
      catalog.rs
      photo.rs
      recipe.rs
      jobs.rs
    services/
      catalog_service.rs
      import_service.rs
      preview_service.rs
      export_service.rs
      sidecar_service.rs
      relink_service.rs
    infrastructure/
      db/
      filesystem/
      metadata/
      raw/
      imaging/
      updater/
    jobs/
      scheduler.rs
      worker.rs
      events.rs
```

Split the current monolithic `src/App.tsx` only as features are connected to the gateway. Do not combine a large visual refactor with initial native bootstrapping.

## 6. Architectural Boundaries

### React frontend

React owns:

- Navigation and transient screen state.
- Current selection, focus, panel visibility, compare arrangement, pending form values, and optimistic UI state.
- Presentation-oriented filtering/sorting requests and rendering job progress.
- Keyboard shortcuts and accessible interaction behavior.

React must not directly access arbitrary filesystem paths, open SQLite, decode RAW files, or construct sidecars.

### Rust core

Rust owns:

- Catalog transactions and schema migrations.
- Stable IDs and file identity.
- Filesystem enumeration, copy, hashing/fingerprinting, relinking, and atomic writes.
- Metadata extraction, RAW decode, color transforms, previews, and exports.
- Background queues and resource limits.
- Sidecar parsing/writing and conflict status.
- Validation of every IPC input and path.

### Gateway and IPC

UI features depend on a `CatalogGateway` TypeScript interface, not directly on `@tauri-apps/api`. The Tauri implementation maps typed requests to commands and subscribes to events. The mock implementation keeps browser-based development and component testing possible.

Use coarse-grained commands that express user operations, not one command per database field. Commands return serializable snapshots or operation acknowledgements. Long-running commands enqueue jobs and return a `jobId` immediately.

Initial command surface:

```text
create_catalog(request) -> CatalogSummary
open_catalog(request) -> CatalogSnapshot
close_catalog() -> void
query_photos(query) -> PhotoPage
get_photo(id) -> PhotoDetail
import_paths(request) -> JobAccepted
update_photo_metadata(request) -> PhotoSummary
update_develop_recipe(request) -> DevelopRecipe
reset_develop_recipe(request) -> DevelopRecipe
request_preview(request) -> PreviewHandle
start_export(request) -> JobAccepted
cancel_job(job_id) -> void
get_jobs() -> JobSummary[]
update_preferences(request) -> Preferences
scan_missing_files() -> JobAccepted
relink_missing_files(request) -> JobAccepted
sync_sidecars(request) -> JobAccepted
```

Initial event surface:

```text
job://progress
job://completed
job://failed
catalog://changed
photo://preview-ready
photo://file-status-changed
```

Each event includes a schema version, catalog ID, job ID where applicable, and enough entity IDs to invalidate targeted frontend queries. Avoid sending image byte arrays through JSON IPC; write cache files and return Tauri-safe asset URLs/handles.

## 7. Domain Model

Replace numeric mock IDs with opaque UUID strings. Keep persistence/domain fields separate from formatted UI strings.

Core entities:

- `Catalog`: ID, schema version, display name, catalog path, managed-originals root, created/opened timestamps.
- `Photo`: stable ID, source URI/path, import mode, file identity/fingerprint, filename, extension, media type, byte size, dimensions, orientation, capture timestamp, camera/lens/exposure metadata, status, import timestamp.
- `CaptureGroup`: groups RAW+JPEG files representing one capture; stores lead member and grouping confidence/source.
- `PhotoMetadata`: rating 0–5, flag, color label, title/caption, keywords, metadata revision.
- `DevelopRecipe`: recipe version plus typed adjustment sections. Preserve current exposure, contrast, highlights, shadows, temperature, vibrance, clarity, rotation, and vertical values.
- `Collection` and `CollectionPhoto`: reserve for normal and smart collections; only basic collections need implementation if exposed in the current UI.
- `Preview`: photo ID, recipe revision, kind, dimensions, cache key, path, byte size, last access.
- `Job`: kind, state, progress counters, resumability, timestamps, structured error.
- `ExportPreset`: name and versioned export settings.
- `Preference`: typed global settings stored outside an individual catalog where appropriate.
- `SidecarState`: path, observed modified time/hash, written revision, and conflict state.

Use explicit enums serialized as stable snake_case strings. Recipe and IPC structures carry a version. Unknown future fields should not corrupt older catalogs.

## 8. SQLite Design and Durability

Use SQLite in WAL mode with foreign keys enabled. Keep migrations as ordered SQL files embedded in the binary and run them transactionally when a catalog opens.

Minimum tables:

```text
catalog_info
photos
capture_groups
photo_metadata
keywords
photo_keywords
develop_recipes
collections
collection_photos
previews
jobs
export_presets
sidecar_state
```

Key rules:

- Never persist display-formatted values such as `38.8 MB`, `1/320`, or localized dates as canonical data.
- Use unique constraints on normalized source path and file fingerprint where appropriate, while allowing an intentional second import as an explicit action.
- Metadata/develop updates are transactions and increment revisions.
- Source originals are immutable. Managed copies are copied to a staging filename, flushed, verified, and atomically renamed before the database transaction references them.
- Catalog schema upgrades create a timestamped backup before migration. If migration fails, leave the original catalog usable and report a structured error.
- On shutdown, allow active writes to finish, mark interrupted jobs, and close cleanly. On next open, recover or fail interrupted jobs according to job type.

## 9. Import Pipeline

Import is a staged background job:

1. Validate requested roots through native picker grants and reject inaccessible paths.
2. Enumerate supported files without following unsafe symlink loops.
3. Normalize paths and gather stat/file identity data.
4. Fingerprint files for duplicate detection. Start with a fast fingerprint (size, modified time, sampled hash) and compute a full content hash only to resolve ambiguity.
5. In managed-copy mode, copy into a catalog-managed date-based directory through staging and atomic rename.
6. Extract embedded metadata and preview where available.
7. Identify RAW/JPEG pairs using capture timestamp, base filename, camera serial where available, and close temporal proximity. Store why/confidence; never merge ambiguous captures silently.
8. Insert database rows in bounded batches.
9. Queue thumbnail/preview generation.
10. Emit incremental catalog changes and a final import summary.

Cancellation stops future work, cleans uncommitted staging files, and leaves already committed items valid. Failures are per-file where possible; one corrupt image must not abort an otherwise valid import.

## 10. Image and Preview Pipeline

Create a narrow imaging abstraction with implementations for:

- Embedded preview extraction for fast initial display.
- LibRaw decode for RAW files when no suitable embedded preview exists or a full-quality render is requested.
- JPEG decode/encode and image resize.
- EXIF orientation and basic color-profile handling.
- Develop recipe application.

Preview levels:

- Thumbnail: grid/filmstrip, approximately 256–512 px long edge.
- Screen preview: Review/Compare, sized to viewport or a capped long edge.
- Develop preview: recipe-aware, regenerated as adjustments change.
- Export render: full-resolution output, never sourced from a display thumbnail.

Cache keys include photo file fingerprint, preview kind, target dimensions, recipe revision, pipeline version, and relevant color settings. Cache files live in an application cache directory, not beside referenced originals. Use an LRU size budget and never delete originals or exported files during eviction.

For interactive develop changes, debounce frontend requests, cancel/supersede stale renders, render a fast reduced-resolution preview first, and replace it with a higher-quality preview. A response must carry the requested recipe revision so the UI can ignore stale results.

## 11. Non-Destructive Develop Recipes

Source files remain untouched. Store a versioned recipe in SQLite and optionally mirror supported fields into XMP.

- Keep UI slider units stable and map them to internal normalized values in one Rust module.
- Apply orientation/geometry in a deterministic order before output sizing.
- Record recipe revision and pipeline version for cache invalidation and reproducible export.
- Reset creates a new canonical default recipe revision rather than deleting history implicitly.
- MVP history can retain only the current recipe plus lightweight audit timestamps; full undo history remains frontend-session state unless separately implemented.

The initial processor must faithfully support current controls. More sophisticated tone curves, lens profiles, noise reduction, masking, and GPU paths can be added behind the same recipe/render interfaces.

## 12. XMP Sidecars

XMP is optional and disabled by default until the user chooses a sidecar policy.

Supported policy options:

- Catalog only.
- Read existing sidecars on import, then catalog only.
- Read and write sidecars.

Rules:

- Write sidecars atomically through a temporary file and rename.
- Preserve unknown namespaces/properties when updating an existing sidecar.
- Map rating, label, pick/reject, keywords, and supported develop values; keep unsupported internal values in a documented Glichylight namespace.
- Track the last observed sidecar hash and catalog metadata revision.
- If both catalog and sidecar changed since last synchronization, mark a conflict and ask the user which source wins; never silently overwrite.
- For read-only referenced folders, retain changes in SQLite and report sidecar write status without failing the catalog update.

## 13. Filesystem Safety and Relinking

- Persist normalized absolute source paths plus platform file identity where available and a content fingerprint for recovery.
- On access failure, distinguish missing, permission denied, offline volume, and corrupt file.
- Display cached previews while originals are offline, but disable full export when required source bytes are unavailable.
- Relinking accepts a file or root directory, scans in the background, matches exact identity/hash first, then presents lower-confidence filename/metadata matches for confirmation.
- Never allow a relative path or IPC-provided path to escape the catalog-managed root for managed-copy operations.
- All destructive actions require explicit semantics: removing from catalog is distinct from moving a managed original to the OS trash. Permanent deletion is not part of the initial release.

## 14. Background Job System

Implement a Rust scheduler with bounded worker pools rather than spawning unbounded tasks.

Job classes:

- IO-heavy: enumeration, copy, hashing, sidecar work.
- CPU-heavy: RAW decode, resize, recipe render, export encode.
- Interactive: current-photo preview requests, which have higher priority than bulk thumbnails/exports.

Every job supports structured progress and cancellation where safe. Persist durable bulk jobs, but keep ephemeral interactive preview requests in memory. On restart, resumable imports/exports may be offered for resume; non-resumable jobs are marked interrupted with a clear reason.

Errors have stable codes, user-facing summaries, optional paths/entity IDs, and diagnostic details suitable for logs without exposing unrelated private filesystem data.

## 15. Frontend State Migration

Refactor `AppState` into three categories:

1. **Server/catalog state** from the gateway: photos, persistent metadata, recipes, persisted preferences, job snapshots.
2. **Transient UI state**: active screen, selected IDs, focused photo, expanded panels, compare layout, filters before submission.
3. **Optimistic mutations**: rating/flag/label/slider changes with pending revision and rollback/error state.

Migration steps:

- Introduce string IDs and presentation adapters while still using mock records.
- Add `CatalogGateway` and run the app against `mockCatalogGateway` by default in browser mode.
- Add Tauri gateway and catalog bootstrap state (`no catalog`, `opening`, `ready`, `failed`).
- Move one mutation family at a time: ratings/flags/labels, then preferences, then recipes.
- Replace mock catalog loading with paged queries.
- Replace `PhotoArt` in workflow screens with preview handles, retaining generated artwork only in the System reference or explicit empty/demo states.
- Keep compare candidates and current selection transient unless product requirements later call for saved comparison sets.

The UI must show pending, failed, missing-file, offline, importing, rendering, and exporting states instead of assuming every action succeeds immediately.

## 16. Export Pipeline

The initial real export supports JPEG.

Export request includes:

- Photo IDs and exact recipe revisions.
- Destination directory granted through a native picker.
- Naming template with validated tokens and a preview.
- JPEG quality.
- Original, fit-within, or long-edge resize.
- sRGB output initially.
- Metadata policy: all safe metadata, copyright only, or none.
- Collision policy: skip, overwrite, or auto-suffix.

For each photo, validate source availability, decode full resolution, apply the captured recipe revision, transform/resize, encode to a temporary output, flush, and atomically rename. Continue past individual failures and finish with a per-file summary. Cancellation removes temporary files but leaves completed exports intact. Never overwrite without the request’s explicit collision policy.

## 17. Tauri Security and Lifecycle

- Use Tauri 2 capability files with least privilege. Do not enable an unrestricted shell plugin or global filesystem access.
- Open source/destination locations through native dialogs and scope access to approved operations.
- Validate all command input in Rust even when TypeScript types exist.
- Enforce a single primary instance. A second launch forwards catalog/file-open arguments to the running instance.
- Prompt when closing with unsafe staging operations; ordinary database writes should be short and transactional rather than requiring a global “save.”
- Store global preferences and trusted update configuration in platform application-data locations.
- Logs are local, bounded, and scrubbed of unnecessary path details. Add an explicit “copy diagnostics” action rather than silently uploading telemetry.
- No telemetry is added in this program.

## 18. Packaging, Signing, and Updates

### Windows

- Produce signed NSIS and/or MSI installers from CI.
- Sign binaries and installer with the project’s code-signing certificate.
- Validate install, update, uninstall, file permissions, long paths, removable/offline volumes, and GPU-disabled fallback on supported Windows versions.

### Linux

- Produce AppImage and one native package format initially (deb recommended), then add rpm if release demand justifies it.
- Document system/library requirements for LibRaw or prefer a reproducible bundled/static strategy where licenses permit.
- Test common desktop portals and native file dialogs on Wayland and X11.
- Sign release checksums/artifacts and updater metadata.

### Updater

Use Tauri’s signed updater flow over HTTPS. CI generates updater manifests and signatures only from tagged release builds. The client verifies signatures before installation, supports a user-visible manual check, and never applies an unsigned package. Failed updates leave the installed application runnable.

## 19. Delivery Phases

### Phase 0 — Foundations and risk spikes

- Record supported OS/toolchain versions and add Rust/Tauri prerequisites.
- Audit candidate crates, LibRaw binding/build strategy, licenses, and binary distribution implications.
- Spike LibRaw decode and metadata extraction on representative RAW files from major camera vendors on Windows and Linux.
- Spike Tauri asset delivery for local previews and confirm CSP/capability behavior.
- Decide from measured evidence whether LibRaw is linked dynamically or bundled per platform; encapsulation must make this a build concern, not an app-domain concern.

Exit: a minimal Tauri window displays the existing app and decodes one RAW and one JPEG through Rust on both first-class platforms.

### Phase 1 — Desktop shell and typed bridge

- Add `src-tauri`, Tauri configuration, capabilities, and frontend API dependencies.
- Add gateway/contracts and browser mock implementation.
- Add native open/create catalog dialogs, bootstrap/error states, single-instance handling, and app-data paths.
- Normalize branding to Glichylight.

Exit: browser mode still runs with mocks; packaged mode opens and creates a catalog through typed IPC.

### Phase 2 — Catalog persistence

- Add SQLite connection management, schema, migrations, backup/recovery, repositories, and catalog commands.
- Migrate identifiers and metadata types away from presentation strings.
- Persist ratings, flags, labels, keywords, recipes, export presets, and catalog-scoped preferences.

Exit: metadata and recipes survive restart; migration and failed-open behavior are tested.

### Phase 3 — Import and thumbnails

- Implement native pickers, reference/managed import, fingerprints, duplicate handling, metadata extraction, grouping, job progress/cancel, and thumbnail cache.
- Connect Library to paged real catalog queries and real previews.
- Add missing/offline statuses and basic relinking.

Exit: a mixed RAW/JPEG folder can be imported, grouped, reopened, filtered, and viewed without source modification.

### Phase 4 — Review, Compare, and Develop rendering

- Connect Review and Compare to screen previews and persisted metadata mutations.
- Implement recipe-aware develop previews, stale-request cancellation, reset, and frontend optimistic state.
- Verify current keyboard and auto-advance workflows against asynchronous mutations.

Exit: culling and current adjustment controls work on real images, remain non-destructive, and survive restart.

### Phase 5 — Export and sidecars

- Implement JPEG full-resolution export with progress, cancellation, collision policies, and result summary.
- Implement XMP policy, import mapping, atomic writes, unknown-property preservation, and conflict handling.
- Add export presets and destination validation.

Exit: selected photos export with the requested recipe and metadata policy; sidecar failures/conflicts are visible and do not corrupt catalog state.

### Phase 6 — Hardening and distribution

- Add cache eviction, interrupted-job recovery, bounded logging, diagnostics, and large-catalog performance work.
- Complete security and license audits.
- Configure CI matrices, artifact signing, updater signing/manifests, release notes, and clean-machine installation tests.
- Validate accessibility and keyboard behavior after async/native migration.

Exit: signed Windows/Linux release candidates install, update, reopen existing catalogs, and pass the release checklist.

## 20. Verification Strategy

Follow repository-prescribed commands where present; add dedicated native checks as the Tauri workspace is introduced.

### Automated checks

- Frontend: TypeScript/Vite production build using the repository script, plus focused unit tests once a test runner is added deliberately.
- Rust: `cargo fmt --check`, `cargo clippy` with warnings denied for project code, and `cargo test`.
- Contract tests: serialize every command/event fixture in Rust and TypeScript and verify schema/version compatibility.
- Database tests: clean creation, every migration path, rollback on failed migration, constraints, and backup restoration.
- Import tests: duplicates, corrupt files, Unicode/long paths, symlink loops, cancellation, read-only reference folders, and partial managed-copy failure.
- Imaging golden tests: representative JPEG/RAW fixtures, orientation, recipe application, resize, and deterministic tolerance-based output comparisons.
- Sidecar tests: round trip, unknown namespace preservation, read-only failure, malformed XML, and conflict detection.
- Export tests: naming tokens, collisions, cancellation, unavailable source, recipe revision pinning, and atomic output behavior.

Use small redistributable fixtures in the repository only when licensing allows; store larger/private camera samples in a controlled CI fixture source with documented provenance.

### Manual acceptance

- Create/open/close multiple catalogs.
- Import the same folder by reference and managed copy and verify originals are untouched.
- Reopen after restart and confirm metadata/develop persistence.
- Disconnect and reconnect a referenced drive; verify cached display, status, relink, and export blocking.
- Cull rapidly with keyboard controls while thumbnail work runs.
- Compare two to four real photos and mark a winner without losing metadata updates.
- Drag develop controls rapidly and confirm stale renders never replace newer edits.
- Export a mixed selection with each collision policy and cancel mid-job.
- Read/write sidecars and resolve a deliberate external-edit conflict.
- Install, update, roll forward after an interrupted update, and uninstall on clean Windows/Linux machines.

### Performance targets

Treat these as initial engineering budgets to validate with representative hardware:

- Catalog of 50,000 photos opens to interactive UI in under 3 seconds using paged/lazy data.
- Cached grid thumbnails begin appearing in under 500 ms after navigation.
- Rating/flag/label feedback appears immediately and commits durably within 250 ms under normal load.
- Interactive preview work preempts bulk thumbnail generation.
- Memory remains bounded during large imports and exports; no full catalog or full-resolution batch is retained in frontend memory.

## 21. Failure Handling and User Experience

Every native operation returns structured errors with an actionable category:

- Permission denied: identify the location and offer reselect/retry.
- Missing/offline source: retain catalog metadata and cached preview; offer locate/relink.
- Unsupported/corrupt image: skip the file and include it in the job report.
- Catalog locked/in use: open read-only only if explicitly supported; otherwise explain how to close the other instance.
- Migration failure: preserve original catalog and offer diagnostics/backup location.
- Disk full: stop writes safely, clean temporary files, and preserve committed data.
- Export collision: follow the selected policy, never improvise.
- Sidecar conflict: preserve both values until the user resolves the conflict.
- Worker panic/unexpected failure: fail the job, keep the app responsive, and provide local diagnostics.

## 22. Completion Criteria

The desktop-core migration is complete when:

- Glichylight runs as a Tauri 2 desktop application on supported Windows and Linux targets while retaining a mock browser mode for focused frontend work.
- Users can create/open catalogs, import by reference or managed copy, and safely reopen them.
- Real RAW/JPEG metadata and previews replace generated artwork in product workflows.
- Ratings, flags, labels, keywords, grouping, preferences, and develop recipes are durable.
- Review and Compare remain fast while background work runs.
- Develop controls produce recipe-aware, non-destructive previews and exports.
- JPEG export is full-resolution, cancellable, atomic, and reports partial failures.
- Optional XMP behavior is explicit, atomic, and conflict-aware.
- Missing referenced originals can be diagnosed and relinked.
- First-class release artifacts are signed, updater packages are signature-verified, and license notices are complete.
- Automated and manual checks cover database safety, filesystem edge cases, image correctness, job recovery, and clean-machine packaging.

## 23. Implementation Guardrails

- Do not replace source originals or write beside referenced files unless the user has enabled XMP writes.
- Do not expose SQLite or filesystem details directly to React components.
- Do not send large image buffers over JSON IPC.
- Do not make UI rendering wait synchronously for import, decode, or export.
- Do not introduce GPU-only correctness; GPU acceleration must have a CPU fallback and can remain deferred until profiling justifies it.
- Do not expand scope into a UI redesign during core migration.
- Keep every schema, recipe, cache key, and IPC contract versioned.
- Prefer small vertical slices that keep browser mock mode and packaged mode usable at each phase.
