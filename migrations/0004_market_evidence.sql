-- Market Evidence
--
-- A market observation records what the market looked like for a specific
-- inventory snapshot at a specific point in time.
--
-- Individual comparable listings/sales are stored as child evidence records.
-- Market evidence is subordinate to the canonical sports-card inventory.

PRAGMA foreign_keys = ON;

CREATE TABLE market_observations (
    observation_id TEXT PRIMARY KEY,

    snapshot_id TEXT NOT NULL,
    item_id TEXT NOT NULL,

    observed_at TEXT NOT NULL,

    UNIQUE (snapshot_id),

    FOREIGN KEY (snapshot_id)
        REFERENCES inventory_snapshots (snapshot_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_market_observations_snapshot_id
ON market_observations (snapshot_id);

CREATE INDEX idx_market_observations_item_id
ON market_observations (item_id);

CREATE INDEX idx_market_observations_observed_at
ON market_observations (observed_at);

CREATE INDEX idx_market_observations_item_observed
ON market_observations (item_id, observed_at);


CREATE TABLE market_comps (
    comp_record_id TEXT PRIMARY KEY,

    observation_id TEXT NOT NULL,
    comp_id TEXT NOT NULL,

    source TEXT NOT NULL,
    title TEXT NOT NULL,

    price_cents INTEGER NOT NULL
        CHECK (price_cents >= 0),

    shipping_cents INTEGER NOT NULL
        CHECK (shipping_cents >= 0),

    total_buyer_cost_cents INTEGER NOT NULL
        CHECK (
            total_buyer_cost_cents >= 0
            AND total_buyer_cost_cents = price_cents + shipping_cents
        ),

    market_status TEXT NOT NULL
        CHECK (
            market_status IN (
                'sold',
                'active'
            )
        ),

    condition TEXT,

    item_origin_date TEXT,

    comp_tier TEXT NOT NULL,

    evidence_score INTEGER NOT NULL,

    evidence_reasons_json TEXT NOT NULL
        CHECK (json_valid(evidence_reasons_json)),

    FOREIGN KEY (observation_id)
        REFERENCES market_observations (observation_id)
        ON DELETE RESTRICT,

    UNIQUE (observation_id, comp_id)
);

CREATE INDEX idx_market_comps_observation_id
ON market_comps (observation_id);

CREATE INDEX idx_market_comps_comp_id
ON market_comps (comp_id);

CREATE INDEX idx_market_comps_market_status
ON market_comps (market_status);

CREATE INDEX idx_market_comps_comp_tier
ON market_comps (comp_tier);
