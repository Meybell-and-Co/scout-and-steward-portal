# ADR-006 — Portal Workflow Data Model

## Status

Accepted

---

## Decision

Scout & Steward Portal will use a snapshot-based workflow data model that preserves the canonical sports-card inventory as the sole authoritative source of inventory facts.

Portal-readable card data will consist of controlled published representations of canonical inventory data.

These representations are snapshots or projections of canonical state. They are not independently authoritative inventory records.

The Portal may create and own workflow data derived from human interaction, including:

- client pricing decisions
- client price overrides
- suggested inventory updates
- administrative integrity reviews
- approved change records
- workflow status
- timestamps
- actor identity
- audit history
- canonical import results

Human workflow records must remain distinguishable from published canonical snapshots.

The conceptual data flow is:

    Canonical Inventory
            |
            | controlled publish
            v
    Published Portal Snapshot
            |
            v
    Client Review
      ├── Approve Recommended Price
      ├── Override Price
      └── Suggest Update
            |
            v
    Administrative Integrity Review
      ├── Confirm
      └── Return to Client
            |
            v
    Approved Change
            |
            | controlled import
            v
    sports-card-import
      ├── normalization
      ├── schema validation
      ├── business-rule validation
      └── canonical mutation
            |
            v
    Canonical Inventory
            |
            | subsequent publication
            v
    Updated Portal Snapshot

An approved Portal change is not canonical merely because it has received human approval.

A proposed change becomes canonical only after it has passed the controlled import, validation, and mutation processes owned by `sports-card-import`.

---

## Why

Scout & Steward Portal exists to support human review and decision-making around canonical inventory.

It does not replace the canonical inventory system.

The Portal therefore needs enough inventory information to provide useful context for human decisions without becoming a second inventory authority.

This requires a deliberate distinction between:

- canonical facts
- published representations of canonical facts
- human proposals and decisions
- administrative review
- approved changes
- successful canonical mutations

Without this distinction, Portal workflow data could gradually become an informal second source of truth.

That would create ambiguity about which system owns inventory facts and increase the risk of uncontrolled or conflicting changes.

The selected model preserves the ownership boundary established in ADR-005 while allowing the Portal to maintain useful relational workflow state.

---

## Canonical Authority

`processed/primary_inventory.json` within `sports-card-import` remains the canonical sports-card inventory.

Only the controlled processes owned by `sports-card-import` may mutate canonical inventory.

Portal users do not directly edit canonical records.

Cloudflare Workers do not directly mutate canonical inventory.

Cloudflare D1 does not become canonical merely because it contains card-related information.

R2 does not become canonical merely because it stores inventory images.

The existence of a value in the Portal does not establish that value as an authoritative inventory fact.

---

## Published Portal Snapshots

The Portal will receive controlled published representations of canonical inventory.

A published representation is a snapshot or projection of canonical data sufficient to support the Portal workflow.

The Portal should receive only information reasonably required for presentation, identification, pricing decisions, and suggested updates.

It should not automatically duplicate every canonical field.

A published snapshot may include information such as:

- canonical item identifier
- player or subject name
- team
- year
- manufacturer
- set
- card number
- relevant insert or classification information
- useful descriptive attributes
- inventory image references
- current pricing-related information
- recommended price
- publication identity
- publication timestamp

The exact publish contract will be defined separately and may evolve as Portal requirements become clearer.

The Portal snapshot is a representation of what Canon reported at a particular publication point.

It is not an independently maintained inventory record.

---

## Publication Model

Canonical data will be published to the Portal through a controlled process.

Loading or refreshing the Portal application does not itself cause canonical synchronization.

The browser reads the latest Portal-readable data that has already been published.

The conceptual relationship is:

    sports-card-import
            |
            | publish
            v
    Portal-readable D1 data
            |
            | read
            v
    Browser

The Portal must not independently infer that its local representation is more current or authoritative than Canon.

Canonical truth moves outward through publication.

Portal workflow data moves back toward Canon only through the approved-change process.

---

## Snapshot Identity

Published representations must include sufficient identity or version information to determine which canonical publication formed the basis of a human decision.

A client decision must therefore be attributable to the snapshot presented when the decision was submitted.

This protects against a human decision being silently reinterpreted against canonical data that changed afterward.

For example:

1. Canonical inventory publishes Snapshot A.
2. The client reviews Snapshot A and submits a pricing decision.
3. Canonical inventory later changes.
4. Snapshot B is published.
5. The original client decision remains associated with Snapshot A.

