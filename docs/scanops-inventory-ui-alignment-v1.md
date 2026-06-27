# ScanOps Inventory UI Alignment v1

## Purpose

ScanOps must align with the Invyra Inventory Desktop project while staying simple enough for handheld shop-floor work.

Inventory Desktop is the system of record and management interface. ScanOps is the operational scanner interface.

## Core rule

```text
Inventory Desktop = manage inventory.
ScanOps = do the work right now.
```

ScanOps must not become a miniature desktop application.

## Five-second rule

Every ScanOps screen must answer these questions in under five seconds:

1. What is this?
2. Where is it?
3. What should I do next?

If a staff member has to guess, the screen needs to be simplified.

## Global UI rules

- One primary action per screen.
- Large touch targets.
- Plain language over technical language.
- Read-only by default.
- Stock-changing actions only happen inside controlled workflows.
- No hidden critical actions.
- No dense tables on handheld screens.
- No horizontal scrolling for primary workflows.
- Advanced filters belong behind a Filter button or bottom sheet.
- Inventory Desktop owns complexity, configuration, analytics, and authority.

## Navigation lock

Bottom navigation remains:

```text
Home | Scan | Alerts | More
```

Home contains operational workflows.
More contains management, reporting, sync, settings, and diagnostics.

## Home operational workflows

The Home screen should keep these 12 tiles:

1. Product Lookup
2. Receiving
3. Stock Count
4. Gap Scan
5. Replenish
6. Tasks
7. Movements
8. Markdowns
9. Waste
10. Expiry Check
11. Shelf Tickets
12. Transfers

## More workflows

The More screen should contain:

- Sync & Handoff
- Store Exceptions
- Reporting
- Scanner Settings

Future additions may include Help, About, Diagnostics, and Admin-only tools.

## Inventory alignment map

| ScanOps workflow | Inventory Desktop alignment | ScanOps role |
| --- | --- | --- |
| Product Lookup | Item Details | Show item identity and key operational facts |
| Movements | Stock Movement ledger | Explain what happened to stock, read-only |
| Receiving | Receiving / Delivery Portal | Capture receiving evidence and controlled receipt work |
| Stock Count | Stocktake | Capture counts and variance evidence |
| Gap Scan | Gap Scan / floor evidence | Capture shelf gaps without becoming stocktake |
| Replenish | Replenishment | Move work from backroom to shelf where controlled |
| Waste | Wastage intake | Capture waste evidence through controlled workflow |
| Markdowns | Markdown batches and rounds | Capture markdown operational steps |
| Transfers | Transfers | Support controlled transfer work |
| Shelf Tickets | Pricing / labels | Support label work without owning price authority |
| Tasks | Operational task queue | Show assigned store work |
| Alerts | Operational exception queue | Surface urgent issues |

## Screen pattern

Every workflow should use this structure:

```text
Header
Scan / Search
Operational summary
Primary action
Bottom navigation
```

Secondary information should be hidden behind tabs, expandable cards, or details sections.

## Language standard

Use direct language:

- Use `Stock Updated`, not `Inventory transaction posted`.
- Use `Difference Recorded`, not `Variance recorded`, unless variance is required by the Inventory workflow.
- Use `Check Location`, not `Location intelligence`.
- Use `Report Issue`, not `Exception escalation`.

## Read-only default

The following handheld screens are read-only by default:

- Product Lookup
- Movements
- Location information
- Sales summary
- Alerts review
- Reporting summaries

The following may perform controlled writes only inside their workflow rules:

- Receiving
- Stock Count
- Waste
- Markdowns
- Transfers
- Shelf Tickets where label-print records are needed

## Neurodiverse-first standards

ScanOps must reduce cognitive load by using:

- Clear visual hierarchy.
- Repeated layout patterns.
- Large cards.
- Large buttons.
- Minimal competing controls.
- Predictable action placement.
- Plain labels.
- Confirmation screens before controlled changes.

## Design lock

ScanOps should feel like the handheld execution layer of Invyra Inventory, not a separate app and not a small version of the desktop.
