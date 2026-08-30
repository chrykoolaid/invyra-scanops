# SO-1 — ScanOps Onboarding & Dynamic Home Foundation

Status: FOUNDATION ONLY / RUNTIME DISABLED

## Purpose

Prepare ScanOps for future industry-, location-, and role-aware onboarding and Home configuration without changing the current production operator experience.

## Locked architecture

Inventory Desktop remains the system of record and configuration authority.

Inventory owns:
- company industry and sub-industry
- location definitions and capabilities
- employee/role permission policy
- authoritative inventory truth and stock mutation

ScanOps remains the operational execution layer.

The governed Bridge is the synchronization boundary between Inventory and ScanOps.

ScanOps must not independently change company industry, inventory truth, stock, ledger, pricing, approvals, Item Master, POS, or orders.

## Approved onboarding sequence

1. Organisation
2. Device
3. Location
4. Operational Profile
5. Employee Access
6. Ready

This flow may be built behind a development-only surface later, but it must not become a required production first-run experience while ScanOps is unfinished.

## Runtime gates

Both gates are hard-disabled for SO-1:

- `scanops_onboarding_enabled = false`
- `scanops_dynamic_home_enabled = false`

The dormant foundation must not be imported by the current Home page during SO-1.

## Fixed Home contract

The current 3x3 operational grid is preserved to protect scanner muscle memory.

Canonical fallback positions:

1. Receive
2. Count
3. Transfers
4. Waste
5. Markdown
6. Expiry
7. Order
8. Movements
9. Tools

The primary `Scan or Lookup Item` hero action remains separate from the 3x3 grid.

## Future resolver rule

When activation is eventually approved:

`Visible Home Tiles = Industry Profile ∩ Location Capabilities ∩ Employee Permissions`

The resolver must preserve stable positions wherever practical. Industry-specific terminology may change, but capability identity must remain canonical.

## Fail-safe rule

If any of the following applies, ScanOps must fall back to the existing canonical Home layout:

- onboarding gate is disabled
- dynamic Home gate is disabled
- operational profile is missing
- operational profile is malformed
- profile version is unsupported
- location capability data is missing or invalid
- employee permission data is missing or invalid
- Bridge/configuration source is unavailable

No partial or speculative profile may hide operational workflows.

## Industry profile foundation

SO-1 defines profile identifiers only. Runtime activation is deferred.

- services
- retail
- hospitality_food_beverage
- hospitality_accommodation
- healthcare
- wholesale_distribution

Warehouse Operations is a cross-sector location capability, not a standalone company industry.

## Warehouse capability

Future Inventory onboarding/settings may enable warehouse capability per location. A warehouse-enabled location may later expose capabilities such as:

- receiving
- put-away
- replenishment
- picking
- packing
- dispatch
- transfers
- returns
- cycle count
- exceptions

Inventory remains the authoritative stock record; warehouse workflows control physical execution only.

## SO-1 non-goals

SO-1 must not:
- modify `src/pages/Home.jsx`
- alter the visible 3x3 grid
- activate first-run onboarding
- activate industry-specific tile resolution
- activate warehouse workflows
- change current role filtering
- create Inventory writes
- activate new Bridge transport behavior
- create queue writes or background replay
- mutate stock, ledger, pricing, approvals, Item Master, POS, or orders

## Activation gate for a later phase

Runtime activation requires an explicit later approval after:

- ScanOps core workflows are stable
- operational profile contract is certified cross-repository
- Inventory exposes authoritative company/location capability configuration
- employee identity and permission mapping is ready
- migration behavior for existing registered devices is defined
- offline/failure fallback has been acceptance-tested
- the fixed 3x3 layout remains usable across supported profiles

Until then, the current Home remains the production authority.