The system must not represent the original decision as though the client reviewed Snapshot B.

Where a subsequent canonical change materially affects an unresolved human decision, the Portal may require or flag that decision for renewed review.

The precise conflict and re-review rules may be defined separately.

---

## Republishing Canonical Data

Published card data is replaceable because Canon remains authoritative.

When a newer canonical representation is published, the Portal may update its current display snapshot.

Workflow history is not replaceable in the same manner.

Republishing canonical data must not silently erase:

- client decisions
- submitted price overrides
- suggested updates
- administrative reviews
- approval history
- import attempts
- canonicalization results

This creates a distinction between:

### Replaceable Published State

The latest Portal-readable representation of canonical inventory.

### Durable Workflow History

The record of what people proposed, decided, reviewed, and approved based on particular published states.

---

## Client Authority

The client is the primary domain authority for pricing and sports/history product knowledge.

The initial client actions are:

### Approve Recommended Price

The client accepts the recommended price presented by the Portal.

The interface may represent this simply as:

    Recommended Price
    $14.00

    [ Approve ]

Approval creates a workflow decision.

It does not directly mutate canonical inventory.

### Override Price

The client may submit a different price.

The submitted value represents the client's pricing decision.

The Portal should preserve both the relevant recommended value and the submitted override so that the decision can be understood in context.

### Suggest Update

The client may identify inventory information that they believe should be changed.

This action is intentionally described as **Suggest Update** rather than **Request Correction**.

The terminology recognizes the client's subject-matter expertise and agency without declaring the existing canonical value incorrect before review and validation.

Suggested updates may concern information such as:

- player or subject
- team
- year
- manufacturer
- set
- card number
- classification
- descriptive metadata
- other relevant observable inventory information

A suggested update becomes workflow data.

It does not directly alter the published snapshot or canonical inventory.

---

## Drafting Versus Submission

Transient interface activity does not need to become permanent audit history.

For example, a client may type several values into a price field before submitting a decision.

Those intermediate keystrokes are not separate business decisions.

A durable workflow record is created when the user performs a meaningful submission action.

For example:

    Recommended price: $14.00

    Client types:
    $18.00
    $20.00
    $22.00

    Client selects:
    Submit Override

The durable submitted decision is `$22.00`.

If the client later submits `$24.00`, the previous `$22.00` submission must not be overwritten.

The later submission creates a new workflow event.

---

## Workflow Record Immutability

Submitted human decisions should be treated as immutable historical records.

The system should prefer appending new workflow events rather than rewriting previous submitted decisions.

For example:

    Decision 1
    Client override: $22.00
    Submitted: 2026-08-08 10:42

    Decision 2
    Client override: $24.00
    Submitted: 2026-08-08 10:47

The application may calculate or store convenient current-state information such as:

    Current proposed price: $24.00

That convenience must not destroy the historical record.

This principle applies to:

- client pricing decisions
- price overrides
- suggested updates
- administrative review
- returned decisions
- approved changes
- canonical import attempts
- validation failures
- successful canonicalization

---

## Administrative Authority

The administrator primarily serves as an integrity and safety gate between client decisions and canonical mutation.

The administrator is not intended to replace the client's sports, historical, or pricing judgment.

The administrative role exists to protect system integrity and identify obvious or potentially damaging mistakes before they enter the canonical pipeline.

Examples may include:

- accidental decimal placement
- unusually large pricing deviations
- malformed submitted values
- conflicting workflow state
- apparent accidental submissions
- changes that require clarification
- changes that appear inconsistent with the reviewed snapshot

The initial administrative actions are:

### Confirm

The administrator confirms that the submitted client decision may proceed to the approved-change workflow.

### Return to Client

The administrator returns the decision for clarification or reconsideration.

Returning a decision must preserve the original submission and administrative action in workflow history.

---

## Administrative Non-Substitution Principle

The administrator should not normally replace a client's pricing decision with a different administrator-selected price.

For example, if:

    Recommended price: $14.00
    Client override: $22.00

the administrator should not silently transform the decision into:

    $18.00

If the submitted value appears erroneous or requires reconsideration, it should normally be returned to the client.

This preserves a clear division of responsibility:

    Client
    └── domain and pricing judgment

    Administrator
    └── workflow and data-integrity judgment

A future requirement may introduce explicit administrator-originated changes, but such behavior should be modeled as a distinct action rather than as silent modification of a client submission.

---

## Guardrails

The Portal may identify unusual decisions before or during administrative review.

Examples may include:

