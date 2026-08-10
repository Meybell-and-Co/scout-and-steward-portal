# Scout & Steward Portal

## First Edition

---

*Practical guidance for building a durable, human-centered collection management experience.*

> "Good architecture should make the right thing easier than the wrong
> thing."

The purpose of this document is not to prescribe every implementation
detail.

It exists to preserve the reasoning behind the Scout & Steward Portal so
future decisions remain consistent even as technologies change.

When implementation and philosophy disagree, revisit the implementation
first. Revise the philosophy only when a better principle has emerged.

---

## Purpose

Scout & Steward Portal is the human-facing companion to the Scout &
Steward sports-card inventory pipeline.

It provides a simple, polished interface through which clients can review
cards, approve or change recommended pricing, identify possible errors,
search their collection, and understand the current state of their
inventory.

It also provides an administrative interface through which authorized
administrators can review client decisions before those decisions become
eligible for incorporation into the canonical inventory.

The Portal is not the inventory system of record.

It records human decisions about inventory maintained elsewhere.

---

## Contents

- Guiding Principles
- System Boundaries
- Data Ownership
- User Roles
- Review and Approval Workflow
- Price Review
- Metadata Corrections
- Status Model
- Auditability
- Repository Structure
- External Services
- Asset Strategy
- Data Exchange
- Canonical Import
- Security
- Interaction Principles
- Generated and Published Data
- Architecture Decision Records
- Architectural Boundary

---

# Guiding Principles

## Respect System Boundaries

Each system should perform the work it is designed to own.

The Portal manages human interaction and workflow.

The sports-card-import system manages canonical inventory, validation,
normalization, transformation, and downstream exports.

Neither system should quietly assume the responsibilities of the other.

## One Source of Truth

Every piece of information has one authoritative owner.

The canonical sports-card inventory belongs to sports-card-import.

Portal records, cached data, published data, and generated artifacts must
never silently become competing sources of truth.

## The Portal Records Decisions

The Portal exists to collect, present, and preserve human decisions.

It may display canonical inventory data, recommended values, workflow
states, and other information necessary to make those decisions.

It does not directly modify canonical inventory.

## Human Review Protects Canonical Data

Client decisions are meaningful input, but they are not automatically
canonical changes.

Changes that affect canonical inventory must pass through an
administrative review before becoming eligible for import.

The final authority to validate and apply those changes remains with
sports-card-import.

## Clear Before Clever

Optimize for comprehension before optimization.

Interfaces, data structures, workflows, and code should make their
purpose apparent without requiring unnecessary explanation.

## Build Small Pieces

Small files. Small functions. Small components. Small commits.

Prefer components and services with clear responsibilities over large
structures that know too much.

## Progressive Enhancement

Core tasks should remain understandable and usable even when optional
browser capabilities are unavailable.

Motion, gestures, haptics, and other enhanced interactions may improve
the experience but must not be the sole means of communicating or
performing an important action.

## Accessibility is a Feature

Accessibility is part of design---not an afterthought.

Touch targets, contrast, typography, interaction states, keyboard
behavior, motion preferences, and assistive technologies should be
considered as part of normal implementation.

## Security by Default

Validate. Sanitize. Authenticate. Authorize. Escape.

A user's ability to see information does not automatically grant the
ability to modify it.

Administrative capabilities must be protected by authorization, not
merely hidden from the client interface.

## Documentation Matters

Every significant architectural decision deserves an explanation.

Important decisions should be recorded as Architecture Decision Records
rather than left to institutional memory.

## Systems Before Solutions

Build the smallest system that makes tomorrow's work easier.

Avoid introducing infrastructure, dependencies, abstractions, or
services until they solve a demonstrated problem.

## Intentional Complexity

Complexity is acceptable only when it creates lasting value.

The Portal should remain as small as practical while preserving security,
data integrity, maintainability, and a high-quality user experience.

## Optimize for Ownership

Build systems that Meybell & Co. can confidently understand, operate,
maintain, and modify.

Avoid unnecessary infrastructure that creates dependence on specialized
knowledge without corresponding value.

## Human-Centered Engineering

Optimize for human understanding before machine cleverness whenever
practical.

The client should not need to understand the internal inventory pipeline
in order to use the Portal successfully.

## Speed for Repetition; Friction for Consequence

Frequent, low-risk actions should be fast.

Actions affecting many records, destructive actions, and other
high-consequence operations should require proportionally greater
intent.

Confirmation patterns should prevent accidental actions rather than
merely adding additional clicks.

---

# System Boundaries

Scout & Steward consists of separate systems with deliberately different
responsibilities.

## sports-card-import

sports-card-import is the back-office inventory pipeline.

