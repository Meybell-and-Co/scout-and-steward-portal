-- Scout & Steward Portal
-- Migration 0002: Workflow Actions
--
-- Purpose:
--   Add durable current-state workflow records for work performed
--   by CYS and MAM.
--
-- Important:
--   D1 is NOT the canonical sports-card inventory.
--   processed/primary_inventory.json in sports-card-import remains canonical.
--
-- Architecture:
--   inventory_snapshots = what the Portal presented
--   workflow_actions    = what needs doing now
--   workflow_proposals  = proposed changes awaiting a decision
--   workflow_comments   = optional human commentary
--   workflow_events     = historical business-event ledger
--   canonical_imports   = downstream canonicalization status
--
-- Actor IDs:
--   CYS = client
--   MAM = administrator
--
-- Actor identity and authority are separate:
--   actor_id identifies the person.
--   role describes the person's authority in the workflow.

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Workflow Actions
-------------------------------------------------------------------------------
--
-- An Action is one independently actionable piece of work associated
-- with a card.
--
-- One card may have multiple open Actions when their purposes differ.
--
-- Examples:
--   price_review
--   update_request
--
-- Current-state workflow belongs here rather than being reconstructed
-- by replaying workflow_events.
--
-- Metaphor:
--   workflow_actions = clipboard at the bedside
--   workflow_events  = permanent chart

CREATE TABLE workflow_actions (
    action_id TEXT PRIMARY KEY,

    item_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,

    action_type TEXT NOT NULL
        CHECK (
            action_type IN (
                'price_review',
                'update_request'
            )
        ),

    -- purpose_key distinguishes independently actionable work of the
    -- same general type.
    --
    -- Examples:
    --   price_review
    --   team
    --   player_name
    --   year
    --   set_name
    --   card_number
    --   listing
    --   description
    --   other
    --
    -- Application logic normally prevents more than one open Action
    -- for the same item_id + action_type + purpose_key.
    purpose_key TEXT NOT NULL,

    state TEXT NOT NULL
        CHECK (
            state IN (
                'waiting',
                'ready',
                'on_hold',
                'with_mark',
                'awaiting_cy',
                'completed'
            )
        ),

    -- Who currently has the potato?
    --
    -- WAITING work may remain with MAM until deliberately released.
    -- READY / AWAITING_CY normally belongs to CYS.
    -- WITH_MARK normally belongs to MAM.
    assigned_to_role TEXT
        CHECK (
            assigned_to_role IS NULL
            OR assigned_to_role IN (
                'client',
                'administrator'
            )
        ),

    assigned_to_actor_id TEXT,

    -- Who created the Action?
    created_by_actor_id TEXT NOT NULL,

    created_by_role TEXT NOT NULL
        CHECK (
            created_by_role IN (
                'client',
                'administrator',
                'system'
            )
        ),

    -- Holds are workflow state, not completion.
    hold_until TEXT,

    consecutive_hold_count INTEGER NOT NULL DEFAULT 0
        CHECK (consecutive_hold_count >= 0),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,

    FOREIGN KEY (snapshot_id)
        REFERENCES inventory_snapshots (snapshot_id)
        ON DELETE RESTRICT,

    -- State consistency.
    CHECK (
        (state = 'on_hold' AND hold_until IS NOT NULL)
        OR
        (state <> 'on_hold' AND hold_until IS NULL)
    ),

    CHECK (
        (state = 'completed' AND completed_at IS NOT NULL)
        OR
        (state <> 'completed' AND completed_at IS NULL)
    ),

    -- If an actor ID is present, a role must also be present.
    CHECK (
        assigned_to_actor_id IS NULL
        OR assigned_to_role IS NOT NULL
    )
);

CREATE INDEX idx_workflow_actions_item_id
ON workflow_actions (item_id);

CREATE INDEX idx_workflow_actions_snapshot_id
ON workflow_actions (snapshot_id);

CREATE INDEX idx_workflow_actions_state
ON workflow_actions (state);

CREATE INDEX idx_workflow_actions_assignee
ON workflow_actions (
    assigned_to_role,
    assigned_to_actor_id,
    state
);

CREATE INDEX idx_workflow_actions_item_purpose
ON workflow_actions (
    item_id,
    action_type,
    purpose_key
);

CREATE INDEX idx_workflow_actions_hold_until
ON workflow_actions (hold_until);

CREATE INDEX idx_workflow_actions_created_at
ON workflow_actions (created_at);

