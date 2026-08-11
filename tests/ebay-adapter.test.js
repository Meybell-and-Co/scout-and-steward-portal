import test from "node:test";
import assert from "node:assert/strict";

import {
    adaptEbayListingToMarketComp
} from "../src/services/market/ebay-adapter.js";

const gene = {
    player_name: "Gene Washington",
    year: 1971,
    manufacturer: "Topps",
    set_name: "1971 Topps Football Pin-Ups",
    card_number: "23",
    classification: "Game Card"
};

test("adapts an exact active eBay listing to market-comp input", () => {
    const listing = {
        item_id: "v1|336731941933|0",
        title:
            "1971 Topps Football Pin-Ups #23 Gene Washington Minnesota Vikings",
        price: {
            value: "14.00",
            currency: "USD"
        },
        shipping: {
            value: "0.00",
            currency: "USD"
        },
        condition: "Ungraded",
        item_creation_date: "2026-08-07T20:15:22Z"
    };

    assert.deepEqual(
        adaptEbayListingToMarketComp(gene, listing),
        {
            compId: "v1|336731941933|0",
            source: "ebay",
            title:
                "1971 Topps Football Pin-Ups #23 Gene Washington Minnesota Vikings",
            priceCents: 1400,
            shippingCents: 0,
            marketStatus: "active",
            condition: "Ungraded",
            itemOriginDate: "2026-08-07T20:15:22Z",
            compTier: "exact"
        }
    );
});

test("returns null when the listing cannot earn a comp tier", () => {
    const listing = {
        item_id: "v1|wrong|0",
        title: "1971 Topps Football Pin-Ups #24 Joe Kapp",
        price: {
            value: "5.00",
            currency: "USD"
        },
        shipping: {
            value: "4.99",
            currency: "USD"
        }
    };

    assert.equal(
        adaptEbayListingToMarketComp(gene, listing),
        null
    );
});

test("converts eBay decimal prices and shipping to integer cents", () => {
    const listing = {
        item_id: "v1|236949552757|0",
        title:
            "1971 Topps Football Pin-Ups Gene Washington #23 0e7",
        price: {
            value: "15.43",
            currency: "USD"
        },
        shipping: {
            value: "4.99",
            currency: "USD"
        }
    };

    const comp =
        adaptEbayListingToMarketComp(gene, listing);

    assert.equal(comp.priceCents, 1543);
    assert.equal(comp.shippingCents, 499);
});

test("rejects a listing when shipping cost is unknown", () => {
    const listing = {
        item_id: "v1|unknown-shipping|0",
        title:
            "1971 Topps Football Pin-Ups #23 Gene Washington",
        price: {
            value: "8.00",
            currency: "USD"
        },
        shipping: null
    };

    assert.equal(
        adaptEbayListingToMarketComp(gene, listing),
        null
    );
});