It owns:

- canonical inventory
- inventory schema
- validation
- normalization
- batch processing
- canonical data mutation
- listing generation
- eBay export
- other downstream transformations

Its canonical inventory remains:

`processed/primary_inventory.json`

The Portal must never directly edit this file.

## Scout & Steward Portal

Scout & Steward Portal is the human-facing workflow application.

It owns:

- authentication and authorization
- client task presentation
- price review
- client price decisions
- correction requests
- administrative review
- workflow state
- audit history associated with Portal decisions
- collection search and filtering
- presentation of published inventory data

It may consume data derived from canonical inventory.

It may produce approved change records for sports-card-import.

It does not own canonical card facts.

## Asset Storage

Static assets and inventory images may be stored outside either
application.

The Portal references those assets rather than duplicating them unless
there is a documented reason to do otherwise.

---

# Data Ownership

Ownership must remain explicit.

## Canonical Card Data

Canonical card facts belong to sports-card-import.

Examples include:

- item identifiers
- player names
- teams
- manufacturers
- sets
- years
- card numbers
- classifications
- other normalized inventory metadata

## Portal Workflow Data

Portal workflow information belongs to Scout & Steward Portal.

Examples include:

- whether a client has reviewed a recommendation
- a client's selected price
- correction requests
- administrative review state
- timestamps
- actor identity
- review history

## Published Data

Data published from sports-card-import for Portal consumption is a
derived representation.

Published data is not canonical merely because the Portal uses it.

If published data and canonical inventory disagree, canonical inventory
wins.

---

# User Roles

The Portal initially recognizes two primary roles.

## Client

A client may:

- view assigned inventory
- review cards
- approve recommended prices
- propose different prices
- report suspected factual errors
- search and filter their collection
- view relevant workflow status
- perform authorized bulk review actions

A client may not:

- directly modify canonical inventory
- approve their own canonical metadata changes
- access administrative functionality
- modify another client's inventory

## Administrator

An administrator may:

- review client decisions
- accept, modify, or reject proposed changes
- review correction requests
- manage Portal workflow state
- inspect relevant audit history
- prepare approved changes for canonical import

Administrative approval does not itself mutate canonical inventory.

It makes a change eligible for controlled import by sports-card-import.

---

# Review and Approval Workflow

The standard workflow is:

```text
Canonical Inventory
        |
        | publish
        v
Portal-Readable Inventory
        |
        v
Client Review
        |
        | decision or correction request
        v
Pending Portal Change
        |
        v
Administrator Review
        |
        | approve
        v
Approved Change
        |
        | controlled import
        v
sports-card-import
        |
        | validate
        v
Canonical Inventory
```

At no point does the client-facing application directly rewrite
canonical inventory.

---

# Price Review

A recommended price may be presented to the client for review.

The client may:

- approve the recommendation
- propose a different price
- leave the item for later review

A client-entered price should preserve the original recommendation for
comparison and audit purposes.

For example:

```text
Recommended price: $14.00
Client price:      $18.00
```

The original recommendation must not be destroyed merely because the
client proposes another value.

A recommendation is not required when available market evidence is insufficient. Items without a defensible recommendation must require human pricing rather than receiving an arbitrary fallback value. Market assessment methodology is documented in docs/MARKET-METHODOLOGY.md.

---

# Metadata Corrections

Clients may identify information they believe is incorrect.

A correction submitted through the Portal is a request, not an immediate
edit to canonical inventory.

Correction records should preserve:

- affected item
- affected field when known
- current value
- proposed value or client comment
- submitting user
- submission time
- administrative disposition
- reviewing administrator when applicable

This protects canonical inventory while allowing knowledgeable clients
to contribute corrections.

---

# Status Model

Workflow state should not be compressed into a single field when
multiple independent concepts are being represented.

Where practical, separate status dimensions should describe separate
concerns.

## Listing Status

Examples:

- inventory
- ready_to_list
- listed
- sold
- archived

## Price Status

Examples:

- needs_recommendation
- needs_approval
- approved
- overridden

## Metadata Status

Examples:

- verified
- correction_requested
- needs_review

Internal status values may be translated into friendlier language in the
client interface.

Presentation language must not change the underlying meaning of the
status.

---

# Auditability

Meaningful Portal changes should be traceable.

For a change affecting inventory, the system should be capable of
answering:

- What item was affected?
- What field or decision was involved?
- What was the previous value?
- What was proposed?
- Who proposed it?
- When was it proposed?
- Who reviewed it?
- What was the administrative decision?
- When was that decision made?
- Was the approved change subsequently imported?

Auditability should be designed into the workflow rather than
reconstructed later from logs when practical.

---