- unusually large price increases
- unusually large price decreases
- values outside expected ranges
- values that resemble decimal-entry mistakes
- invalid or malformed values

A guardrail does not determine that the client's decision is wrong.

It identifies a decision that warrants additional attention.

For example:

    Recommended price: $14.00
    Client override: $1,400.00

    ⚠ Unusual price change — review required

Guardrail thresholds and implementation details may be defined separately.

Automated guardrails must not silently rewrite submitted client values.

---

## Human Approval Is Not Canonicalization

Administrative confirmation establishes that a proposed change is approved to enter the canonical import process.

It does not establish that the proposed change is canonical.

The conceptual states are distinct:

    submitted
        |
        v
    reviewed
        |
        v
    approved
        |
        v
    pending canonical import
        |
        v
    validated
        |
        v
    canonicalized

A proposal may fail after approval.

For example:

    approved
        |
        v
    canonical import attempted
        |
        v
    schema validation failed
        |
        v
    Canon unchanged

The Portal must not report such a proposal as canonicalized.

---

## Controlled Canonical Import

Approved changes will return to `sports-card-import` through a controlled and documented data exchange.

The approved-change record must contain sufficient information to identify:

- the canonical item
- the relevant published snapshot
- the client submission
- the administrative decision
- the proposed canonical change
- the actor or actors involved
- relevant timestamps

`sports-card-import` remains responsible for applying its standard quality controls.

These may include:

- normalization
- schema validation
- identifier validation
- business-rule validation
- duplicate detection where applicable
- safe canonical mutation
- canonical output validation

Human approval must not bypass these controls.

---

## Validation Failure

If an approved change fails canonical validation:

- canonical inventory remains unchanged
- the approved proposal remains preserved
- the import attempt is recorded
- the validation failure is recorded
- the Portal must not represent the change as canonicalized

The workflow may then return the item for administrative or client attention as appropriate.

Validation failures are workflow outcomes, not reasons to erase previous decisions.

---

## Successful Canonicalization

A proposed change may be considered canonicalized only after `sports-card-import` successfully:

1. accepts the approved change
2. validates the proposed mutation
3. applies the mutation
4. validates the resulting canonical inventory
5. successfully persists the canonical result

The successful outcome should be reported back to the Portal.

The Portal may then mark the approved change as canonicalized.

A subsequent canonical publication should reflect the new canonical state.

---

## Auditability

The Portal workflow should be capable of answering:

- What canonical information was presented?
- Which publication did it come from?
- Who reviewed it?
- What did the client submit?
- When was it submitted?
- Was the submission changed later through another submission?
- What did the administrator do?
- When did administrative review occur?
- What change was approved for canonical import?
- Was canonical import attempted?
- Did validation succeed?
- If validation failed, why?
- Was canonical inventory successfully updated?
- Which canonical publication later reflected the change?

The purpose of auditability is operational clarity and recoverability.

The audit model should remain proportionate to the scale and risk of the Portal rather than becoming an unnecessarily complex event-sourcing system.

---

## Current State Versus Historical Events

The Portal may maintain convenient current-state values to support efficient application queries.

Examples include:

- current review status
- current proposed price
- latest client submission
- latest administrative disposition
- current canonical import status

Such values are application conveniences.

They must not replace the durable workflow records required to reconstruct significant human and system actions.

The database schema may therefore use both:

- current-state records for efficient application behavior
- append-oriented workflow records for durable history

The precise schema will be defined in implementation.

---

## Data Ownership

### Canonical Inventory Owns

- authoritative card identity
- authoritative inventory metadata
- canonical schema
- canonical mutation
- canonical validation
- canonical inventory persistence

### Published Portal Data Represents

- selected canonical fields
- canonical identity references
- publication identity
- publication timestamps
- Portal-readable pricing context
- Portal-readable image references

Published Portal data represents canonical information but does not own it.

### Portal Workflow Owns

- client review state
- client pricing decisions
- client price overrides
- client suggested updates
- administrative integrity review
- administrative decisions
- approved-change records
- workflow timestamps
- workflow actor identity
- workflow audit history
- canonical import status
- canonical import results

### R2 Stores

- inventory photography
- shared Scout & Steward media
- other approved durable assets

R2 storage does not establish business-data authority.

---

## Data Minimization

The Portal should receive the smallest useful representation of canonical inventory required to perform its demonstrated workflow.

The Portal should not duplicate canonical fields merely because they are available.

Fields should be published because they support:

