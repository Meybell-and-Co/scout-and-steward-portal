CREATE TABLE price_recommendations (
    recommendation_id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    recommended_price_cents INTEGER NOT NULL
        CHECK (recommended_price_cents >= 0),
    confidence TEXT NOT NULL,
    evidence_window_days INTEGER NOT NULL
        CHECK (evidence_window_days IN (90, 180, 365)),
    factors_json TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_recommendations_item_created
ON price_recommendations (item_id, created_at DESC);