# Repository Structure

`docs/`
:   Architecture, visual-language documentation, and Architecture
    Decision Records.

`docs/adr/`
:   Individual Architecture Decision Records and their index.

`public/`
:   Static files that must be published with the application.

`src/`
:   Portal application source.

`src/components/`
:   Reusable interface components.

`src/services/`
:   Interfaces to APIs, data services, authentication, and other
    external capabilities.

`src/styles/`
:   Application styles and implementation of Scout & Steward design
    tokens.

`src/views/`
:   Screen-level compositions and application views.

`README.md`
:   Repository introduction, setup guidance, and developer entry point.

The repository structure may evolve as the implementation is selected.

New directories should exist because they represent a clear
responsibility, not merely because a framework convention provides them.

---

# External Services

The Portal may rely on managed external services for capabilities that
do not belong inside the application itself.

Initial service categories include:

- application hosting
- authentication
- authorization
- API execution
- Portal workflow storage
- static asset storage
- card image delivery

Cloudflare is the preferred infrastructure environment where its
services provide an appropriate, maintainable solution.

Specific Cloudflare products are implementation decisions and should be
documented when selected rather than assumed by this architecture.

---

# Asset Strategy

Scout & Steward brand assets may be served from the Scout & Steward
Portal asset store.

These may include:

- logos
- typefaces
- interface imagery
- other shared presentation assets

Sports-card images remain owned and published by the sports-card asset
pipeline.

The Portal should reference existing card image assets rather than
creating unnecessary duplicate copies.

Asset location does not imply data ownership.

---

# Data Exchange

Communication between Scout & Steward Portal and sports-card-import
should occur through documented data contracts.

The primary conceptual exchange is:

```text
published card data
        |
        v
Portal
        |
        v
client decision
        |
        v
administrative decision
        |
        v
approved change
        |
        v
sports-card-import
```

Both systems should understand the structure and meaning of exchanged
records without requiring access to each other's internal
implementation.

Data contracts should be versioned when breaking changes become
necessary.

---

# Canonical Import

Approved Portal changes must return to sports-card-import through a
controlled import process.

The import process should:

1. identify the canonical item
2. validate the requested change
3. reject invalid or ambiguous changes
4. preserve relevant audit information
5. apply valid changes through controlled tooling
6. validate the resulting inventory
7. replace canonical data only after successful validation

Portal approval is permission to consider a change for import.

It is not permission to bypass canonical validation.

---

# Security

Security boundaries should follow capability rather than presentation.

The Portal should distinguish between:

- anonymous requests
- authenticated client requests
- authenticated administrative requests
- trusted system-to-system operations

Authorization must be enforced by the service handling the operation.

Hiding an administrative button in the interface is not authorization.

Secrets, credentials, private tokens, and privileged service
configuration must not be committed to the repository or exposed to
client-side code.

---

# Interaction Principles

The Portal is mobile-first but should remain functional on larger
screens.

The client experience should use familiar consumer-interface patterns
rather than requiring knowledge of internal business systems.

Gestures may accelerate common actions but should not be the only way to
perform important tasks.

Important actions should provide immediate and understandable feedback.

Enhanced capabilities such as haptic feedback may be used where
supported, but the interface must remain understandable without them.

Large or consequential bulk actions should use deliberate confirmation
patterns proportional to their consequences.

The interface should make clients feel attended to rather than trained
to operate an internal system.

---

# Generated and Published Data

## Source Data

Canonical source data remains within sports-card-import.

The Portal must not treat a local or published copy of canonical data as
authoritative.

## Published Data

Portal-readable card data may be generated from canonical inventory.

Published representations should contain only the information necessary
for the Portal's responsibilities.

## Portal-Generated Data

The Portal may generate:

- client decisions
- price proposals
- correction requests
- administrative decisions
- approved change records
- audit records

These records belong to the Portal workflow until intentionally consumed
by another system.

---

# Architecture Decision Records

Significant architectural decisions are documented in:

`docs/adr/`

Each ADR should describe one durable architectural decision.

ADRs should preserve reasoning, alternatives, and tradeoffs rather than
merely documenting implementation.

Accepted ADRs should not be silently rewritten when a later decision
changes their conclusion.

When a decision changes materially, create a new ADR that supersedes the
previous decision and preserve the earlier ADR as part of the
architectural record.

The ADR index is maintained in:

`docs/adr/README.md`

---

# Architectural Boundary

The central boundary of Scout & Steward is intentionally simple:

> The Portal records decisions.
>
> The pipeline records facts.

The Portal may help people understand, review, and propose changes to
those facts.

sports-card-import remains responsible for deciding whether those
changes can safely become canonical inventory.
