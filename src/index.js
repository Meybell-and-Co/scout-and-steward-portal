export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/api/health") {
            return Response.json({
                status: "ok",
                service: "scout-and-steward-portal"
            });
        }

        if (url.pathname === "/api/db-health") {
            try {
                const result = await env.DB.prepare(
                    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
                ).all();

                return Response.json({
                    status: "ok",
                    database: "connected",
                    tables: result.results.map((row) => row.name)
                });
            } catch (error) {
                console.error("D1 health check failed:", error);

                return Response.json(
                    {
                        status: "error",
                        database: "unavailable"
                    },
                    { status: 500 }
                );
            }
        }

        if (url.pathname === "/api/publish" && request.method === "POST") {
            const authorization = request.headers.get("Authorization");
            const expectedAuthorization = `Bearer ${env.PUBLISH_TOKEN}`;

            if (!authorization || authorization !== expectedAuthorization) {
                return Response.json(
                    {
                        status: "error",
                        error: "unauthorized"
                    },
                    { status: 401 }
                );
            }

            let payload;

            try {
                payload = await request.json();
            } catch {
                return Response.json(
                    {
                        status: "error",
                        error: "invalid_json"
                    },
                    { status: 400 }
                );
            }

            const validationErrors = [];

            if (
                typeof payload.source_version !== "string" ||
                payload.source_version.trim() === ""
            ) {
                validationErrors.push(
                    "source_version must be a non-empty string"
                );
            }

            if (!Array.isArray(payload.items) || payload.items.length === 0) {
                validationErrors.push(
                    "items must be a non-empty array"
                );
            } else {
                const seenItemIds = new Set();

                payload.items.forEach((item, index) => {
                    const prefix = `items[${index}]`;

                    if (
                        typeof item !== "object" ||
                        item === null ||
                        Array.isArray(item)
                    ) {
                        validationErrors.push(
                            `${prefix} must be an object`
                        );
                        return;
                    }

                    if (
                        typeof item.item_id !== "string" ||
                        item.item_id.trim() === ""
                    ) {
                        validationErrors.push(
                            `${prefix}.item_id must be a non-empty string`
                        );
                    } else if (seenItemIds.has(item.item_id)) {
                        validationErrors.push(
                            `${prefix}.item_id duplicates another item in this publication`
                        );
                    } else {
                        seenItemIds.add(item.item_id);
                    }

                    const nullableStringFields = [
                        "player_name",
                        "team",
                        "manufacturer",
                        "set_name",
                        "card_number",
                        "classification",
                        "image_front_url",
                        "image_back_url"
                    ];

                    nullableStringFields.forEach((field) => {
                        if (
                            item[field] !== null &&
                            item[field] !== undefined &&
                            typeof item[field] !== "string"
                        ) {
                            validationErrors.push(
                                `${prefix}.${field} must be a string or null`
                            );
                        }
                    });

                    if (
                        item.year !== null &&
                        item.year !== undefined &&
                        !Number.isInteger(item.year)
                    ) {
                        validationErrors.push(
                            `${prefix}.year must be an integer or null`
                        );
                    }

                    if (
                        item.recommended_price_cents !== null &&
                        item.recommended_price_cents !== undefined &&
                        (
                            !Number.isInteger(item.recommended_price_cents) ||
                            item.recommended_price_cents < 0
                        )
                    ) {
                        validationErrors.push(
                            `${prefix}.recommended_price_cents must be a non-negative integer or null`
                        );
                    }
                });
            }

            if (validationErrors.length > 0) {
                return Response.json(
                    {
                        status: "error",
                        error: "validation_failed",
                        details: validationErrors
                    },
                    { status: 400 }
                );
            }

            return Response.json({
                status: "ok",
                authenticated: true,
                validated: true,
                item_count: payload.items.length,
                message: "Publication validated. No data written."
            });
        }
        return env.ASSETS.fetch(request);
    }
};
