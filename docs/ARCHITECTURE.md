# Architecture

## System boundary

```text
OSSM-hardware checkout or pinned archive
  - STL / STEP / schematics / firmware
                     |
                     v
catalog overlay + source lock + schemas
                     |
               validate / prepare
                     |
          compiled catalog + Web assets
                     |
                     v
generic React UI -> compatibility engine -> BOM engine -> export
                     |
                     v
             Three.js scene renderer
```

The application may know generic concepts such as slots, options, capabilities,
parts, offers, and attachment anchors. It must not know that OSSM has a
`motor_mount` slot unless that slot exists in the loaded catalog.

## Proposed directories after scaffolding

```text
src/
  components/       Generic panels and viewer components
  catalog/          Loading, validation, and TypeScript domain types
  engine/           Selection, compatibility, BOM, and export logic
  scene/            Model loading, camera fitting, anchors, and scene state
catalog/
  schema/           JSON Schema files
  slots/            UI hierarchy and selection cardinality
  options/          Selectable configurations and capability rules
  parts/            Stable physical part identities
  offers/           Optional vendor/region/currency price records
scripts/
  sync-hardware     Fetch or resolve the pinned hardware source
  prepare-models    Copy/convert only referenced assets
sources/
  ossm-hardware.lock.json
public/generated/   Build output; do not hand edit
```

## Hardware source resolution

Resolution order should be:

1. explicit `OSSM_HARDWARE_PATH`;
2. sibling `../ossm-hardware` when it matches the expected source;
3. a downloaded cache of the pinned commit.

The build should report the actual commit it used and fail when a supposedly
pinned input cannot be identified. A dirty local source may be allowed during
development, but it must be visibly reported and must not masquerade as the
locked commit in an export.

## Catalog compilation

Author-friendly YAML should be parsed and validated against JSON Schema before
the application build. The compiler should produce one normalized JSON artifact
for the browser.

Validation should cover more than shape:

- unique IDs;
- all referenced slot, option, part, capability, and asset IDs exist;
- referenced repository files exist;
- required selections have at least one reachable option;
- no option requires itself through a dependency cycle;
- BOM quantities and units are valid;
- price offers declare currency and update time;
- evidence state and source provenance are present.

## Compatibility engine

Each selected option contributes:

- `provides`: capabilities now available;
- `requires`: capabilities that must exist;
- `conflicts`: capabilities that make the option invalid;
- optional child slots that become relevant after selection.

The resolver returns structured results, not only a boolean:

```ts
type CompatibilityResult = {
  valid: boolean
  missing: CapabilityId[]
  conflicts: CapabilityId[]
  explanations: Explanation[]
}
```

That structure powers disabled-option messages and export warnings.

## BOM engine

Every selected option may contribute zero or more BOM lines. The engine:

1. collects lines from selected options;
2. groups them by stable part ID and compatible unit;
3. sums quantities;
4. preserves a list of contributing option IDs;
5. attaches an applicable price offer without changing part identity;
6. reports incomplete prices separately from physical BOM completeness.

The exported BOM must answer both "what do I need?" and "why is it here?".

## Scene pipeline

### Prototype

- Load one selected STL at a time.
- Compute bounds, center the mesh, and fit the camera.
- Provide orbit, zoom, reset-view, loading, and error states.
- Lazy-load the selected model.

### Assembly stage

Raw filenames do not encode assembly placement. Full configuration preview
requires catalog attachment metadata:

- units;
- local origin correction;
- parent and child attachment-interface IDs;
- position and orientation;
- optional motion axis/range;
- optional exploded-view direction;
- optional simplified collision geometry.

Soft cables and missing motor-tail geometry cannot be reliably inferred by mesh
collision. Verified compatibility rules remain authoritative.

### Production assets

Convert only referenced models to GLB during an asset build. Preserve the source
path and content hash in generated metadata. Validate and compress GLB output,
then lazy-load it at runtime.

## URL and persistence

The selected configuration should have a deterministic serialized form suitable
for a URL or downloadable JSON file. Avoid database IDs in the first release.

A later URL may resemble:

```text
?motor=57aim30-pigtail-rs485&mount=middle-pivot&toy=suction-plate-135
```

The actual encoding should be versioned so future catalog changes do not
silently reinterpret old links.

## Deployment

Vite builds a static `dist/`. GitHub Actions validates the catalog, runs tests,
builds the application, uploads the Pages artifact, and deploys only from the
chosen release branch.

The Vite base path must support both:

- `https://owalabuy.github.io/ossm-configurator/`;
- a future custom domain at `/`.

Local use remains `npm run dev` after dependencies and referenced source assets
are available.

