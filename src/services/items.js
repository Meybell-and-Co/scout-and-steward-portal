export async function handleGetItems(env) {
    try {
        const result = await env.DB.prepare(
            `SELECT
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
                s.recommended_price_cents,
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
