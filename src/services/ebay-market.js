const EBAY_TOKEN_URL =
    "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_BROWSE_URL =
    "https://api.ebay.com/buy/browse/v1/item_summary/search";

const EBAY_PUBLIC_SCOPE =
    "https://api.ebay.com/oauth/api_scope";

async function getApplicationToken(env) {
    if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
        throw new Error("eBay credentials are not configured");
    }

    const credentials = btoa(
        `${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`
    );

    const response = await fetch(EBAY_TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: EBAY_PUBLIC_SCOPE
        })
    });

    if (!response.ok) {
        const detail = await response.text();

        console.error(
            "eBay token request failed:",
            response.status,
            detail
        );

        throw new Error(
            `eBay token request failed: ${response.status}`
        );
    }

    const payload = await response.json();

    return payload.access_token;
}

export async function searchEbayActiveListings(
    env,
    query,
    limit = 10
) {
    if (!query || !query.trim()) {
        throw new Error("search query is required");
    }

    const token = await getApplicationToken(env);

    const url = new URL(EBAY_BROWSE_URL);

    url.searchParams.set("q", query.trim());
    url.searchParams.set(
        "limit",
        String(Math.min(Math.max(limit, 1), 50))
    );

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
        }
    });

    if (!response.ok) {
        const detail = await response.text();

        console.error(
            "eBay Browse request failed:",
            response.status,
            detail
        );

        throw new Error(
            `eBay Browse request failed: ${response.status}`
        );
    }

    const payload = await response.json();



    return {
        query: query.trim(),
        total: payload.total ?? 0,

        items: (payload.itemSummaries ?? []).map((item) => ({
            item_id: item.itemId ?? null,
            legacy_item_id: item.legacyItemId ?? null,
            title: item.title ?? null,

            price: item.price
                ? {
                    value: item.price.value ?? null,
                    currency: item.price.currency ?? null
                }
                : null,

            shipping: item.shippingOptions?.[0]?.shippingCost
            ? {
                value:
                    item.shippingOptions[0].shippingCost.value ?? null,
                currency:
                    item.shippingOptions[0].shippingCost.currency ?? null
            }
            : null,

        condition: item.condition ?? null,
            buying_options: item.buyingOptions ?? [],

            item_creation_date:
                item.itemCreationDate ?? null,

            item_end_date:
                item.itemEndDate ?? null,

            item_web_url:
                item.itemWebUrl ?? null
        }))
    };
}