-------------------------------------------------------------------------------
-- Duplicate Open-Action Protection
-------------------------------------------------------------------------------
--
-- A card may have multiple independent Actions.
--
-- Normally, however, the Portal should not create two simultaneous
-- open Actions for the same card + action type + purpose.
--
-- SQLite partial indexes let completed historical Actions coexist while
-- preventing duplicate active work.

CREATE UNIQUE INDEX idx_workflow_actions_unique_open_purpose
ON workflow_actions (
    item_id,
    action_type,
    purpose_key
)
WHERE state <> 'completed';

-------------------------------------------------------------------------------
-- Workflow Proposals
-------------------------------------------------------------------------------
--
-- A Proposal preserves a suggested value separately from the trusted
-- published snapshot.
--
-- The proposal does NOT mutate inventory_snapshots and does NOT become
-- canonical merely because it is approved.
--
-- Values are JSON so this mechanism can safely represent strings,
-- numbers, nulls, or future structured values without creating a
-- dedicated column for every canonical field.

CREATE TABLE workflow_proposals (
    proposal_id TEXT PRIMARY KEY,

    action_id TEXT NOT NULL,

    field_name TEXT NOT NULL,

    old_value_json TEXT NOT NULL
        CHECK (json_valid(old_value_json)),

    proposed_value_json TEXT NOT NULL
        CHECK (json_valid(proposed_value_json)),

    proposed_by_actor_id TEXT NOT NULL,

    proposed_by_role TEXT NOT NULL
        CHECK (
            proposed_by_role IN (
                'client',
                'administrator',
                'system'
            )
        ),

    proposed_at TEXT NOT NULL,

    -- Approval stage is intentionally separate from actor identity.
    --
    -- tier_1 = initial business approval
    -- tier_2 = approval of a returned resolution/proposal
    approval_stage TEXT
        CHECK (
            approval_stage IS NULL
            OR approval_stage IN (
                'tier_1',
                'tier_2'
            )
        ),

    decision TEXT
        CHECK (
            decision IS NULL
            OR decision IN (
                'approved',
                'returned'
            )
        ),

    decided_by_actor_id TEXT,

    decided_by_role TEXT
        CHECK (
            decided_by_role IS NULL
            OR decided_by_role IN (
                'client',
                'administrator',
                'system'
            )
        ),

    decided_at TEXT,

    auto_approved INTEGER NOT NULL DEFAULT 0
        CHECK (auto_approved IN (0, 1)),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (action_id)
        REFERENCES workflow_actions (action_id)
        ON DELETE RESTRICT,

    -- Decision metadata travels together.
    CHECK (
        (
            decision IS NULL
            AND decided_by_actor_id IS NULL
            AND decided_by_role IS NULL
            AND decided_at IS NULL
        )
        OR
        (
            decision IS NOT NULL
            AND decided_by_actor_id IS NOT NULL
            AND decided_by_role IS NOT NULL
            AND decided_at IS NOT NULL
        )
    ),

    -- Auto-approval only makes sense for an approved decision.
    CHECK (
        auto_approved = 0
        OR decision = 'approved'
    )
);

CREATE INDEX idx_workflow_proposals_action_id
ON workflow_proposals (action_id);

CREATE INDEX idx_workflow_proposals_field_name
ON workflow_proposals (field_name);

CREATE INDEX idx_workflow_proposals_decision
ON workflow_proposals (decision);

CREATE INDEX idx_workflow_proposals_proposed_at
ON workflow_proposals (proposed_at);

-------------------------------------------------------------------------------
-- Workflow Comments
-------------------------------------------------------------------------------
--
-- Comments are optional commentary attached to an Action.
-- They do not determine workflow state.
--
-- Scout & Steward is not a chat application.

CREATE TABLE workflow_comments (
    comment_id TEXT PRIMARY KEY,

    action_id TEXT NOT NULL,

    actor_id TEXT NOT NULL,

    actor_role TEXT NOT NULL
        CHECK (
            actor_role IN (
                'client',
                'administrator'
            )
        ),

    body TEXT NOT NULL
        CHECK (length(trim(body)) > 0),

    created_at TEXT NOT NULL,

    FOREIGN KEY (action_id)
        REFERENCES workflow_actions (action_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_workflow_comments_action_id
ON workflow_comments (action_id);

CREATE INDEX idx_workflow_comments_created_at
ON workflow_comments (created_at);
