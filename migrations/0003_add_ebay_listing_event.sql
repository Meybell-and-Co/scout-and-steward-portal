PRAGMA foreign_keys = OFF;
CREATE TABLE workflow_events_new (
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
                'returned_to_client',
                'listed_on_ebay'
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
        REFERENCES workflow_events_new (event_id)
        ON DELETE RESTRICT
);

INSERT INTO workflow_events_new (
    event_id,
    snapshot_id,
    item_id,
    actor_id,
    actor_role,
    event_type,
    payload_json,
    supersedes_event_id,
    created_at
)
SELECT
    event_id,
    snapshot_id,
    item_id,
    actor_id,
    actor_role,
    event_type,
    payload_json,
    supersedes_event_id,
    created_at
FROM workflow_events;

DROP TABLE workflow_events;

ALTER TABLE workflow_events_new
RENAME TO workflow_events;

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
PRAGMA foreign_keys = ON;

