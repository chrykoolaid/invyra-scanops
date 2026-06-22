# Phase 3C Validation Notes

Status: documentation only  
Component: ScanOps

## Purpose

This note proposes adding one npm script in a later PR.

## Proposed file

```text
package.json
```

## Proposed script name

```text
validate:inventory-bridge-disabled-configuration
```

## Proposed command

```text
node scripts/validate-inventory-bridge-disabled-configuration.mjs
```

## Boundary

This note does not change package.json. A later PR must only add the script entry.
