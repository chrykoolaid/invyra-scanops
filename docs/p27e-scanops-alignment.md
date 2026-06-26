# P27E ScanOps Alignment

ScanOps-side model alignment for the future Inventory inbox.

```text
ScanOps 27B outbound model
maps to
Inventory 27C inbound model
```

Aligned fields include:

```text
queue id / inbound id
environment
event id
event key
duplicate key
source system
source device
source store
source workflow
contract version
receipt event
audit event
```

Guardrails:

```text
TEST/TRAINING candidate only
LIVE blocked
PRODUCTION blocked
No transport activation
No desktop call
No Inventory write
No stock mutation
No workflow mutation
No price mutation
No accounting mutation
No PO write
No forecast write
No persistence
```
