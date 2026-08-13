# Repository Inventory

> Generated automatically by `scripts/inventory-repo.ps1`.
> This is a reconnaissance document, not an architectural authority.

**Repository:** `scout-and-steward-portal`
**Generated:** 2026-08-08 23:49:43
**Tracked project resources:** 21

---

## Inventory Summary

### Application

| Resource | Type | Bytes |
|---|---:|---:|
| `src/index.js` | .js | 2987 |

### Architecture Decisions

| Resource | Type | Bytes |
|---|---:|---:|
| `docs/adr/ADR-001-CANONICAL-INVENTORY-OWNERSHIP.md` | .md | 3343 |
| `docs/adr/ADR-002-PORTAL-RECORDS-DECISIONS.md` | .md | 2884 |
| `docs/adr/ADR-003-TWO-STAGE-APPROVAL.md` | .md | 4099 |
| `docs/adr/ADR-004-FRICTION-PROPORTIONAL-TO-CONSEQUENCE.md` | .md | 4833 |
| `docs/adr/ADR-005-CLOUDFLARE-APPLICATION-PLATFORM.md` | .md | 14559 |
| `docs/adr/ADR-006-PORTAL-WORKFLOW-DATA-MODEL.md` | .md | 24685 |

### Backend Services

| Resource | Type | Bytes |
|---|---:|---:|
| `src/services/items.js` | .js | 3094 |
| `src/services/publish.js` | .js | 6588 |

### Database

| Resource | Type | Bytes |
|---|---:|---:|
| `migrations/0001_initial_schema.sql` | .sql | 7395 |

### Documentation

| Resource | Type | Bytes |
|---|---:|---:|
| `docs/ARCHITECTURE.md` | .md | 17515 |
| `docs/PORTAL-PLUMBING-TESTS.md` | .md | 7652 |
| `docs/VISUAL-LANGUAGE.md` | .md | 5717 |

### Frontend

| Resource | Type | Bytes |
|---|---:|---:|
| `public/app.js` | .js | 16623 |
| `public/index.html` | .html | 1385 |
| `public/styles.css` | .css | 16455 |

### Repository Root

| Resource | Type | Bytes |
|---|---:|---:|
| `.gitignore` | .gitignore | 23 |
| `package.json` | .json | 220 |
| `README.md` | .md | 968 |
| `wrangler.jsonc` | .jsonc | 616 |

### Templates

| Resource | Type | Bytes |
|---|---:|---:|
| `templates/page-components.php` | .php | 488 |

---

## Resource Reconnaissance

### `src/index.js`

**Category:** Application
**Size:** 2987 bytes
**Declared clue:** None detected.
**Observed:** References/imports: ./services/items.js, ./services/publish.js

### `docs/adr/ADR-001-CANONICAL-INVENTORY-OWNERSHIP.md`

**Category:** Architecture Decisions
**Size:** 3343 bytes
**Declared clue:** ADR-001 — Canonical Inventory Ownership
**Observed:** No structural hints automatically detected.

### `docs/adr/ADR-002-PORTAL-RECORDS-DECISIONS.md`

**Category:** Architecture Decisions
**Size:** 2884 bytes
**Declared clue:** ADR-002 — The Portal Records Decisions
**Observed:** No structural hints automatically detected.

### `docs/adr/ADR-003-TWO-STAGE-APPROVAL.md`

**Category:** Architecture Decisions
**Size:** 4099 bytes
**Declared clue:** ADR-003 — Two-Stage Approval
**Observed:** No structural hints automatically detected.

### `docs/adr/ADR-004-FRICTION-PROPORTIONAL-TO-CONSEQUENCE.md`

**Category:** Architecture Decisions
**Size:** 4833 bytes
**Declared clue:** ADR-004 — Friction Proportional to Consequence
**Observed:** No structural hints automatically detected.

### `docs/adr/ADR-005-CLOUDFLARE-APPLICATION-PLATFORM.md`

**Category:** Architecture Decisions
**Size:** 14559 bytes
**Declared clue:** ADR-005 — Cloudflare Application Platform
**Observed:** No structural hints automatically detected.

### `docs/adr/ADR-006-PORTAL-WORKFLOW-DATA-MODEL.md`

**Category:** Architecture Decisions
**Size:** 24685 bytes
**Declared clue:** ADR-006 — Portal Workflow Data Model
**Observed:** No structural hints automatically detected.

### `src/services/items.js`

**Category:** Backend Services
**Size:** 3094 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

### `src/services/publish.js`

**Category:** Backend Services
**Size:** 6588 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

### `migrations/0001_initial_schema.sql`

**Category:** Database
**Size:** 7395 bytes
**Declared clue:** None detected.
**Observed:** Tables defined: canonical_imports, inventory_snapshots, publications, workflow_events

### `docs/ARCHITECTURE.md`

**Category:** Documentation
**Size:** 17515 bytes
**Declared clue:** Scout & Steward Portal
**Observed:** No structural hints automatically detected.

### `docs/PORTAL-PLUMBING-TESTS.md`

**Category:** Documentation
**Size:** 7652 bytes
**Declared clue:** Scout & Steward Portal — Plumbing Tests
**Observed:** Routes mentioned: /api/db-health, /api/health, /api/items, /api/publish

### `docs/VISUAL-LANGUAGE.md`

**Category:** Documentation
**Size:** 5717 bytes
**Declared clue:** VISUAL LANGUAGE
**Observed:** No structural hints automatically detected.

### `public/app.js`

**Category:** Frontend
**Size:** 16623 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

### `public/index.html`

**Category:** Frontend
**Size:** 1385 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

### `public/styles.css`

**Category:** Frontend
**Size:** 16455 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

### `.gitignore`

**Category:** Repository Root
**Size:** 23 bytes
**Inspection:** Listed only; content not inspected by this script.

### `package.json`

**Category:** Repository Root
**Size:** 220 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

### `README.md`

**Category:** Repository Root
**Size:** 968 bytes
**Declared clue:** Architecture Decision Records
**Observed:** No structural hints automatically detected.

### `wrangler.jsonc`

**Category:** Repository Root
**Size:** 616 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

### `templates/page-components.php`

**Category:** Templates
**Size:** 488 bytes
**Declared clue:** None detected.
**Observed:** No structural hints automatically detected.

---

## Empty / Untracked Structural Directories

> These may represent reserved architecture rather than implemented resources.

- `src/components/` — exists, but contains no tracked resources.
- `src/views/` — exists, but contains no tracked resources.
- `src/styles/` — exists, but contains no tracked resources.
- `scripts/` — exists, but contains no tracked resources.

---

## Interpretation Key

- **Declared clue** — purpose explicitly stated by the resource.
- **Observed** — structural behavior detectable directly from its contents.
- **Likely purpose** — intentionally left for human/AI architectural review.
- **Sensitive** — listed when appropriate, but contents are not copied into this report.

This inventory describes materials present in the repository. It does not determine whether those materials are correct, current, necessary, or sufficient.
