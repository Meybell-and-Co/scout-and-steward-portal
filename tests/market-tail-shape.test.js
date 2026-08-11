import test from "node:test";
import assert from "node:assert/strict";

import {
    classifyTailShape
} from "../src/services/market/tail-shape.js";

test("classifies tail shape from the SD-to-MAD ratio", () => {
    const cases = [
        { ratio: 1, expected: "normal" },
        { ratio: 1.8, expected: "normal" },
        { ratio: 2, expected: "elevated" },
        { ratio: 3.5, expected: "elevated" },
        { ratio: 4, expected: "heavy" },
        { ratio: 7.01, expected: "heavy" },
    ];

    const results = cases.map(({ ratio, expected }) => {
        const tailShape = classifyTailShape(ratio);

        return {
            ratio,
            tailShape,
            expected,
        };
    });

    console.table(results);

    for (const result of results) {
        assert.equal(result.tailShape, result.expected);
    }
});
