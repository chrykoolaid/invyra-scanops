# Phase 3A Configuration Proposal

Status: proposal only  
Component: ScanOps

## Purpose

This document proposes exact files for a later ScanOps configuration step.

This proposal does not implement those files.

## Proposed future files

```text
src/inventory-bridge/config/bridgeConfigurationDefaults.js
src/inventory-bridge/config/bridgeConfigurationSchema.js
src/inventory-bridge/config/bridgeConfigurationStatus.js
scripts/validate-inventory-bridge-disabled-configuration.mjs
```

## Required future behavior

A later implementation must prove defaults remain off, missing configuration remains disabled, no background process starts, no network path starts, no Inventory write occurs, no local write occurs, no outbox processing occurs, and validation remains static or fixture-only.

## Proposed defaults

```text
bridge_enabled=false
transport_enabled=false
outbox_processing_enabled=false
replay_enabled=false
accepted_schema_versions=[]
accepted_event_types=[]
allowed_store_ids=[]
local_device_id=null
target_inventory_instance_id=null
```

## Acceptance result

This proposal passes only if the PR is documentation-only.
