# ADR-005 — Cloudflare Application Platform

## Status

Accepted

---

## Decision

Scout & Steward Portal will use Cloudflare as its primary application
platform.

The initial application stack will consist of:

- Cloudflare Workers for server-side application and API logic
- Cloudflare Workers Static Assets for frontend application delivery
- Cloudflare D1 for Portal-owned relational workflow data
- Cloudflare Access for authentication
- Cloudflare R2 for durable media and shared asset storage

GitHub remains the source repository for the Portal application.

The initial architecture is:

    GitHub
    scout-and-steward-portal
            |
            | deploy
            v
    Cloudflare Worker
    ├── frontend static assets
    ├── API routes
    └── authorization boundary
            |
            | D1 binding
            v
    Cloudflare D1
    ├── client decisions
    ├── price overrides
    ├── correction requests
    ├── administrative decisions
    └── audit records

    Cloudflare Access
    └── authentication

    Cloudflare R2
    ├── Scout & Steward shared brand assets
    └── sports-card inventory images

            |
            | controlled data exchange
            v

    sports-card-import
    └── canonical inventory

This decision establishes the initial platform architecture.

Individual implementation details may be refined without superseding
this ADR so long as the responsibilities and system boundaries described
here remain intact.

---

## Why

Scout & Steward Portal requires a small set of application capabilities:

- frontend hosting
- server-side API execution
- authentication
- authorization
- writable relational workflow storage
- static asset delivery
- inventory image delivery

Cloudflare provides these capabilities within a single managed
environment.

The project already uses Cloudflare R2 for Scout & Steward brand assets
and sports-card inventory images.

Meybell & Co. also has an existing Cloudflare account and prior
experience deploying web applications through Cloudflare.

Using the same platform for the Portal reduces the number of vendors,
credentials, deployment systems, billing relationships, and operational
boundaries required to maintain the application.

This follows the Scout & Steward architectural principles of:

- Clear Before Clever
- Systems Before Solutions
- Intentional Complexity
- Optimize for Ownership

The objective is not to use Cloudflare everywhere merely because it is
available.

The objective is to use the smallest coherent platform that satisfies
the demonstrated requirements of the Portal.

---

## Application Hosting

Cloudflare Workers will provide the server-side execution environment for
Scout & Steward Portal.

Cloudflare Workers Static Assets will deliver the frontend application.

Application code and application-specific static assets should be
deployed together where practical.

Examples of application-specific assets include:

- HTML
- CSS
- JavaScript
- interface icons
- application-specific images

The Portal does not require a separate traditional web server.

---

## API

Portal API operations will execute through Cloudflare Workers.

The Worker forms the trusted application boundary between browser
requests and Portal-owned data.

API responsibilities may include:

- retrieving Portal-readable card records
- retrieving task counts
- retrieving workflow status
- recording client price decisions
- recording correction requests
- retrieving administrative review queues
- recording administrative decisions
- producing approved change records
- enforcing authorization

Client-side code must not be treated as a security boundary.

Authorization must be enforced by the Worker for protected operations.

---

## Workflow Storage

Cloudflare D1 will store Portal-owned relational workflow data.

D1 is not the canonical sports-card inventory.

D1 may store records such as:

- client review state
- recommended prices presented for review
- client-approved prices
- client price overrides
- correction requests
- administrative review state
- administrative decisions
- timestamps
- actor identity
- audit history
- canonical import status

The precise database schema will be defined separately.

D1 records must preserve the architectural distinction between canonical
facts and Portal decisions.

The existence of a card record or card-related value in D1 does not make
that value canonical.

---

## Authentication

Cloudflare Access will provide the initial authentication boundary for
Scout & Steward Portal.

Authentication answers:

> Who is making this request?

The Portal application remains responsible for authorization.

Authorization answers:

> What is this authenticated user allowed to do?

These concerns must remain separate.

Cloudflare Access may use email-based one-time PIN authentication for
approved users where appropriate.

This allows the Portal to provide authenticated access without requiring
Scout & Steward to create and maintain a separate password system.

---

## Authorization

Application roles will be enforced by Portal server-side logic.

Initial roles are:

- client
- administrator

A client identity may access only the inventory and capabilities
authorized for that client.

An administrator identity may access administrative workflows authorized
for that administrator.

Interface presentation may reflect a user's role, but hiding interface
elements is not authorization.

Protected operations must validate authorization at the API boundary.

---

## Static and Media Assets

Static assets are divided according to responsibility.

### Application Assets

Application-specific frontend assets should normally be deployed with the
Portal through Cloudflare Workers Static Assets.

Examples include:

- application JavaScript
- application CSS
- interface icons
- application-specific presentation files

These assets are part of the deployed application.

### Scout & Steward Brand Assets

Durable and shared Scout & Steward brand assets may remain in the
existing Scout & Steward R2 bucket.

Examples include:

- logos
- shared typefaces
- reusable brand imagery

These assets form a shared media library rather than application logic.

### Sports-Card Images

Sports-card inventory images remain in the existing sports-card-import
R2 bucket.

The Portal references these existing assets.

The Portal should not create duplicate copies of inventory photography
without a documented reason.

Asset storage location does not determine canonical data ownership.

---

## R2 Production Delivery

R2 public development URLs may be used during development.

They should not be considered the preferred production delivery
mechanism.

Before production release, public R2 assets used by the Portal should be
reviewed for:

