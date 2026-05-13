# Invyra ScanOps Stage AS.1 — Home Navigation Escape Fix v1

This is an RC hotfix created after Stage AT review found a pilot-blocking navigation issue: workflow pages did not provide a reliable explicit return path to the Home launcher.

## Purpose

Restore a simple, always-understandable operator escape path without adding new workflows, dashboards, filters, setup wizards, backend contracts, or feature scope.

## Changes

- Added an explicit Home icon action to the shared workflow header.
- Added the same explicit Home icon action to the shared page header used by admin/review pages.
- Changed shared back behavior to fall back to Home when browser history is not available.
- Made the shared workflow and page headers sticky so the Back/Home controls remain available while scrolling long handheld pages.

## Non-changes

- No workflow tiles added.
- No operational screens added.
- No filter-heavy UI added.
- No dashboard/setup/backend/printer/sync redesign added.
- No role or permission model redesign.

## Pilot release impact

Stage AT should not be considered cleanly locked until this RC hotfix is validated and a fresh Pilot Release Lock pass is run.
