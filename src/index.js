import { getEbayOffersBySku } from "./services/ebay-seller.js";
import { handlePublish } from "./services/publish.js";
import {
    searchEbayActiveListings,
    getEbayItemByLegacyId
} from "./services/ebay-market.js";
import {
    handleEbayAccountDeletion
} from "./services/ebay-compliance.js";
import {
    handleCreatePriceRecommendation
} from "./services/recommendations.js";
import {
handleApprovePrice,
handleEnterManualPrice,
handleMarkListedOnEbay,
handleGetApprovedItems,
handleLinkEbayListing
} from "./services/workflow.js";
import {
    handleGetItem,
    handleGetItems
} from "./services/items.js";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
/* -------------------------------------------------
   Link existing eBay listing
   ------------------------------------------------- */

if (
    url.pathname.startsWith("/api/items/") &&
    url.pathname.endsWith("/link-ebay") &&
    request.method === "POST"
) {
    const itemId = decodeURIComponent(
        url.pathname.slice(
            "/api/items/".length,
            -"/link-ebay".length
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

    const legacyItemId =
        body?.legacy_item_id?.trim();

    if (!legacyItemId) {
        return Response.json(
            {
                status: "error",
                error: "missing_legacy_item_id"
            },
            { status: 400 }
        );
    }

    const portalResponse =
        await handleGetItem(env, itemId);

    if (!portalResponse.ok) {
        return portalResponse;
    }

    const portalPayload =
        await portalResponse.json();

    const portalItem = portalPayload.item;

    let ebayItem;

    try {
        ebayItem =
            await getEbayItemByLegacyId(
                env,
                legacyItemId
            );
    } catch (error) {
        console.error(
            "eBay link verification lookup failed:",
            error
        );

        return Response.json(
            {
                status: "error",
                error: "ebay_item_lookup_failed"
            },
            { status: 502 }
        );
    }

    const ebayTitle =
        (ebayItem.title ?? "").toLowerCase();

    const playerMatches =
        portalItem.player_name &&
        ebayTitle.includes(
            portalItem.player_name.toLowerCase()
        );

    const yearMatches =
        portalItem.year &&
        ebayTitle.includes(
            String(portalItem.year)
        );

    const cardMatches =
        portalItem.card_number &&
        (
            ebayTitle.includes(
                `#${portalItem.card_number}`.toLowerCase()
            ) ||
            ebayTitle.includes(
                `# ${portalItem.card_number}`.toLowerCase()
            )
        );

    if (
        !playerMatches ||
        !yearMatches ||
        !cardMatches
    ) {
        return Response.json(
            {
                status: "error",
                error: "ebay_identity_mismatch",
                verification: {
                    player_matches: Boolean(playerMatches),
                    year_matches: Boolean(yearMatches),
                    card_matches: Boolean(cardMatches)
                }
            },
            { status: 409 }
        );
    }

    return handleLinkEbayListing(
        env,
        itemId,
        ebayItem
    );
}

/* -------------------------------------------------
   eBay exact listing lookup
   ------------------------------------------------- */

        if (
            url.pathname === "/api/ebay/item" &&
            request.method === "GET"
        ) {
            const legacyItemId =
                url.searchParams.get("legacy_item_id");

            if (!legacyItemId) {
                return Response.json(
                    {
                        status: "error",
                        error: "missing_legacy_item_id"
                    },
                    { status: 400 }
                );
            }

            try {
                const item = await getEbayItemByLegacyId(
                    env,
                    legacyItemId
                );

                return Response.json({
                    status: "ok",
                    item
                });
            } catch (error) {
                console.error(
                    "eBay exact listing lookup failed:",
                    error
                );

                return Response.json(
                    {
                        status: "error",
                        error: "ebay_item_lookup_failed"
                    },
                    { status: 502 }
                );
            }
        }

        /* -------------------------------------------------
           eBay seller offer lookup
           ------------------------------------------------- */

        if (
            url.pathname === "/api/ebay/seller/offers" &&
            request.method === "GET"
        ) {
            const sku = url.searchParams.get("sku");

            if (!sku) {
                return Response.json(
                    {
                        status: "error",
                        error: "missing_sku"
                    },
                    { status: 400 }
                );
            }

            try {
                const results =
                    await getEbayOffersBySku(env, sku);

                return Response.json({
                    status: "ok",
                    ...results
                });
            } catch (error) {
                console.error(
                    "eBay seller offer lookup failed:",
                    error
                );

                return Response.json(
                    {
                        status: "error",
                        error: "ebay_seller_lookup_failed"
                    },
                    { status: 502 }
                );
            }
        }

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
            url.pathname.endsWith("/enter-manual-price") &&
            request.method === "POST"
        ) {
            const itemId = decodeURIComponent(
                url.pathname.slice(
                    "/api/items/".length,
                    -"/enter-manual-price".length
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

            return handleEnterManualPrice(
                request,
                env,
                itemId
            );
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


