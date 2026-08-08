# ADR-003 — Two-Stage Approval

## Status

Accepted

---

## Decision

Client decisions that may affect canonical inventory must pass through
administrative review before becoming eligible for canonical import.

The standard approval path is:

    Client Decision
          |
          v
    Pending Review
          |
          v
    Administrator Decision
          |
          v
    Approved Change
          |
          v
    Canonical Import

Client approval and administrative approval are separate events.

Administrative approval does not directly mutate canonical inventory.

It makes the proposed change eligible for controlled import by
sports-card-import.

---

## Why

Clients possess valuable knowledge about their collection and should be
able to make pricing decisions and identify possible factual errors.

However, accidental edits, misunderstandings, or malformed changes should
not bypass the safeguards protecting canonical inventory.

Administrative review creates a human checkpoint between client workflow
and canonical mutation.

The subsequent sports-card-import validation creates a technical
checkpoint.

Together they provide defense in depth without preventing clients from
participating directly in collection management.

---

## Responsibilities

### Client

The client may:

- approve recommended prices
- propose different prices
- identify suspected errors
- submit correction requests
- perform permitted bulk review actions

### Administrator

The administrator may:

- review client decisions
- accept proposed changes
- modify proposed changes when appropriate
- reject proposed changes
- request further review
- prepare approved changes for import

### sports-card-import

sports-card-import remains responsible for:

- validating approved changes
- rejecting invalid or ambiguous changes
- applying valid canonical mutations
- validating the resulting inventory
- preserving canonical integrity

---

## Alternatives Considered

### Client Decisions Immediately Become Canonical

Rejected.

This would remove administrative oversight and allow accidental or
incorrect client actions to modify authoritative data.

### Administrator Directly Edits Canonical Inventory From the Portal

Rejected.

This would move canonical mutation authority into the Portal and bypass
the sports-card-import validation boundary.

### No Client Editing Capabilities

Rejected.

This would unnecessarily remove useful client knowledge and force all
review work back onto the administrator.

---

## Tradeoffs

### Pros

- protects canonical inventory
- allows meaningful client participation
- creates clear accountability
- provides an opportunity to catch mistakes
- supports audit history
- separates human approval from technical validation

### Cons

- introduces an additional workflow step
- changes may not become canonical immediately
- creates an administrative review queue
- requires clear handling of pending, approved, rejected, and imported
  states

---

## Examples

### Price Change

The system recommends $14.00.

The client proposes $18.00.

The Portal records the proposal as pending.

An administrator reviews and accepts $18.00.

The Portal marks the change as approved for import.

sports-card-import validates and applies the approved change.

### Metadata Correction

Canonical inventory identifies a particular team.

The client reports that the team should be different.

The Portal records a correction request.

An administrator reviews the request and determines the appropriate
canonical change.

Only an approved and valid change is submitted to sports-card-import.

---

## Future Direction

Some future workflow actions may be determined to carry sufficiently low
risk that administrative review is unnecessary.

Any class of action permitted to bypass two-stage approval should be
explicitly documented rather than introduced implicitly through
implementation.
