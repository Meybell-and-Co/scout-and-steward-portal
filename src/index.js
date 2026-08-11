import { handlePublish } from "./services/publish.js";
import {
    searchEbayActiveListings
} from "./services/ebay-market.js";
import {
    handleEbayAccountDeletion
} from "./services/ebay-compliance.js";
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
           eBay market probe
           ------------------------------------------------- */

        if (
            url.pathname === "/api/ebay/search" &&
            request.method === "GET"
        ) {
            const query = url.searchParams.get("q");

            if (!query) {
                return Response.json(
                    {
                        status: "error",
                        error: "missing_query"
                    },
                    { status: 400 }
                );
            }

            try {
                const results =
                    await searchEbayActiveListings(
                        env,
                        query,
                        10
                    );

                return Response.json({
                    status: "ok",
                    ...results
                });
            } catch (error) {
                console.error(
                    "eBay market search failed:",
                    error
                );

                return Response.json(
                    {
                        status: "error",
                        error: "ebay_search_failed"
                    },
                    { status: 502 }
                );
            }
        }
        /* -------------------------------------------------
           eBay compliance
           ------------------------------------------------- */

        if (
            url.pathname === "/api/ebay/marketplace-account-deletion" &&
            (request.method === "GET" || request.method === "POST")
        ) {
            return handleEbayAccountDeletion(request, env);
        }


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
       eBay OAuth callback
       ------------------------------------------------- */

    if (
        url.pathname === "/api/ebay/oauth/callback" &&
        request.method === "GET"
    ) {
        const authorizationCode = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
            return Response.json(
                {
                    status: "error",
                    error: "ebay_authorization_declined"
                },
                { status: 400 }
            );
        }

        if (!authorizationCode) {
            return Response.json({
                status: "ok",
                callback: "ready",
                authorization_code_received: false
            });
        }

        return Response.json({
            status: "ok",
            callback: "ready",
            authorization_code_received: true
        });
    }
        /* -------------------------------------------------
           Static assets
           ------------------------------------------------- */

        return env.ASSETS.fetch(request);
    }
};