- custom domain configuration
- browser access requirements
- CORS policy
- caching behavior
- appropriate public exposure

Production asset configuration should expose only the capabilities
required by the Portal.

---

## Data Boundaries

The Cloudflare application platform does not replace
sports-card-import.

The systems retain separate responsibilities.

### Scout & Steward Portal Owns

- authentication integration
- application authorization
- client workflow
- client decisions
- correction requests
- administrative review
- Portal workflow state
- Portal audit records

### sports-card-import Owns

- canonical sports-card inventory
- canonical schema
- normalization
- validation
- canonical mutation
- batch processing
- listing generation
- downstream exports

### R2 Owns

R2 stores files and objects.

Storage location does not make R2 the authoritative owner of the
business information represented by those files.

---

## Canonical Data Exchange

The Portal and sports-card-import will communicate through controlled,
documented data exchange.

The conceptual flow remains:

    Canonical Inventory
            |
            | publish
            v
    Portal-Readable Data
            |
            v
    Client Decision
            |
            v
    Administrative Review
            |
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

Cloudflare infrastructure must not introduce a path that allows the
Portal to bypass this workflow.

---

## Deployment

GitHub is the source repository for Scout & Steward Portal.

Cloudflare deployments should originate from controlled application
source rather than manual modification of deployed production files.

Where practical, deployment configuration should be represented in the
repository so that the application can be understood and reproduced
without relying solely on dashboard configuration.

Secrets and privileged credentials must not be committed to GitHub.

Environment-specific secrets should use appropriate Cloudflare secret or
environment configuration mechanisms.

---

## Alternatives Considered

### Separate Frontend Hosting and API Hosting

Examples could include hosting the frontend with one provider and the API
with another.

Rejected for the initial architecture.

The Portal does not currently demonstrate a requirement that justifies
separate application hosting environments.

Separating them would introduce additional deployment and operational
boundaries without clear value.

### External Database Provider

A separately managed relational database or database-as-a-service
provider could store Portal workflow data.

Rejected for the initial architecture.

The expected Portal workflow is modest and relational.

Cloudflare D1 satisfies the demonstrated requirement while remaining
within the existing application platform.

### Separate Authentication Provider

A dedicated authentication service could manage Portal identities.

Rejected for the initial architecture.

Cloudflare Access provides an appropriate authentication boundary without
requiring Scout & Steward to create or maintain a separate credential
system.

A dedicated identity provider may be reconsidered if future requirements
outgrow Access.

### Store Workflow Data in R2

Rejected.

Portal decisions, review states, and audit records are relational
application data.

Using object storage as the primary workflow datastore would make
querying, relationships, updates, and transactional behavior less clear
than using a relational database.

### Store Workflow Data in Canonical Inventory

Rejected.

This would violate the established separation between Portal decisions
and canonical facts.

### Host All Assets in R2

Rejected as a general rule.

Application-specific static assets can be deployed with the application
through Workers Static Assets.

R2 remains appropriate for durable shared media and inventory
photography.

Using R2 for every frontend file would create an unnecessary storage and
delivery boundary.

### Introduce Multiple Specialized Vendors

A combination of separate hosting, API, database, authentication, and
object-storage vendors could satisfy the Portal's technical
requirements.

Rejected for the initial architecture.

The additional vendors would increase operational complexity,
credentials, configuration, billing relationships, and maintenance
without a demonstrated corresponding benefit.

---

## Tradeoffs

### Pros

- keeps the initial infrastructure small
- uses an environment already operated by Meybell & Co.
- minimizes the number of external vendors
- provides managed frontend and server-side execution
- provides relational workflow storage
- provides an authentication mechanism without creating a password
  system
- integrates naturally with existing R2 assets
- reduces infrastructure maintenance
- keeps server-side authorization close to API operations
- supports incremental growth without requiring traditional server
  administration

### Cons

- creates meaningful dependence on Cloudflare
- requires familiarity with several Cloudflare products
- some application configuration may exist outside the Git repository
- migration to another platform would require replacing multiple
  Cloudflare capabilities
- Cloudflare product changes may require future implementation work
- Access authentication may become limiting if future client identity
  requirements become substantially more complex

---

## Operational Principle

Cloudflare should be treated as infrastructure, not as the architecture
itself.

The durable architecture is:

- one canonical inventory owner
- one human workflow application
- authenticated users
- server-enforced authorization
- relational Portal workflow storage
- controlled data exchange
- explicit asset ownership

Cloudflare is the selected implementation because it currently provides
a coherent and appropriately small way to satisfy those requirements.

If Cloudflare products change, the architectural responsibilities should
remain understandable independently of their current product names.

---

## Future Direction

The initial Cloudflare stack should be expanded only when a demonstrated
requirement justifies additional infrastructure.

Future decisions may separately address:

- D1 schema design
- identity and role mapping
- Portal data contracts
- canonical publish format
- approved-change import format
- production domain strategy
- R2 custom domains
- CORS policy
- deployment environments
- observability
- backup and recovery
- rate limiting
- additional client organizations

Those decisions should be documented independently when they become
architecturally significant.

If a future requirement makes Cloudflare unsuitable for one or more
responsibilities, the affected implementation may be replaced without
necessarily invalidating the broader Scout & Steward architecture.

A material change to the platform strategy should be documented in a new
ADR that supersedes this decision.
