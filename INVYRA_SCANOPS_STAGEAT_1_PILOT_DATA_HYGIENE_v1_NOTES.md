# Invyra ScanOps Stage AT.1 — Pilot Data Hygiene / Seed Governance v1

Baseline used: `stereotyped-shelf-snap-scan.zip` / Stage AT pilot release lock source.

## Purpose

Remove fake operational seed records before Pilot Run 0 while keeping the small stock item catalogue needed for handheld scan/search testing.

## What changed

- Kept the stock item catalogue as controlled pilot test master data.
- Renamed the inventory snapshot metadata from demo language to pilot test catalogue language.
- Removed the auto-populated fake task queue.
- Changed task reset behavior so it clears the local task queue instead of restoring fake task fixtures.
- Removed fake multi-device collaboration participants, fake collaboration tasks, and fake collaboration event history from the default collaboration state.
- Changed inventory sync push behavior so it no longer reports fake accepted/synced success from a demo adapter. Events remain local until a real desktop inventory connection exists.
- Cleaned visible pilot/admin copy that referred to demo fixtures where it could confuse pilot validation.

## Kept intentionally

- Product/stock test catalogue items for scan/search, stock count, receiving, replenishment, markdown, waste, expiry, and gap-scan validation.
- Role preview/session scaffolding needed for local pilot testing.
- Existing workflow routes and locked AS.8.1 / Stage AT navigation behavior.

## Hard rules preserved

- No new workflow tiles.
- No filters added.
- No dashboard/setup/backend rebuild.
- No route-host or AppEscapeHeader rewrite.
- No removal of real workflow action buttons.
- No fake operational history shown by default.

## Pilot expectation after this pass

- Product Lookup can still find the pilot test catalogue items.
- Tasks starts empty until workflow evidence creates a task.
- Collaboration starts with only the current device and no fake remote work.
- Sync attempts remain honest: local/pending unless a real desktop integration is connected.

## Validation placeholders

- `npm run lint`: passed.
- `npm run build`: passed.
