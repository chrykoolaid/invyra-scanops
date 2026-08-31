# SO-1 — ScanOps Onboarding & Dynamic Home Foundation

Status: FOUNDATION ONLY / RUNTIME DISABLED

Taxonomy authority: Invyra Industry Coverage & Rollout Order v1.3 — LOCKED 11-INDUSTRY TAXONOMY.

## Purpose

Prepare ScanOps for future industry-, subgroup-, location-, and role-aware onboarding and Home configuration without changing the current production operator experience.

## Locked architecture

Inventory Desktop remains the system of record and configuration authority.

Inventory owns:
- company primary industry and subgroup
- location definitions and cross-sector capabilities
- employee/role permission policy
- authoritative inventory truth and stock mutation

ScanOps remains the operational execution layer.

The governed Bridge is the synchronization boundary between Inventory and ScanOps.

ScanOps must not independently change company industry, subgroup, inventory truth, stock, ledger, pricing, approvals, Item Master, POS, or orders.

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

The resolver must preserve stable positions wherever practical. Subgroup-specific terminology may change, but capability identity must remain canonical.

## Fail-safe rule

If any of the following applies, ScanOps must fall back to the existing canonical Home layout:

- onboarding gate is disabled
- dynamic Home gate is disabled
- operational profile is missing
- operational profile is malformed
- profile version is unsupported
- subgroup is invalid for the primary industry
- location capability data is missing or invalid
- employee permission data is missing or invalid
- Bridge/configuration source is unavailable

No partial or speculative profile may hide operational workflows.

## Locked 11 primary industries

SO-1 recognizes exactly these first-class onboarding profiles. Runtime activation remains deferred.

1. `services`
2. `retail`
3. `hospitality_food_beverage`
4. `hospitality_accommodation`
5. `healthcare`
6. `wholesale_distribution`
7. `manufacturing`
8. `construction_trades`
9. `automotive`
10. `rental_hire`
11. `agriculture_primary_production`

A business selects one primary industry profile. A subgroup supplies relevant terminology, defaults, UI and operational presets. Subgroups do not create separate transaction or inventory engines.

## Locked subgroups

### Services
- Laundry & Dry Cleaning
- Repair & Maintenance
- Salon, Beauty & Wellness
- Cleaning Services
- Professional / Business Services
- Other Service & Allied Service Businesses

### Retail
- Convenience Stores
- Sari-sari Stores
- Mini-marts & Groceries
- Supermarkets / Hypermarkets
- Specialty Retail

### Hospitality — Food & Beverage
- Restaurants
- Cafes
- Bars / Pubs
- Quick Service Restaurants (QSR)

### Hospitality — Accommodation
- Hotels
- Resorts
- Motels
- Lodges / Guesthouses / Serviced Accommodation

### Healthcare
- Pharmacies
- Clinics
- Hospitals
- Allied Health

### Wholesale & Distribution
- Wholesalers
- Distributors
- B2B Fulfilment Operations

### Manufacturing
- Food & Beverage Manufacturing
- Light Manufacturing
- Assembly Manufacturing
- Fabrication & Workshop Manufacturing
- Process Manufacturing
- Textile & Apparel Manufacturing
- Pharmaceutical / Regulated Manufacturing
- Construction Materials Manufacturing
- Other / General Manufacturing

### Construction & Trades
- Residential Construction
- Commercial Construction
- Electrical
- Plumbing
- HVAC / Mechanical Services
- General Contractors & Trade Services

### Automotive
- Mechanical Workshops
- Tyre Centres
- Auto Electrical
- Vehicle Service Centres
- Motorcycle Workshops
- Other Automotive Service Operations

### Rental & Hire
- Tool Hire
- Equipment Rental
- Machinery Hire
- Party & Event Hire
- Vehicle Hire
- Other Rental Operations

### Agriculture & Primary Production
- Crop Farming / Growers
- Livestock
- Dairy
- Poultry
- Aquaculture
- Fisheries
- Nurseries / Horticulture
- Other Primary Production

## Cross-sector capabilities — not industries

The following must never be accepted as primary industry profiles:

- Warehouse Operations
- E-commerce Overlay
- Payroll & Staff Rostering
- Reporting & Analytics
- Multi-location
- Integrations

Cross-sector capabilities are enabled only when relevant to the organisation or location. Disabled capabilities remain hidden to reduce cognitive load.

## Warehouse capability

Warehouse Operations is a cross-sector location capability, not a standalone company industry.

Future Inventory onboarding/settings may enable warehouse capability per location. A warehouse-enabled location may later expose capabilities such as:

- receiving
- put-away
- replenishment
- picking
- packing
- dispatch
- transfers
- returns
- scanner workflows
- cycle counts
- exceptions

Inventory remains the authoritative stock record; warehouse workflows control physical execution only.

## Industry readiness gate

No industry profile may be activated in ScanOps merely because its dormant profile exists. Activation requires the wider Invyra industry readiness gate to pass, including:

- scope and terminology approved
- industry-specific UI/workflows reviewed
- inventory behaviour mapped and tested
- onboarding and feature gating implemented
- permissions, audit, offline/failure states validated
- receipts/payments validated where applicable
- documentation completed
- industry readiness checklist fully passed and signed

## SO-1 non-goals

SO-1 must not:
- modify `src/pages/Home.jsx`
- alter the visible 3x3 grid
- activate first-run onboarding
- activate industry-specific tile resolution
- activate subgroup-specific terminology at runtime
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
- Inventory exposes authoritative primary-industry, subgroup and location capability configuration
- employee identity and permission mapping is ready
- migration behavior for existing registered devices is defined
- offline/failure fallback has been acceptance-tested
- the fixed 3x3 layout remains usable across supported profiles
- the target industry has passed the locked industry readiness gate

Until then, the current Home remains the production authority.
