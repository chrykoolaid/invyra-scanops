# P29-D Transport Contract Fixture Outline

This fixture outline describes the future transport contract shape without implementing transport.

```text
Scanner candidate
→ Pairing candidate
→ Device identity candidate
→ Session candidate
→ Envelope candidate
→ Inventory candidate inbox
→ Receipt candidate
```

## Candidate fields

```text
environment
source_system
target_system
device_id
session_id
envelope_version
candidate_id
created_at_candidate
payload_preview
```

## Required blocked states

```text
transport_active = false
listener_active = false
network_call_attempted = false
desktop_call_attempted = false
event_sent = false
queue_persisted = false
inbound_persisted = false
receipt_emitted = false
inventory_write_allowed = false
scanops_write_allowed = false
mutation_allowed = false
```

## Environment rule

```text
TRAINING allowed for design
TEST allowed for design
LIVE blocked
PRODUCTION blocked
UNKNOWN blocked
```

This document is not executable configuration and must not be used as runtime transport setup.
