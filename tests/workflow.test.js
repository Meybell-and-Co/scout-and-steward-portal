import test from "node:test";
import assert from "node:assert/strict";

import {
    handleApprovePrice
} from "../src/services/workflow.js";

test("approves the latest price recommendation instead of the snapshot price", async () => {
    let insertedBindings = null;
    let queryNumber = 0;

    const db = {
        prepare() {
            queryNumber += 1;
            const currentQuery = queryNumber;

            return {
                bind(...bindings) {
                    return {
                        async first() {
                            if (currentQuery === 1) {
                                return {
                                    snapshot_id: "SNAP_0001",
                                    item_id: "FBPU_0001",
                                    recommended_price_cents: 1234
                                };
                            }

                            if (currentQuery === 2) {
                                return {
                                    recommendation_id: "REC_0001",
                                    item_id: "FBPU_0001",
                                    recommended_price_cents: 2925,
                                    confidence: "strong"
                                };
                            }

                            if (currentQuery === 3) {
                                return null;
                            }

                            return null;
                        },

                        async run() {
                            insertedBindings = bindings;
                        }
                    };
                }
            };
        }
    };

    const response = await handleApprovePrice(
        new Request("http://localhost", {
            method: "POST"
        }),
        { DB: db },
        "FBPU_0001"
    );

    assert.equal(response.status, 201);

    const payload = await response.json();

    assert.equal(
        payload.event.recommendation_id,
        "REC_0001"
    );

    assert.equal(
        payload.event.recommended_price_cents,
        2925
    );

    const storedPayload = JSON.parse(
        insertedBindings[6]
    );

    assert.equal(
        storedPayload.recommendation_id,
        "REC_0001"
    );

    assert.equal(
        storedPayload.recommended_price_cents,
        2925
    );
});

test("requires a new approval when the latest recommendation has not been approved", async () => {
    let insertedBindings = null;
    let queryNumber = 0;

    const db = {
        prepare() {
            queryNumber += 1;
            const currentQuery = queryNumber;

            return {
                bind(...bindings) {
                    return {
                        async first() {
                            if (currentQuery === 1) {
                                return {
                                    snapshot_id: "SNAP_0001",
                                    item_id: "FBPU_0001",
                                    recommended_price_cents: 1234
                                };
                            }

                            if (currentQuery === 2) {
                                return {
                                    recommendation_id: "REC_NEW",
                                    item_id: "FBPU_0001",
                                    recommended_price_cents: 2925,
                                    confidence: "strong"
                                };
                            }

                            // The old recommendation may have an approval,
                            // but REC_NEW does not.
                            if (currentQuery === 3) {
                                return null;
                            }

                            return null;
                        },

                        async run() {
                            insertedBindings = bindings;
                        }
                    };
                }
            };
        }
    };

    const response = await handleApprovePrice(
        new Request("http://localhost", {
            method: "POST"
        }),
        { DB: db },
        "FBPU_0001"
    );

    assert.equal(response.status, 201);

    const payload = await response.json();

    assert.equal(payload.already_approved, undefined);
    assert.equal(payload.event.recommendation_id, "REC_NEW");
    assert.equal(payload.event.recommended_price_cents, 2925);

    const storedPayload = JSON.parse(insertedBindings[6]);

    assert.equal(storedPayload.recommendation_id, "REC_NEW");
    assert.equal(storedPayload.recommended_price_cents, 2925);
});
