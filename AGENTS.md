# AGENTS.md

## Project purpose

Build a repository-driven OSSM configurator with the interaction model of a
character-customization screen:

- the UI discovers assembly areas and options from catalog data;
- changing an option updates compatibility, price, BOM, and the 3D scene;
- unavailable combinations remain visible and explain why they are invalid;
- every BOM row is traceable to the option that added it;
- configurations can be exported with the hardware repository commit that was
  used to generate them.

The project must not encode OSSM-specific slot names or option lists directly
inside React components. OSSM knowledge belongs in validated catalog data.

## Read before implementation

Read these files in order:

1. `README.md`
2. `docs/DECISIONS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/HARDWARE_FINDINGS.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `catalog/README.md`

The sibling hardware checkout is normally available at:

`/home/owalabuy/awa/ossm-hardware`

The personal field-notes checkout is normally available at:

`/home/owalabuy/awa/love-with-claude`

Do not modify either sibling repository unless the task explicitly includes
that repository.

## Current milestone

The immediate milestone is the first locally usable and GitHub Pages-ready
prototype. Its acceptance criteria are in `docs/IMPLEMENTATION_PLAN.md`.

Prioritize, in order:

1. a working application shell;
2. a catalog-driven option panel;
3. a reusable single-part 3D viewer;
4. compatibility explanations;
5. deterministic BOM aggregation;
6. static deployment.

Do not block the first prototype on full-assembly transforms, GLB conversion,
live vendor prices, user accounts, or a backend.

## Chosen technical direction

- Vite, React, and strict TypeScript.
- Three.js through React Three Fiber is preferred for the 3D scene.
- `STLLoader` is acceptable for the first viewer; production assets should be
  converted to optimized GLB later.
- YAML is the authoring format for catalog entries.
- JSON Schema is the canonical structural contract; validate parsed YAML with
  a standards-compatible validator such as Ajv.
- The production site is a static build. Do not introduce a server dependency
  for the first release.
- GitHub Pages is the initial hosted deployment target. All asset URLs and
  routing must work below a repository base path.

## Repository-driven rules

- UI sections come from catalog `slot` records, not a hardcoded array.
- Options come from catalog `option` records, not JSX conditionals.
- Prefer capability-based `provides`, `requires`, and `conflicts` rules over a
  pairwise compatibility matrix.
- Stable part identities and vendor offers are separate concepts. A price must
  include currency, region/vendor context, and an update timestamp.
- Every source asset records its repository path and source commit.
- Generated files must not be edited by hand.
- Missing or invalid catalog data must fail validation with an actionable
  message rather than silently disappearing from the UI.
- Incompatible options should normally be shown disabled with an explanation,
  not hidden.

## Hardware-source integration

The pinned source revision is recorded in
`sources/ossm-hardware.lock.json`.

Local development should support an `OSSM_HARDWARE_PATH` override. The default
developer layout places the hardware repository at `../ossm-hardware`.

A future sync command may fetch the pinned revision when no local checkout is
available. Do not use an unpinned default branch as build input.

Do not publish all raw repository models. The current hardware repository has
hundreds of MiB of STL and STEP assets. Copy or convert only assets referenced
by the validated catalog, and lazy-load models in the browser.

## Safety and evidence

This configurator concerns moving electromechanical hardware. Keep these states
distinct in both data and UI:

- builder verified;
- repository/source verified;
- expected but not physically verified;
- unresolved;
- deprecated or known incorrect.

Do not turn an unresolved electrical observation into a wiring instruction.
In particular, the audited pigtail 57AIM30 RS485 communication failure is still
under manufacturer investigation. A failed RS485 interface is only a
suspicion.

The stock firmware currently uses GPIO36 current sensing for homing. GPIO12 is
not a drop-in homing substitute. A bare ESP32 configuration must visibly warn
that stock sensorless homing requirements are not met unless equivalent
current-sense hardware or validated alternate firmware is selected.

## Quality expectations

- Keep the TypeScript compiler strict.
- Add unit tests for catalog validation, compatibility resolution, and BOM
  aggregation before those engines become complex.
- Keep rendering components independent from OSSM option IDs.
- Test empty, loading, invalid-catalog, incompatible, and missing-model states.
- Make the selection panel keyboard-usable and do not encode status by color
  alone.
- Preserve the selected configuration in a shareable, deterministic format.
- Export the hardware source SHA with generated configurations and BOMs.
- Do not commit credentials, `node_modules`, build output, downloaded hardware
  checkouts, or unreviewed generated model caches.

## Handoff discipline

When a task changes an architectural decision, update `docs/DECISIONS.md` in
the same change. When a new physical incompatibility is learned, update
`docs/HARDWARE_FINDINGS.md` with its evidence state before encoding it in the
catalog.

