# OSSM Configurator

A data-driven Web configurator for selecting, previewing, pricing, and building
compatible OSSM configurations.

The intended experience resembles a character-customization screen: builders
select an option for each assembly area, see the result in 3D, understand why
combinations are compatible or incompatible, and export a configuration-specific
bill of materials.

## Status

Planning and handoff are complete. Application scaffolding is the next task.

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

Commands will be documented here after the application scaffold exists. Do not
document commands before they work.

## Project ownership and license

The repository owner is `OWALabuy`. A software license has not yet been chosen;
do not copy third-party application code into the repository until licensing is
decided. Hardware source files remain governed by their source repository's
license.

