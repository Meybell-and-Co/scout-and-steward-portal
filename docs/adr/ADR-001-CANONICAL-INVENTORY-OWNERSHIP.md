# ADR-001 — Canonical Inventory Ownership

## Status

Accepted

---

## Decision

The canonical Scout & Steward sports-card inventory is owned exclusively
by the sports-card-import system.

The authoritative inventory is:

`processed/primary_inventory.json`

Scout & Steward Portal may consume data derived from canonical inventory,
but neither the Portal nor its users may directly modify the canonical
inventory.

All canonical mutations must occur through controlled tooling within
sports-card-import.

---

## Why

Scout & Steward uses multiple systems for different purposes.

sports-card-import exists to identify, normalize, validate, merge, and
transform sports-card inventory.

Scout & Steward Portal exists to present that inventory to people and
record their decisions.

Allowing both systems to independently modify inventory would create
multiple sources of truth and make it difficult to determine which data
is authoritative.

Canonical ownership therefore remains with the system already responsible
for inventory validation and integrity.

---

## Responsibilities

### sports-card-import

sports-card-import is responsible for:

- canonical inventory
- inventory schema
- validation
- normalization
- canonical mutations
- batch processing
- downstream exports
- rejecting invalid changes

### Scout & Steward Portal

Scout & Steward Portal may:

- consume published inventory data
- present inventory to authorized users
- collect client decisions
- collect correction requests
- perform administrative review
- produce approved change records

The Portal does not determine whether a proposed change is structurally
valid for canonical inventory.

---

## Alternatives Considered

### Allow the Portal to Edit primary_inventory.json Directly

Rejected.

This would give a human-facing application direct authority over the
canonical datastore and bypass safeguards already implemented in
sports-card-import.

### Maintain Separate Canonical Inventories

Rejected.

Maintaining one canonical inventory for the Portal and another for the
pipeline would create synchronization problems and ambiguous ownership.

### Move Canonical Inventory Entirely Into the Portal

Rejected for the current architecture.

The existing sports-card-import system already owns the schema,
validation, normalization, and downstream inventory pipeline.

Moving canonical ownership would create complexity without a demonstrated
benefit.

---

## Tradeoffs

### Pros

- preserves one source of truth
- protects existing validation safeguards
- prevents accidental Portal mutations
- keeps system responsibilities clear
- makes data discrepancies easier to resolve
- allows the Portal to evolve independently

### Cons

- requires an explicit exchange mechanism between systems
- Portal changes are not immediately canonical
- approved changes require an additional import step

---

## Future Direction

Canonical storage technology may change in the future.

This ADR governs ownership rather than storage format.

If primary_inventory.json is eventually replaced by a database, API, or
other datastore, sports-card-import remains the canonical authority
unless a later ADR explicitly supersedes this decision.
