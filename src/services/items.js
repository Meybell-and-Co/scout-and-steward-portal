/* ---------------------------------------------------------
   Shared inventory query
   --------------------------------------------------------- */

const CURRENT_INVENTORY_SELECT = `
    SELECT
        s.snapshot_id,
        s.item_id,
        s.player_name,
        s.team,
        s.year,
        s.manufacturer,
        s.set_name,
        s.card_number,
        s.classification,
        s.image_front_url,
        s.image_back_url,
        COALESCE(
            (
                SELECT pr.recommended_price_cents
                FROM price_recommendations AS pr
                WHERE pr.item_id = s.item_id
                ORDER BY pr.created_at DESC, pr.recommendation_id DESC
                LIMIT 1
            ),
            s.recommended_price_cents
        ) AS recommended_price_cents,
        (
            SELECT pr.confidence
            FROM price_recommendations AS pr
            WHERE pr.item_id = s.item_id
            ORDER BY pr.created_at DESC, pr.recommendation_id DESC
            LIMIT 1
        ) AS confidence,
        s.publication_id,
        p.source_version,
        p.published_at
    FROM inventory_snapshots AS s
    INNER JOIN publications AS p
        ON p.publication_id = s.publication_id
    WHERE p.status = 'completed'
      AND NOT EXISTS (
          SELECT 1
          FROM inventory_snapshots AS newer_s
          INNER JOIN publications AS newer_p
              ON newer_p.publication_id = newer_s.publication_id
          WHERE newer_s.item_id = s.item_id
            AND newer_p.status = 'completed'
            AND (
                newer_p.published_at > p.published_at
                OR (
                    newer_p.published_at = p.published_at
                    AND newer_s.snapshot_id > s.snapshot_id
                )
            )
      )
`;


/* ---------------------------------------------------------
   Get current inventory
   --------------------------------------------------------- */

export async function handleGetItems(env) {
    try {
        const result = await env.DB.prepare(
            `${CURRENT_INVENTORY_SELECT}
            ORDER BY s.item_id ASC`
        ).all();

        return Response.json({
            status: "ok",
            item_count: result.results.length,
            items: result.results
        });
    } catch (error) {
        console.error("Inventory read failed:", error);

        return Response.json(
            {
                status: "error",
                error: "inventory_unavailable"
            },
            { status: 500 }
        );
    }
}


/* ---------------------------------------------------------
   Get one current inventory item
   --------------------------------------------------------- */

export async function handleGetItem(env, itemId) {
    try {
        const item = await env.DB.prepare(
            `${CURRENT_INVENTORY_SELECT}
            AND s.item_id = ?
            LIMIT 1`
        )
            .bind(itemId)
            .first();

        if (!item) {
            return Response.json(
                {
                    status: "error",
                    error: "item_not_found"
                },
                { status: 404 }
            );
        }

        const priceRecommendation = await env.DB.prepare(
        `SELECT
            recommendation_id,
            item_id,
            recommended_price_cents,
            confidence,
            evidence_window_days,
            factors_json,
            evidence_json,
            created_at
         FROM price_recommendations
         WHERE item_id = ?
         ORDER BY created_at DESC, recommendation_id DESC
         LIMIT 1`
    )
        .bind(item.item_id)
        .first();

        const priceApproval = priceRecommendation
            ? await env.DB.prepare(
                `SELECT
                    event_id,
                    actor_id,
                    actor_role,
                    payload_json,
                    created_at
                 FROM workflow_events
                 WHERE snapshot_id = ?
                   AND item_id = ?
                   AND event_type = 'price_approved'
                   AND json_extract(payload_json, '$.recommendation_id') = ?
                 ORDER BY created_at DESC, event_id DESC
                 LIMIT 1`
            )
                .bind(
                    item.snapshot_id,
                    item.item_id,
                    priceRecommendation.recommendation_id
                )
                .first()
            : null;

        const ebayListing = priceRecommendation
            ? await env.DB.prepare(`
                SELECT
                    event_id,
                    snapshot_id,
                    item_id,
                    actor_id,
                    actor_role,
                    event_type,
                    payload_json,
                    created_at
                FROM workflow_events
                WHERE snapshot_id = ?
                  AND item_id = ?
                  AND event_type = 'listed_on_ebay'
                  AND json_extract(payload_json, '$.recommendation_id') = ?
                ORDER BY created_at DESC, event_id DESC
                LIMIT 1
            `)
                .bind(
                    item.snapshot_id,
                    item.item_id,
                    priceRecommendation.recommendation_id
                )
                .first()
            : null;

        if (priceRecommendation?.confidence) {
            try {
                priceRecommendation.confidence =
                    JSON.parse(priceRecommendation.confidence);
            } catch {
                // Legacy recommendations stored confidence as plain text.
                // Leave those values intact until refreshed.
            }
        }
        return Response.json({
            status: "ok",
            item: {
                ...item,
            price_recommendation: priceRecommendation ?? null,
                price_approval: priceApproval ?? null,
                ebay_listing: ebayListing ?? null
            }
        });

    } catch (error) {
        console.error("Inventory item read failed:", error);

        return Response.json(
            {
                status: "error",
                error: "inventory_unavailable"
            },
            { status: 500 }
        );
    }
}
