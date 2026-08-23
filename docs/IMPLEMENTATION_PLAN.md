# Implementation Plan

## Milestone 0: first same-night prototype

The goal is a small but real vertical slice, not a static mockup.

**Status:** Implemented on 2026-08-24. The checks below remain the regression
contract for subsequent catalog and UI changes.

### Task 1: application scaffold

- Create a Vite React TypeScript application.
- Enable strict TypeScript.
- Add formatting, linting, and Vitest.
- Configure repository-relative assets for GitHub Pages.
- Replace the default starter screen with a three-column configurator shell.

Acceptance:

- development server starts with one documented command;
- production build succeeds;
- tests run independently of the browser;
- no OSSM option IDs are embedded in layout components.

### Task 2: seed catalog and validation

- Add the first JSON Schema for slots, options, parts, and evidence.
- Parse YAML and validate it before application startup/build.
- Seed only enough data for a vertical slice:
  - motor interface slot;
  - motor mount slot;
  - controller slot;
  - toy interface slot;
  - pigtail 57AIM30;
  - PitClamp Mini 57AIM V1.1;
  - Middle Pivot;
  - DIY ESP32 controller;
  - 135 mm suction plate.
- Record the source hardware commit on every seed asset.

Acceptance:

- adding a new slot YAML automatically creates a UI section;
- malformed YAML fails with a useful path and message;
- duplicate and missing IDs are rejected;
- the UI does not import seed YAML files individually.

### Task 3: source-asset preparation

- Read `sources/ossm-hardware.lock.json`.
- Support `OSSM_HARDWARE_PATH` and sibling `../ossm-hardware`.
- Copy only catalog-referenced prototype STL files into a generated asset
  directory.
- Record source path, source SHA, and content hash in generated metadata.

Acceptance:

- the build never scans model names to infer domain meaning;
- a missing referenced STL fails with its catalog option ID;
- generated assets are not edited or committed by hand;
- the selected asset can be served below the Pages repository base path.

### Task 4: reusable single-part viewer

- Load the currently selected STL.
- Apply a neutral material and useful lighting.
- Center the model and fit the camera from its bounds.
- Add orbit/zoom controls and reset view.
- Show progress, empty, and load-error states.
- Dispose replaced geometry/material resources.

Acceptance:

- PitClamp ring, Middle Pivot, and 135 mm suction plate can each be selected and
  inspected;
- switching repeatedly does not leave old meshes in the scene;
- the viewer contains no option-specific branches.

### Task 5: compatibility vertical slice

- Resolve selected-option capabilities.
- Keep incompatible options visible.
- Disable PitClamp when the pigtail motor is selected.
- Explain that its captive tail cannot pass through the one-piece motor ring.
- Present Middle Pivot as the builder-used compatible route.

Acceptance:

- the rule comes entirely from catalog data;
- the resolver has unit tests;
- the UI reports the structured reason and evidence state;
- changing the motor interface recomputes availability.

### Task 6: BOM vertical slice

- Collect BOM contributions from selected options.
- Merge stable part IDs and sum quantities.
- Preserve contributing option IDs.
- Show unknown prices as incomplete, not zero-cost.
- Export JSON including catalog version and hardware source SHA.

Acceptance:

- BOM tests cover aggregation and provenance;
- unselecting an option removes only its contribution;
- every displayed line can identify why it was included;
- no global hardcoded OSSM BOM exists in TypeScript.

### Task 7: initial Pages workflow

- Validate catalog, test, and build in GitHub Actions.
- Upload the static artifact with the official Pages actions.
- Deploy only from `main`; build pull requests without deploying.
- Document how a fork enables Pages.

Acceptance:

- built asset URLs work at `/ossm-configurator/`;
- local production preview matches Pages routing;
- deployment contains only the app and referenced generated models.

## Explicitly deferred

- full assembled-machine transforms;
- STEP-to-GLB conversion pipeline;
- animated travel and exploded views;
- automatic mesh collision as a compatibility authority;
- live marketplace scraping;
- accounts, cloud saves, telemetry, or a backend;
- an official R+D/KinkyMakers domain;
- finalized electrical wiring for the pigtail motor;
- diagnosis of the current RS485 failure.

## Milestone 1: assembled preview

After the vertical slice:

1. define attachment-interface and transform schemas;
2. build one complete official/reference scene;
3. build the audited pigtail/Middle Pivot/DIY scene;
4. add exploded view and selection highlighting;
5. add simplified missing commercial parts such as motor, rail, extrusion, and
   cables where licensing permits;
6. convert referenced assets to validated, compressed GLB.

## Milestone 2: procurement experience

- offers by vendor, region, currency, quantity, and timestamp;
- user-local price overrides;
- live total and per-option delta;
- CSV and print-friendly exports;
- supplier-neutral specifications alongside optional purchase links;
- configuration comparison and shareable versioned URLs.

## Upstream path

Once the prototype proves the schema:

1. open focused OSSM-hardware issues for confirmed source/document gaps;
2. propose machine-readable catalog metadata beside hardware assets;
3. keep the generic app and resolver in this repository;
4. publish a versioned normalized catalog artifact;
5. request an official documentation link or domain only after a stable demo
   exists.
