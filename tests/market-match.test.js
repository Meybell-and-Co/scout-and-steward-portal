import test from "node:test";
import assert from "node:assert/strict";

import {
    determineCompTier
} from "../src/services/market/match.js";

const gene = {
    player_name: "Gene Washington",
    team: "Minnesota Vikings",
    year: 1971,
    manufacturer: "Topps",
    set_name: "1971 Topps Football Pin-Ups",
    card_number: "23",
    classification: "Game Card"
};

test("identifies an exact comp despite punctuation and seller suffixes", () => {
    assert.equal(
        determineCompTier(
            gene,
            "1971 Topps Pin Ups Football #23 Gene Washington VG *d3"
        ),
        "exact"
    );
});

test("does not call the wrong card number exact", () => {
    assert.notEqual(
        determineCompTier(
            gene,
            "1971 Topps Football Pin-Ups #24 Gene Washington"
        ),
        "exact"
    );
});

test("does not call another player exact", () => {
    assert.notEqual(
        determineCompTier(
            gene,
            "1971 Topps Football Pin-Ups #23 Joe Kapp"
        ),
        "exact"
    );
});
