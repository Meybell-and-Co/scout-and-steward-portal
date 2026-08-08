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
