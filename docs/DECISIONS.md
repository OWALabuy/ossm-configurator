# Recorded Decisions

## D-001: Use a separate configurator repository

**Decision:** Keep the Web application separate from `OSSM-hardware`.

**Why:** The hardware repository has firmware release gates, hardware
validation, large CAD assets, and a different maintenance cadence. Frontend
dependencies and deployments should not participate in every firmware release.

**Boundary:** Hardware facts and canonical catalog metadata should eventually
live beside the hardware. The UI and generic configuration engine remain here.

## D-002: Build a static application first

**Decision:** The first release has no backend, database, login, analytics, or
remote configuration storage.

**Why:** Selection, compatibility, BOM generation, and 3D rendering can all run
in the browser. A static build is easy to clone, audit, self-host, and deploy.

## D-003: Deploy independently before requesting official hosting

**Decision:** Publish the initial demo from `OWALabuy/ossm-configurator` using
GitHub Pages.

**Why:** A working demo is more useful to maintainers than a hosting proposal.
Official adoption can later take the form of a documentation link, a custom
domain, or transfer into an organization.

## D-004: Make catalog data the domain source of truth

**Decision:** React components must not contain fixed OSSM slot or option lists.

**Why:** The project exists specifically because OSSM variants cannot be safely
represented by one hardcoded BOM. Contributors should be able to add an option
by adding validated data and assets.

## D-005: Use capabilities for compatibility

**Decision:** Options expose capabilities and declare requirements/conflicts.

**Why:** Pairwise compatibility tables grow quadratically and make new options
expensive to add. Capability rules also produce better explanations.

Example:

- a pigtail motor provides `motor.interface:pigtail-db9`;
- a one-piece ring requires `motor.rear:ring-passable`;
- the resolver explains which missing capability blocks the selection.

## D-006: Separate part identity from price offers

**Decision:** BOM parts have stable IDs. Prices are time- and region-specific
offers attached to those IDs.

**Why:** A screw specification is stable; a Taobao listing and its price are
not. A stale offer must not redefine the physical part.

## D-007: Prototype with STL, produce with GLB

**Decision:** The first viewer may use repository STL files. The production
asset pipeline should emit optimized GLB.

**Why:** STL makes a same-night proof of concept possible. GLB is more suitable
for Web delivery, scene hierarchy, material data, and compression.

## D-008: Keep the hardware revision explicit

**Decision:** Catalog builds and exported configurations include the source
hardware commit SHA.

**Why:** Printed files and documentation have changed without a coherent public
version boundary. A BOM without its source revision is not reproducible.

