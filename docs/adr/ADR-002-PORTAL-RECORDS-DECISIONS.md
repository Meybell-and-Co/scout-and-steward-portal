# ADR-002 — The Portal Records Decisions

## Status

Accepted

---

## Decision

Scout & Steward Portal owns human workflow and decision records.

The Portal records what authorized users decide about inventory without
treating those decisions as immediate changes to canonical inventory.

Portal-owned records may include:

- price approvals
- proposed prices
- correction requests
- review status
- administrative decisions
- timestamps
- actor identity
- audit history

Canonical card facts remain owned by sports-card-import.

---

## Why

The Portal and the inventory pipeline answer different questions.

sports-card-import answers:

> What does Scout & Steward currently consider true about this item?

The Portal answers:

> What has a person reviewed, requested, approved, or changed?

Separating facts from decisions prevents workflow state from becoming
entangled with canonical inventory and allows each system to evolve
without assuming the other's responsibilities.

---

## Responsibilities

### Portal Records

Portal records should preserve enough information to understand:

- which item was involved
- what decision was made
- what value was presented
- what value was proposed
- who acted
- when the action occurred
- the current review state

### Canonical Records

Canonical records continue to represent accepted inventory facts.

A Portal decision becomes a canonical fact only after completing the
approved import process.

---

## Alternatives Considered

### Store Client Decisions Directly in Canonical Inventory

Rejected.

This would mix temporary workflow state with authoritative inventory and
could cause unreviewed proposals to appear canonical.

### Treat Portal Data as Canonical

Rejected.

The Portal is optimized for human interaction and workflow, not canonical
inventory validation.

### Store No Persistent Portal Workflow

Rejected.

Without persistent workflow records, the system could not reliably track
pending decisions, administrative review, or audit history.

---

## Tradeoffs

### Pros

- creates a clear boundary between facts and decisions
- preserves pending and historical decisions
- supports administrative review
- improves auditability
- prevents client actions from silently changing canonical data
- permits richer Portal workflows without polluting inventory records

### Cons

- introduces a Portal-specific writable datastore
- requires synchronization between published inventory and workflow data
- creates records that must be retained and managed separately from
  canonical inventory

---

## Examples

A recommended price of $14.00 is published to the Portal.

The client proposes $18.00.

The Portal preserves both values:

```text
recommended_price: 14.00
client_price:      18.00
