# Hardware Findings Used by the Initial Catalog

> These findings seed the configurator. They are not a complete build guide and
> must retain their evidence states when represented in catalog data.

## Audited physical configuration

| Area | Configuration |
| --- | --- |
| Motor | Third-party Hangzhou Yizhi 57AIM30, 1500 RPM, RS485-labelled captive pigtail/DB9 version |
| Motor mount | Legacy/non-standard Body Middle Pivot after PitClamp Mini proved incompatible |
| Actuator | Current 24 mm Clamping Thread End Effector and Belt Clamp |
| Rail | MGN12H with GT2 belt |
| Stand | 3030 extrusion stand |
| Toy interface | 135 mm Tie Down and Suction Plate for suction-cup toys |
| Controller | ESP32 development board and discrete wiring; no OSSM reference PCB |
| Logic power | Separate USB 5 V supply considered instead of mandatory 24 V-to-5 V conversion |

## Evidence vocabulary

- **Builder verified**: observed with physical parts.
- **Repository verified**: confirmed from model, schematic, or source.
- **Expected**: supported by evidence but not yet fitted on this build.
- **Unresolved**: not isolated; must not become instructions.
- **Known incorrect**: a prior instruction contradicted by physical or source
  evidence.

## Pigtail motor versus PitClamp Mini

**Builder verified:** the captive tail on the pigtail/DB9 57AIM30 prevents the
motor from being inserted through the PitClamp Mini 57AIM V1.1 ring.

**Repository verified:**

`Printed Parts/Mounting/OSSM - Mounting Ring - PitClamp Mini - 57AIM V1.1.stl`
is one connected, non-splitting solid, approximately 80 x 80 x 34.55 mm.

Initial catalog consequence:

- pigtail/DB9 motor provides `motor.interface:pigtail-db9`;
- current one-piece ring conflicts with that capability;
- the UI explains that the captive cable cannot pass through the ring;
- the Middle Pivot is presented as the builder-used workaround, not silently
  added alongside the PitClamp.

The workaround file is:

`Printed Parts/Actuator/Non-standard/OSSM - Actuator - Body - Middle Pivot.stl`

## Controller enclosure

**Builder verified:** these prints are unused without the OSSM reference PCB:

- `Printed Parts/Mounting/OSSM - PCB - Box.stl`
- `Printed Parts/Mounting/OSSM - PCB - Lid.stl`

The controller choice must precede their inclusion in a print list.

## Toy mount and five-sided nut

The selected toy interface is:

`Printed Parts/Toy Mounting/Non-standard/OSSM - Toy Mounting - Tie Down And Suction Plate 135mm.stl`

**Builder verified:** one `OSSM - 24mm Nut - 5 Sided` is sufficient for this
builder's assembled Clamping Thread End Effector and 135 mm suction-plate
combination. Historical global quantities must not override the selected
toy-interface requirement.

## M3 fasteners

**Repository verified:** the current root actuator BOM includes two M3x16
socket-cap bolts. The builder's consolidated purchase list omitted M3x16 while
buying excess M3x8 and M3x20 hardware.

**Expected, final fit pending:** the audited MGN12H block has threaded M3 holes,
and the current model indicates two M3x16 bolts without separate nuts. Final
engagement and bottoming have not yet been physically recorded as complete.

The configurator must associate fasteners with exact part generations and
joints, rather than presenting only a global quantity.

## PitClamp hardware

The PitClamp has latching, hinge, extrusion, and motor-ring fasteners. Those
parts must only enter the BOM after both the PitClamp and a compatible motor
geometry are selected.

The audited PitClamp prints were not used in the final configuration. Do not
claim a universal print defect: the physical motor-tail incompatibility and any
print-quality problem are separate observations.

## Limit switch and stock homing

**Repository verified:** stock firmware defines GPIO12 as `limitSwitchPin`, but
current homing does not read it. Homing samples the reference PCB current-sense
input on GPIO36 and detects current rise at the mechanical travel ends. GPIO12
currently appears in diagnostic telemetry.

Relevant source paths:

- `Software/src/constants/Pins.h`
- `Software/src/ossm/homing/homing.cpp`
- `Software/src/services/communication/rad_ble.cpp`

Catalog consequence: a bare ESP32 without equivalent current sensing does not
satisfy stock sensorless-homing requirements. Selecting a GPIO12 switch alone
must not clear that warning.

## Status LED

**Repository verified:** firmware drives one WS2812B on GPIO25. It does not
probe for physical LED presence and does not fail initialization merely because
no LED is connected.

The LED is a useful status option, but its mount and wiring depend on the
selected controller enclosure. It is not a motion or homing sensor.

## DIY power and interface

A DIY ESP32 may use a separate USB 5 V supply instead of a 24 V-to-5 V buck
converter. This is a configuration choice, not a complete wiring design.

The reference PCB additionally provides power protection, bulk capacitance,
regulation, PUL/DIR/ENA transistor interfaces, and GPIO36 motor-current sensing.
Removing it therefore changes more than the enclosure and logic supply.

The generic motor manual describes 3.3-5 V optocoupled inputs, while the
reference board uses 5 V common-anode wiring and transistor drivers. Direct
drive of this exact pigtail motor remains unresolved and must not be emitted as
a wiring instruction.

## RS485 communication issue

The audited pigtail/DB9 motor currently does not respond to attempted RS485
communication.

Status: **unresolved; manufacturer investigation in progress**.

Possible causes have not been isolated. They include variant/pinout mismatch,
isolated-interface power requirements, bus settings/address, adapter/wiring, or
a failed RS485 interface. Hardware failure is a builder suspicion, not a
finding.

Do not encode a programming wiring diagram until the manufacturer confirms the
ordering code, DB9 pinout, interface-power requirements, bus settings, and a
known-good request/response.

## Initial procurement lessons

The mixed flat BOM caused or contributed to:

- unused PCB Box and Lid prints;
- an unusable PitClamp choice for the pigtail motor;
- a later Middle Pivot reprint;
- omitted M3x16 bolts;
- excess fasteners without a part-to-joint mapping;
- a limit switch with no selected mount or stock homing role;
- an LED with no enclosure placement;
- a buck converter chosen before the logic-power architecture;
- interface parts selected from documentation for another motor connector.

The configurator should generate a base BOM plus selected actuator, motor-mount,
controller, toy-interface, and stand deltas. It must not reproduce another
global fastener total before the configuration is frozen.

