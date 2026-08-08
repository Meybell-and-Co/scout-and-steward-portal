-- Scout & Steward Portal
-- Migration: 0001_initial_schema.sql
--
-- Purpose:
--   Establish the initial D1 schema for published canonical snapshots,
--   human workflow decisions, and canonical import results.
--
-- Architectural authority:
--   ADR-005 — Cloudflare Platform Architecture
--   ADR-006 — Portal Workflow Data Model
--
-- Important:
--   D1 is NOT the canonical sports-card inventory.
--   processed/primary_inventory.json in sports-card-import remains canonical.


PRAGMA foreign_keys = ON;


-- ---------------------------------------------------------------------
-- Publications
-- ---------------------------------------------------------------------
--
-- One row represents one controlled publication from canonical inventory
-- into the Portal.
--
-- source_version identifies the canonical state used for the publication.
-- The exact versioning/hash mechanism will be established by the publisher.

CREATE TABLE publications (
    publication_id TEXT PRIMARY KEY,
    source_version TEXT NOT NULL,
    status TEXT NOT NULL
        CHECK (status IN ('started', 'completed', 'failed')),
    item_count INTEGER NOT NULL DEFAULT 0
        CHECK (item_count >= 0),
    published_at TEXT NOT NULL,
    completed_at TEXT,
    error_message TEXT
);

CREATE INDEX idx_publications_published_at
    ON publications (published_at);

CREATE INDEX idx_publications_status
    ON publications (status);


-- ---------------------------------------------------------------------
-- Inventory Snapshots
-- ---------------------------------------------------------------------
--
-- One row represents one canonical inventory item as it appeared during
-- one publication.
--
-- Snapshots are historical representations of Canon. They are not
-- independently authoritative inventory records.
--
-- Old snapshots may be retained so workflow decisions can always be
-- associated with the exact information presented to the user.

CREATE TABLE inventory_snapshots (
    snapshot_id TEXT PRIMARY KEY,

    publication_id TEXT NOT NULL,
    item_id TEXT NOT NULL,

    player_name TEXT,
    team TEXT,
    year INTEGER,
    manufacturer TEXT,
    set_name TEXT,
    card_number TEXT,
    classification TEXT,

    image_front_url TEXT,
    image_back_url TEXT,

    recommended_price_cents INTEGER
        CHECK (
            recommended_price_cents IS NULL
            OR recommended_price_cents >= 0
        ),

    created_at TEXT NOT NULL,

    FOREIGN KEY (publication_id)
        REFERENCES publications (publication_id)
        ON DELETE RESTRICT,

    UNIQUE (publication_id, item_id)
);

CREATE INDEX idx_inventory_snapshots_item_id
    ON inventory_snapshots (item_id);

CREATE INDEX idx_inventory_snapshots_publication_id
    ON inventory_snapshots (publication_id);

CREATE INDEX idx_inventory_snapshots_item_publication
    ON inventory_snapshots (item_id, publication_id);


-- ---------------------------------------------------------------------
-- Workflow Events
-- ---------------------------------------------------------------------
--
-- Durable human workflow actions are recorded here.
--
-- Submitted events should be treated as immutable historical records.
-- New decisions create new events rather than overwriting previous ones.
--
-- payload_json contains event-specific structured information.
--
-- Examples:
--
-- price_approved
-- {
--   "recommended_price_cents": 1400
-- }
--
-- price_overridden
-- {
--   "recommended_price_cents": 1400,
--   "submitted_price_cents": 2200
-- }
--
-- update_suggested
-- {
--   "changes": [
--     {
--       "field": "team",
--       "published_value": "New York Jets",
--       "suggested_value": "New England Patriots"
--     },
--     {
--       "field": "position",
--       "published_value": "FB",
--       "suggested_value": "RB"
--     }
--   ],
--   "notes": "Optional client commentary."
-- }
--
-- A client may also identify a concept that the canonical schema does
-- not currently represent:
--
-- {
--   "changes": [
--     {
--       "field": "__new_field__",
--       "proposed_field_name": "uniform_number",
--       "suggested_value": "32"
--     }
--   ],
--   "notes": "Why this information should be represented."
-- }
--
-- __new_field__ represents a schema suggestion. It MUST NOT be treated
-- as an automatically importable canonical field mutation.

CREATE TABLE workflow_events (
    event_id TEXT PRIMARY KEY,

    snapshot_id TEXT NOT NULL,
    item_id TEXT NOT NULL,

    actor_id TEXT NOT NULL,

    actor_role TEXT NOT NULL
        CHECK (
            actor_role IN (
                'client',
                'administrator'
            )
        ),

    event_type TEXT NOT NULL
        CHECK (
            event_type IN (
                'price_approved',
                'price_overridden',
                'update_suggested',
                'admin_confirmed',
                'returned_to_client'
            )
        ),

    payload_json TEXT NOT NULL
        CHECK (json_valid(payload_json)),

    supersedes_event_id TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (snapshot_id)
        REFERENCES inventory_snapshots (snapshot_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (supersedes_event_id)
        REFERENCES workflow_events (event_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_workflow_events_snapshot_id
    ON workflow_events (snapshot_id);

CREATE INDEX idx_workflow_events_item_id
    ON workflow_events (item_id);

CREATE INDEX idx_workflow_events_actor_id
    ON workflow_events (actor_id);

CREATE INDEX idx_workflow_events_event_type
    ON workflow_events (event_type);

CREATE INDEX idx_workflow_events_created_at
    ON workflow_events (created_at);


-- ---------------------------------------------------------------------
-- Canonical Imports
-- ---------------------------------------------------------------------
--
-- One row represents an attempt to return an approved Portal change to
-- sports-card-import for controlled validation and canonical mutation.
--
-- Administrative approval does not make a change canonical.
--
-- Only successful processing by sports-card-import may produce the
-- canonicalized state.

CREATE TABLE canonical_imports (
    import_id TEXT PRIMARY KEY,

    source_event_id TEXT NOT NULL,
    item_id TEXT NOT NULL,

    status TEXT NOT NULL
        CHECK (
            status IN (
                'pending',
                'processing',
                'failed',
                'canonicalized'
            )
        ),

    attempted_at TEXT,
    completed_at TEXT,

    error_code TEXT,
    error_message TEXT,

    canonical_version TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (source_event_id)
        REFERENCES workflow_events (event_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_canonical_imports_source_event_id
    ON canonical_imports (source_event_id);

CREATE INDEX idx_canonical_imports_item_id
    ON canonical_imports (item_id);

CREATE INDEX idx_canonical_imports_status
    ON canonical_imports (status);

CREATE INDEX idx_canonical_imports_created_at
    ON canonical_imports (created_at);
