---
id: rich_markdown
language: en
type: rich
---
# Advanced Rocketry Concepts

This note contains **critical** and *time-sensitive* information regarding the new propulsion systems.

> "To confine our attention to terrestrial matters would be to limit the human spirit." - Stephen Hawking

## Propulsion Comparison

| Engine Type | Specific Impulse (s) | Thrust-to-Weight Ratio | Fuel Type |
| :--- | :--- | :--- | :--- |
| **Solid Rocket Motor** | 250 - 300 | High | APCP |
| **Liquid (Kerolox)** | 300 - 350 | Very High | RP-1 / LOX |
| **Liquid (Hydrolox)**| 380 - 450 | Medium | LH2 / LOX |
| **Ion Thruster** | 3000+ | Very Low | Xenon |

### Action Items for Team Alpha

1.  Review the latest CAD models for the combustion chamber.
2.  Update the fluid dynamics simulations.
    *   Ensure turbulence models are active.
    *   Check for cavitation risks in the turbopump.
3.  Draft the preliminary safety report.

We must ensure that the `chamber_pressure` variable does not exceed `15 MPa` during the initial test fire. Failure to do so could result in a RUD (Rapid Unscheduled Disassembly).
