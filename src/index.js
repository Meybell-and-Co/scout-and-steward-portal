import { handlePublish } from "./services/publish.js";
import {
    handleCreatePriceRecommendation
} from "./services/recommendations.js";
import {
    handleApprovePrice,
    handleMarkListedOnEbay,
    handleGetApprovedItems
} from "./services/workflow.js";
import {
    handleGetItem,
    handleGetItems
} from "./services/items.js";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);


        /* -------------------------------------------------
           Health
           ------------------------------------------------- */

        if (url.pathname === "/api/health") {
            return Response.json({
                status: "ok",
                service: "scout-and-steward-portal"
            });
        }


        /* -------------------------------------------------
           Database health
           ------------------------------------------------- */

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


        /* -------------------------------------------------
           Inventory API
           ------------------------------------------------- */
        if (
            url.pathname === "/api/workflow/approved" &&
            request.method === "GET"
        ) {
            return handleGetApprovedItems(env);
        }
        if (url.pathname === "/api/items" && request.method === "GET") {
            return handleGetItems(env);
        }

        if (
        url.pathname.startsWith("/api/items/") &&
        url.pathname.endsWith("/recommend-price") &&
        request.method === "POST"
    ) {
        const itemId = decodeURIComponent(
            url.pathname.slice(
                "/api/items/".length,
                -"/recommend-price".length
            )
        );

        if (!itemId || itemId.includes("/")) {
            return Response.json(
                {
                    status: "error",
                    error: "invalid_item_id"
                },
                { status: 400 }
            );
        }

        return handleCreatePriceRecommendation(
            request,
            env,
            itemId
        );
    }
    if (
            url.pathname.startsWith("/api/items/") &&
            url.pathname.endsWith("/approve-price") &&
            request.method === "POST"
        ) {
            const itemId = decodeURIComponent(
                url.pathname.slice(
                    "/api/items/".length,
                    -"/approve-price".length
                )
            );

            if (!itemId || itemId.includes("/")) {
                return Response.json(
                    {
                        status: "error",
                        error: "invalid_item_id"
                    },
                    { status: 400 }
                );
            }

            return handleApprovePrice(request, env, itemId);
        }

        if (
            url.pathname.startsWith("/api/items/") &&
            request.method === "GET"
        ) {
            const itemId = decodeURIComponent(
                url.pathname.slice("/api/items/".length)
            );

            if (!itemId || itemId.includes("/")) {
                return Response.json(
                    {
                        status: "error",
                        error: "invalid_item_id"
                    },
                    { status: 400 }
                );
            }

            return handleGetItem(env, itemId);
        }
        if (
            url.pathname.startsWith("/api/items/") &&
            url.pathname.endsWith("/mark-listed") &&
            request.method === "POST"
        ) {
            const itemId = decodeURIComponent(
                url.pathname.slice(
                    "/api/items/".length,
                    -"/mark-listed".length
                )
            );

            if (!itemId || itemId.includes("/")) {
                return Response.json(
                    {
                        status: "error",
                        error: "invalid_item_id"
                    },
                    { status: 400 }
                );
            }

            return handleMarkListedOnEbay(env, itemId);
        }

        /* -------------------------------------------------
           Publication API
           ------------------------------------------------- */

        if (
            url.pathname === "/api/publish" &&
            request.method === "POST"
        ) {
            return handlePublish(request, env);
        }

        /* -------------------------------------------------
           Static assets
           ------------------------------------------------- */

        return env.ASSETS.fetch(request);
    }
};


