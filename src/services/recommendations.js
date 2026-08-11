import {
    buildAndPersistPriceRecommendation
} from "./recommendation.js";

import {
    searchEbayActiveListings
} from "./ebay-market.js";

import {
    adaptEbayListingToMarketComp
} from "./market/ebay-adapter.js";

async function getCurrentItem(db, itemId) {
    return db
        .prepare(`
            SELECT
                s.item_id,
                s.player_name,
                s.team,
                s.year,
                s.manufacturer,
                s.set_name,
                s.card_number,
                s.classification
            FROM inventory_snapshots AS s
            INNER JOIN publications AS p
                ON p.publication_id = s.publication_id
            WHERE s.item_id = ?
              AND p.status = 'completed'
              AND NOT EXISTS (
                  SELECT 1
                  FROM inventory_snapshots AS newer_s
                  INNER JOIN publications AS newer_p
                      ON newer_p.publication_id =
                         newer_s.publication_id
                  WHERE newer_s.item_id = s.item_id
                    AND newer_p.status = 'completed'
                    AND (
                        newer_p.published_at > p.published_at
                        OR (
                            newer_p.published_at =
                                p.published_at
                            AND newer_s.snapshot_id >
                                s.snapshot_id
                        )
                    )
              )
            LIMIT 1
        `)
        .bind(itemId)
        .first();
}

function buildEbaySearchQuery(item) {
    return [
        item.year,
        item.manufacturer,
        item.set_name,
        item.player_name,
        item.card_number
    ]
        .filter(
            (value) =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
        )
        .map((value) => String(value).trim())
        .filter(
            (value, index, values) =>
                values.indexOf(value) === index
        )
        .join(" ");
}

async function getLiveEbayComps(env, item) {
    const query = buildEbaySearchQuery(item);

    const results = await searchEbayActiveListings(
        env,
        query,
        50
    );

    return {
        query,
        totalResults: results.total,
        comps: results.items
            .map((listing) =>
                adaptEbayListingToMarketComp(
                    item,
                    listing
                )
            )
            .filter(Boolean)
    };
}

export async function handleCreatePriceRecommendation(
    request,
    env,
    itemId
) {
    let body;

    try {
        body = await request.json();
    } catch {
        return Response.json(
            {
                status: "error",
                error: "invalid_json"
            },
            { status: 400 }
        );
    }

    let comps;
    let evidence = body.evidence ?? {};

    if (Array.isArray(body.comps)) {
        comps = body.comps;
    } else {
        const item = await getCurrentItem(
            env.DB,
            itemId
        );

        if (!item) {
            return Response.json(
                {
                    status: "error",
                    error: "item_not_found"
                },
                { status: 404 }
            );
        }

        const ebayEvidence =
            await getLiveEbayComps(env, item);

        comps = ebayEvidence.comps;

        evidence = {
            ...evidence,
            source: "ebay_browse",
            search_query: ebayEvidence.query,
            search_result_count:
                ebayEvidence.totalResults,
            accepted_comp_count: comps.length
        };
    }

    if (!Array.isArray(comps)) {
        return Response.json(
            {
                status: "error",
                error: "comps_must_be_array"
            },
            { status: 400 }
        );
    }

    if (comps.length === 0) {
        return Response.json(
            {
                status: "insufficient_evidence",
                error: "no_qualified_comps",
                evidence
            },
            { status: 422 }
        );
    }

    const recommendationId = crypto.randomUUID();

    const recommendation =
        await buildAndPersistPriceRecommendation(
            env.DB,
            {
                recommendationId,
                itemId,
                comps,
                evidence
            }
        );

    if (recommendation.recommended_price_cents === null) {
        return Response.json(
            {
                status: "insufficient_evidence",
                recommendation
            },
            { status: 422 }
        );
    }

    return Response.json(
        {
            status: "ok",
            recommendation_id: recommendationId,
            recommendation
        },
        { status: 201 }
    );
}
