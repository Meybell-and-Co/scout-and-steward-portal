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
export async function handleGetApprovedItems(env) {
    try {
        const result = await env.DB.prepare(`
            SELECT
                s.item_id,
                s.snapshot_id,
                s.recommended_price_cents AS approved_price_cents,
                e.event_id,
                e.actor_id,
                e.actor_role,
                e.event_type,
                e.created_at AS approved_at
            FROM inventory_snapshots AS s
            INNER JOIN publications AS p
                ON p.publication_id = s.publication_id
            INNER JOIN workflow_events AS e
                ON e.snapshot_id = s.snapshot_id
                AND e.item_id = s.item_id
                AND e.event_type = 'price_approved'
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
              AND e.created_at = (
                  SELECT MAX(newer_e.created_at)
                  FROM workflow_events AS newer_e
                  WHERE newer_e.snapshot_id = s.snapshot_id
                    AND newer_e.item_id = s.item_id
                    AND newer_e.event_type = 'price_approved'
              )
            ORDER BY e.created_at ASC
        `).all();

        return Response.json({
            status: "ok",
            item_count: result.results.length,
            items: result.results
        });
    } catch (error) {
        console.error("Approved item read failed:", error);

        return Response.json(
            {
                status: "error",
                error: "approved_items_unavailable"
            },
            { status: 500 }
        );
    }
}
export async function handleMarkListedOnEbay(env, itemId) {
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

        /* -------------------------------------------------
           Require price approval first
           ------------------------------------------------- */

        const approval = await env.DB.prepare(`
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

        if (!approval) {
            return Response.json(
                {
                    status: "error",
                    error: "price_not_approved"
                },
                { status: 409 }
            );
        }

        /* -------------------------------------------------
           Don't record the same listing twice
           ------------------------------------------------- */

        const existingListing = await env.DB.prepare(`
            SELECT
                event_id,
                created_at
            FROM workflow_events
            WHERE snapshot_id = ?
              AND item_id = ?
              AND event_type = 'listed_on_ebay'
            ORDER BY created_at DESC
            LIMIT 1
        `)
            .bind(snapshot.snapshot_id, snapshot.item_id)
            .first();

        if (existingListing) {
            return Response.json({
                status: "ok",
                already_listed: true,
                event: {
                    event_id: existingListing.event_id,
                    snapshot_id: snapshot.snapshot_id,
                    item_id: snapshot.item_id,
                    event_type: "listed_on_ebay",
                    created_at: existingListing.created_at
                }
            });
        }

        const eventId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const payload = JSON.stringify({
            approved_price_cents: snapshot.recommended_price_cents
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
                "listed_on_ebay",
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
                    event_type: "listed_on_ebay",
                    created_at: createdAt
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Mark listed on eBay failed:", error);

        return Response.json(
            {
                status: "error",
                error: "mark_listed_failed"
            },
            { status: 500 }
        );
    }
}
