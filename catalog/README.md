# Catalog Contract

The catalog is domain data consumed by a generic configurator. YAML is the
authoring format. `catalog/schema/catalog.schema.json` is the canonical shape
contract; the compiler also validates cross-references, unique IDs, dependency
cycles, required-slot reachability, quantities, evidence, and asset provenance.

Each record lives in its own YAML file below `capabilities/`, `slots/`,
`options/`, `parts/`, `offers/`, or `assets/`. `npm run catalog:build` reads the
directories rather than an import list and emits the single normalized browser
artifact at `src/catalog/generated/catalog.json`. Generated files must not be
edited by hand.

## Entities

### Slot

A selectable assembly area. Slots may form a UI hierarchy and may become
relevant only after another option is selected.

```yaml
id: motor_mount
label: Motor mount
description: Connects the selected motor to the base or stand.
cardinality: one
order: 30
```

The UI discovers this record. It must not contain a matching hardcoded
`motor_mount` section.

### Option

```yaml
id: mount.pitclamp-mini-57aim-v1
slot: motor_mount
label: PitClamp Mini - 57AIM V1.1
status: supported

provides:
  - mount.family:pitclamp-mini

requires:
  - motor.frame:nema23-57
  - motor.rear:ring-passable

conflicts:
  - capability: motor.interface:pigtail-db9
    explanation: The captive motor tail and DB9 connector cannot pass through the PitClamp Mini's one-piece motor ring.
    evidence:
      state: builder_verified
      notes: The builder physically attempted this combination.
      sources:
        - kind: project_document
          path: docs/HARDWARE_FINDINGS.md

assets:
  - model.pitclamp-mini-57aim-v1

bom:
  - part: printed.mount.pitclamp-mini-57aim-v1
    quantity: 1
    reason: Selected motor-mount ring.

evidence:
  state: repository_verified
  notes: The current STL is a single connected solid.
  sources:
    - kind: repository
      path: Printed Parts/Mounting/OSSM - Mounting Ring - PitClamp Mini - 57AIM V1.1.stl
      commit: fb6f6d616b67528b41445f1dabdab6e6a4a605a8

warnings: []
```

Simple rules may remain capability strings. A rule object carries the precise,
catalog-authored explanation and evidence that the resolver should show.

### Asset

Options reference stable asset IDs. Assets separately preserve exact source
provenance:

```yaml
id: model.pitclamp-mini-57aim-v1
role: preview
format: stl
source:
  repository: ossm-hardware
  path: Printed Parts/Mounting/OSSM - Mounting Ring - PitClamp Mini - 57AIM V1.1.stl
  commit: fb6f6d616b67528b41445f1dabdab6e6a4a605a8
```

`npm run models:prepare` resolves `OSSM_HARDWARE_PATH`, then the sibling
checkout, then an exact-SHA cache. It reads `commit:path` from the Git object
database without switching the hardware checkout. Only referenced models are
copied. The generated manifest records the source SHA, path, content hash, and
base-path-relative URL.

### Part

```yaml
id: printed.mount.pitclamp-mini-57aim-v1
label: Printed PitClamp Mini 57AIM V1.1 ring
kind: printed_part
specification:
  source_format: STL
  connected_solid: true
default_unit: each
evidence:
  state: repository_verified
  notes: Stable printed-part identity at the locked revision; fasteners are not inferred.
  sources:
    - kind: repository
      path: Printed Parts/Mounting/OSSM - Mounting Ring - PitClamp Mini - 57AIM V1.1.stl
      commit: fb6f6d616b67528b41445f1dabdab6e6a4a605a8
```

A stable part is not a store listing.

### Offer

```yaml
id: offer.example.m5x35.cn
part: fastener.m5x35.socket-cap
vendor: Example vendor
region: CN
currency: CNY
package_quantity: 10
package_price: 8.00
updated_at: 2026-08-23
url: https://example.invalid/product
```

Offers are optional. Missing offers produce an incomplete price estimate, not a
zero price.

## Capability conventions

Capabilities should describe physical or functional properties, not UI choices.
Names should be namespaced:

```text
motor.frame:nema23-57
motor.interface:pigtail-db9
motor.rear:ring-passable
mount.family:middle-pivot
controller.family:bare-esp32
toy.interface:24mm-thread
```

Use `requires` when an option cannot function without a capability. Use
`conflicts` when the presence of a capability creates a known incompatibility.

Do not invent a positive capability merely to avoid expressing an unresolved
fact. Unresolved configurations should carry an evidence/warning state.

## Evidence

States:

```text
builder_verified
repository_verified
expected
unresolved
deprecated
known_incorrect
```

Evidence records should support notes and source references. Safety-relevant
warnings remain visible in exports.

## BOM provenance

Each BOM contribution belongs to an option. After aggregation, the normalized
line retains all contributors:

```json
{
  "partId": "printed.mount.pitclamp-mini-57aim-v1",
  "quantity": 1,
  "unit": "each",
  "contributors": ["mount.pitclamp-mini-57aim-v1"]
}
```

This prevents another opaque global BOM and lets the interface explain why a
purchase is required.

## 3D attachment metadata

This can be deferred until the single-part viewer works. Proposed concepts:

```yaml
scene:
  units: mm
  correction:
    position: [0, 0, 0]
    rotation_deg: [0, 0, 0]
  attachments:
    - id: motor_face
      interface: motor.face:nema23-57
      position: [0, 0, 0]
      rotation_deg: [0, 0, 0]
```

Named interfaces are preferable to scattering unexplained 4x4 matrices through
frontend code. The scene compiler may resolve them to matrices.