- identifying the item
- understanding the item
- making a pricing decision
- evaluating a suggested update
- performing administrative review
- maintaining workflow integrity

This reduces unnecessary duplication and reinforces the distinction between Portal workflow storage and canonical inventory.

---

## Database Design Principles

The eventual D1 schema should favor:

- explicit canonical identifiers
- explicit snapshot or publication identity
- relational workflow state
- append-oriented human decision history
- clear actor attribution
- clear timestamps
- distinguishable client and administrative actions
- distinguishable approved and canonicalized states
- recoverable validation failures
- efficient current-state queries
- referential integrity where practical

The schema should avoid:

- treating D1 as a second canonical inventory
- storing the complete canonical dataset without demonstrated need
- overwriting meaningful submitted decisions
- allowing browser-side code to establish authoritative workflow state
- allowing client actions to bypass administrative review
- allowing administrative approval to bypass canonical validation
- silently rewriting human submissions
- representing failed imports as successful canonical changes

---

## Security Boundary

All protected workflow mutations must occur through the Portal's server-side application boundary.

Browser code must not directly establish trusted workflow state.

Cloudflare Workers will validate authenticated identity and authorization before performing protected D1 operations.

This maintains the authentication and authorization separation established in ADR-005.

---

## Alternatives Considered

### Allow the Portal to Directly Edit Canonical Inventory

Rejected.

This would collapse the boundary between human workflow and canonical data management.

It would also allow Portal application behavior to bypass the validation and business rules already owned by `sports-card-import`.

### Treat D1 as a Complete Copy of Canonical Inventory

Rejected for the initial architecture.

The Portal does not demonstrate a requirement for a complete independent inventory database.

A deliberately limited published representation provides the information required by the Portal while preserving clearer ownership.

### Synchronize Canon Automatically on Browser Refresh

Rejected.

Browser access should not determine when canonical data is published.

Publication is a system responsibility and should occur through a controlled process.

### Overwrite Previous Client Decisions

Rejected.

Overwriting submitted decisions would reduce auditability and make it difficult to understand how the current workflow state was reached.

### Allow Administrators to Silently Modify Client Decisions

Rejected.

The administrator serves primarily as an integrity gate.

If a client decision requires reconsideration, it should normally be returned to the client rather than silently replaced.

### Treat Administrative Approval as Canonical Mutation

Rejected.

Human approval expresses intent.

Canonical mutation remains subject to the normal validation and quality controls of `sports-card-import`.

### Store Every User Interaction as an Event

Rejected.

The Portal does not require a full event-sourcing architecture.

Only meaningful submitted business actions require durable workflow history.

Transient typing, navigation, and other non-submitted interface activity do not need to become permanent business records.

---

## Tradeoffs

### Pros

- preserves one canonical inventory owner
- gives the Portal enough data to support useful client decisions
- minimizes unnecessary canonical-data duplication
- preserves meaningful human decision history
- supports clear client and administrator responsibilities
- prevents administrative approval from bypassing validation
- provides recoverability when imports fail
- allows published data to evolve without rewriting historical decisions
- makes stale-snapshot conflicts detectable
- supports future automation without removing human accountability
- keeps workflow state relational and queryable

### Cons

- requires an explicit canonical publication process
- requires snapshot or publication identity
- requires more workflow records than an overwrite-based model
- requires approved-change import and result reporting
- introduces synchronization considerations between Canon and Portal
- requires explicit handling when canonical data changes during an unresolved review
- requires careful distinction between current-state convenience fields and historical records

---

## Operational Principle

The Portal records **what Canon showed and what people decided**.

`sports-card-import` determines **what becomes Canon**.

Human judgment determines intent.

Automated validation determines whether that intent satisfies the established requirements for canonical mutation.

Neither human approval nor Portal state alone is sufficient to redefine canonical inventory.

---

## Future Direction

Separate decisions or implementation documents may define:

- canonical publish format
- publication identifiers
- D1 table schema
- D1 migrations
- pricing recommendation ownership
- guardrail thresholds
- stale-snapshot conflict handling
- client organization mapping
- actor identity representation
- approved-change exchange format
- canonical import tooling
- import result reporting
- workflow retention policy
- administrative queue behavior
- user-interface presentation of workflow history

These implementation details may evolve without superseding this ADR so long as the ownership, snapshot, workflow, audit, and canonicalization principles described here remain intact.

A future architecture that permits the Portal to become an authoritative inventory owner, bypass canonical validation, or directly mutate canonical inventory would constitute a material change and should be documented in a superseding ADR.
