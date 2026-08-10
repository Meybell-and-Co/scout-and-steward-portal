export async function handleApprovePrice(request, env, itemId) {
    try {
        /* -------------------------------------------------
           Find the current published snapshot
           ------------------------------------------------- */

        const snapshot = await env.DB.prepare(`
            SELECT
                s.snapshot_id,
                s.item_id,
                s.recommended_price_cents
            FROM inventory_snapshots AS s
            INNER JOIN publications AS p
                ON p.publication_id = s.publication_id
            WHERE s.item_id = ?
              AND p.status = 'completed'
            ORDER BY
                p.published_at DESC,
                s.snapshot_id DESC
            LIMIT 1
        `)
            .bind(itemId)
            .first();

        if (!snapshot) {
            return Response.json(
                {
                    status: "error",
                    error: "item_not_found"
                },
                { status: 404 }
            );
        }

        if (snapshot.recommended_price_cents === null) {
            return Response.json(
                {
                    status: "error",
                    error: "price_not_available"
                },
                { status: 409 }
            );
        }

        /* -------------------------------------------------
           Record the approval
           ------------------------------------------------- */
        const existingApproval = await env.DB.prepare(`
    SELECT
        event_id,
        created_at
    FROM workflow_events
    WHERE snapshot_id = ?
      AND item_id = ?
      AND event_type = 'price_approved'
    ORDER BY created_at DESC
    LIMIT 1
`)
            .bind(snapshot.snapshot_id, snapshot.item_id)
            .first();

        if (existingApproval) {
            return Response.json({
                status: "ok",
                already_approved: true,
                event: {
                    event_id: existingApproval.event_id,
                    snapshot_id: snapshot.snapshot_id,
                    item_id: snapshot.item_id,
                    event_type: "price_approved",
                    recommended_price_cents:
                        snapshot.recommended_price_cents,
                    created_at: existingApproval.created_at
                }
            });
        }
        const eventId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const payload = JSON.stringify({
            recommended_price_cents: snapshot.recommended_price_cents
        });

        await env.DB.prepare(`
            INSERT INTO workflow_events (
                event_id,
                snapshot_id,
                item_id,
                actor_id,
                actor_role,
                event_type,
                payload_json,
                supersedes_event_id,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
        `)
            .bind(
                eventId,
                snapshot.snapshot_id,
                snapshot.item_id,
                "cy",
                "client",
                "price_approved",
                payload,
                createdAt
            )
            .run();

        return Response.json(
            {
                status: "ok",
                event: {
                    event_id: eventId,
                    snapshot_id: snapshot.snapshot_id,
                    item_id: snapshot.item_id,
                    event_type: "price_approved",
                    recommended_price_cents:
                        snapshot.recommended_price_cents,
                    created_at: createdAt
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Price approval failed:", error);

        return Response.json(
            {
                status: "error",
                error: "price_approval_failed"
            },
            { status: 500 }
        );
    }
}
