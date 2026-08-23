# OSSM Configurator

A data-driven Web configurator for selecting, previewing, pricing, and building
compatible OSSM configurations.

The intended experience resembles a character-customization screen: builders
select an option for each assembly area, see the result in 3D, understand why
combinations are compatible or incompatible, and export a configuration-specific
bill of materials.

## Status

The first catalog-driven vertical slice is implemented. It includes validated
YAML catalog data, pinned STL preparation, compatibility explanations, a
single-part 3D viewer, provenance-preserving BOM export, and a GitHub Pages
workflow.

The first prototype will focus on:

- a catalog-generated selection panel;
- a reusable STL part viewer;
- one real motor/mount incompatibility rule;
- BOM aggregation with provenance;
- a static build deployable to GitHub Pages.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for acceptance
criteria.

## Repository relationship

This is intentionally separate from
[KinkyMakers/OSSM-hardware](https://github.com/KinkyMakers/OSSM-hardware).

- `OSSM-hardware` owns physical designs, firmware, and eventually canonical
  machine-readable part metadata.
- This repository owns the Web UI, configurator engine, asset preparation, and
  deployment.
- Until upstream accepts machine-readable metadata, this repository carries a
  small, explicit catalog overlay backed by field evidence.

Builds must use a pinned hardware revision. See
[`sources/ossm-hardware.lock.json`](sources/ossm-hardware.lock.json).

## Documentation

- [Recorded decisions](docs/DECISIONS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Verified hardware findings](docs/HARDWARE_FINDINGS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Catalog contract draft](catalog/README.md)

## Deployment goal

The application will be a static Vite build:

- hosted initially from this repository with GitHub Pages;
- runnable locally without an application server;
- portable to any static host or a future official OSSM domain;
- free of accounts, telemetry, and remote persistence in the first release.

## Local development

Requirements: Node.js 22 or newer, npm, and Git.

```sh
npm install
npm run dev
```

The development command validates and compiles the catalog, then prepares only
its referenced hardware models. Set `OSSM_HARDWARE_PATH` to an OSSM-hardware
Git checkout when it is not available at `../ossm-hardware`. The locked commit
must exist in that repository; otherwise the preparation script fetches only
the exact revision into `sources/.cache/`.

Useful independent checks:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

Generated catalog artifacts, copied models, and `dist/` are intentionally not
committed.

## GitHub Pages

The workflow validates pull requests and deploys only `main`. In a fork, open
**Settings → Pages** and choose **GitHub Actions** as the publishing source. The
workflow derives the Vite base path from the fork's repository name, so renamed
forks continue to serve assets below their own Pages path.

For a custom domain, build with `VITE_BASE_PATH=/`.

## Project ownership and license

The repository owner is `OWALabuy`. Original configurator software and
documentation are available under the [MIT License](LICENSE). Hardware source
files and generated derivatives remain governed by their source repository's
CERN-OHL-S-2.0 license and retain source provenance.
