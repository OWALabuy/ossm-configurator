# Catalog Contract Draft

The catalog is domain data consumed by a generic configurator. YAML is intended
for authors; a build step validates and normalizes it to JSON.

This document is a design draft. The first implementation should turn the
stable parts into JSON Schema and tests rather than treating the examples as an
informal parser contract.

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
  - motor.interface:pigtail-db9

assets:
  - role: preview
    source:
      repository: ossm-hardware
      path: Printed Parts/Mounting/OSSM - Mounting Ring - PitClamp Mini - 57AIM V1.1.stl
      commit: fb6f6d616b67528b41445f1dabdab6e6a4a605a8

bom:
  - part: fastener.m5x35.socket-cap
    quantity: 4
    reason: Secures the 57AIM ring.

evidence:
  state: repository_verified
  notes: The current STL is a single connected solid.
```

### Part

```yaml
id: fastener.m5x35.socket-cap
label: M5 x 35 mm socket-cap screw
kind: fastener
specification:
  thread: M5
  length_mm: 35
  head: socket_cap
default_unit: each
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
motor.protocol:rs485-modbus
motor.rear:ring-passable
controller.homing:current-sense
firmware.homing:sensorless-current
toy.interface:24mm-thread
```

Use `requires` when an option cannot function without a capability. Use
`conflicts` when the presence of a capability creates a known incompatibility.

Do not invent a positive capability merely to avoid expressing an unresolved
fact. Unresolved configurations should carry an evidence/warning state.

## Evidence

Proposed states:

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
  "part": "fastener.m5x35.socket-cap",
  "quantity": 4,
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

